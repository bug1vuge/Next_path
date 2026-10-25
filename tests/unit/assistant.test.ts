import {describe, expect, it} from "vitest";
import {parseBlocks} from "@/components/assistant/chat-text";
import {ASSISTANT_LIMITS, retrievalQuery, validateAssistantRequest} from "@/lib/assistant/input";
import {
  buildReference,
  catalogueIndex,
  EMPTY_PROFILE,
  findMatches,
  pageContext,
  questionStems,
  type KnowledgeBase
} from "@/lib/assistant/knowledge";
import {buildSystemPrompt} from "@/lib/assistant/prompt";
import {SITE_SECTIONS} from "@/lib/assistant/site-guide";

const t = (ru: string, kk = "", en = "") => ({ru, kk, en});
const l = (ru: string[], kk: string[] = [], en: string[] = []) => ({ru, kk, en});

const base: KnowledgeBase = {
  directions: [
    {
      slug: "medicine",
      name: t("Медицина", "Медицина", "Medicine"),
      description: t("Здоровье людей"),
      whoItSuits: t("Тем, кто любит биологию"),
      skills: l(["Внимательность"]),
      schoolSubjects: l(["Биология", "Химия"])
    },
    {
      slug: "it",
      name: t("IT", "IT", "IT"),
      description: t("Технологии"),
      whoItSuits: t("Тем, кто любит логику"),
      skills: l(["Логика"]),
      schoolSubjects: l(["Математика", "Информатика"])
    }
  ],
  professions: [
    {
      slug: "programmer",
      directionSlug: "it",
      name: t("Программист", "Бағдарламашы", "Programmer"),
      shortDescription: t("Пишет программы"),
      whatTheyDo: t("Разрабатывает программное обеспечение"),
      salaryLabel: t("800 000 ₸"),
      demandLabel: t("Очень высокая"),
      specialties: ["Software Engineering"],
      pros: l(["Удалённая работа"]),
      cons: l(["Сидячая работа"]),
      skills: l(["Алгоритмы"]),
      schoolSubjects: l(["Математика", "Информатика"])
    },
    {
      slug: "surgeon",
      directionSlug: "medicine",
      name: t("Хирург", "Хирург", "Surgeon"),
      shortDescription: t("Проводит операции"),
      whatTheyDo: t("Лечит хирургическим путём"),
      salaryLabel: t(""),
      demandLabel: t("Высокая"),
      specialties: ["General Medicine"],
      pros: l([]),
      cons: l([]),
      skills: l(["Точность"]),
      schoolSubjects: l(["Биология", "Химия"])
    }
  ],
  universities: [
    {
      slug: "kaznmu",
      name: t("КазНМУ", "ҚазҰМУ", "KazNMU"),
      country: t("Казахстан"),
      city: t("Алматы"),
      description: t("Медицинский университет"),
      ratingLabel: t(""),
      tuitionNote: t("2 500 000 ₸"),
      website: "https://kaznmu.edu.kz",
      email: null,
      phone: null,
      address: null,
      admission: {exams: t("ЕНТ: биология, химия"), ielts: "", sat: "", grants: "", deadline: ""},
      directionSlugs: ["medicine"],
      professionSlugs: ["surgeon"],
      programNames: ["Общая медицина"]
    }
  ]
};

describe("assistant knowledge", () => {
  it("reduces a question to stems without stop words", () => {
    const stems = questionStems("Как стать программистом?");
    expect(stems).not.toContain("как");
    expect(stems.some((stem) => "программист".startsWith(stem))).toBe(true);
  });

  it("finds professions and universities by inflected names in any language", () => {
    expect(findMatches(base, "хочу стать программистом").professions.map((item) => item.slug)).toEqual(["programmer"]);
    expect(findMatches(base, "бағдарламашы болу").professions.map((item) => item.slug)).toEqual(["programmer"]);
    expect(findMatches(base, "сколько стоит учёба в КазНМУ").universities.map((item) => item.slug)).toEqual(["kaznmu"]);
  });

  it("matches nothing for an empty or off-topic question", () => {
    const matches = findMatches(base, "привет");
    expect(matches.professions).toEqual([]);
    expect(matches.universities).toEqual([]);
  });

  it("reads the page the visitor is on", () => {
    expect(pageContext("/ru/professions/programmer")).toEqual({kind: "profession", slug: "programmer"});
    expect(pageContext("/kk/universities/kaznmu?tab=1")).toEqual({kind: "university", slug: "kaznmu"});
    expect(pageContext("/en/test")).toEqual({kind: "section", path: "/test"});
    expect(pageContext("/ru")).toEqual({kind: "section", path: "/"});
  });

  it("includes the current page's record and leaves out empty fields", () => {
    const reference = buildReference({base, locale: "ru", question: "что тут", pathname: "/ru/professions/surgeon", profile: EMPTY_PROFILE});
    expect(reference).toContain("[Профессия] Хирург — /professions/surgeon");
    expect(reference).toContain("КазНМУ (/universities/kaznmu)");
    expect(reference).not.toContain("Зарплата");
    expect(reference).toContain("не проходил тест");
  });

  it("describes the visitor's test result by direction name", () => {
    const reference = buildReference({
      base,
      locale: "ru",
      question: "что мне подходит",
      pathname: "/ru",
      profile: {...EMPTY_PROFILE, topDirections: [{slug: "it", percent: 72.4}, {slug: "unknown", percent: 10}]}
    });
    expect(reference).toContain("IT — 72%");
    expect(reference).not.toContain("unknown");
  });

  it("uses the visitor's language and falls back to Russian", () => {
    const index = catalogueIndex(base, "kk");
    expect(index).toContain("Бағдарламашы [programmer]");
    expect(index).toContain("Алматы, Казахстан");
  });

  it("lists every site section in the system prompt", () => {
    const prompt = buildSystemPrompt("en", catalogueIndex(base, "en"));
    for (const section of SITE_SECTIONS) expect(prompt).toContain(section.path);
    expect(prompt).toContain("английском");
    expect(prompt).not.toContain("{LANGUAGE}");
  });
});

describe("assistant request validation", () => {
  const valid = {locale: "ru", pathname: "/ru", messages: [{role: "user", content: "Привет"}]};

  it("accepts a well-formed request and fills the profile", () => {
    const result = validateAssistantRequest(valid);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.request.profile).toEqual(EMPTY_PROFILE);
  });

  it("rejects requests that do not end with a question", () => {
    expect(validateAssistantRequest({...valid, messages: []}).ok).toBe(false);
    expect(validateAssistantRequest({...valid, messages: [{role: "assistant", content: "Привет"}]}).ok).toBe(false);
    expect(validateAssistantRequest({...valid, messages: [{role: "system", content: "x"}]}).ok).toBe(false);
    expect(validateAssistantRequest(null).ok).toBe(false);
  });

  it("rejects a question over the limit", () => {
    const long = "а".repeat(ASSISTANT_LIMITS.questionMax + 1);
    expect(validateAssistantRequest({...valid, messages: [{role: "user", content: long}]})).toEqual({ok: false, error: "tooLong"});
  });

  it("keeps the history short, alternating and starting with the visitor", () => {
    const messages = Array.from({length: 30}, (_, index) => ({role: index % 2 === 0 ? "user" : "assistant", content: `m${index}`}));
    messages.push({role: "user", content: "последний"});
    const result = validateAssistantRequest({...valid, messages});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const turns = result.request.messages;
    expect(turns.length).toBeLessThanOrEqual(ASSISTANT_LIMITS.historyMax);
    expect(turns[0].role).toBe("user");
    expect(turns.every((turn, index) => index === 0 || turn.role !== turns[index - 1].role)).toBe(true);
    expect(turns[turns.length - 1].content).toContain("последний");
  });

  it("drops unknown locales and malformed profile values", () => {
    const result = validateAssistantRequest({
      ...valid,
      locale: "de",
      profile: {topDirections: [{slug: "it", percent: 150}, {slug: "<script>", percent: 5}], favouriteProfessions: ["programmer", 3]}
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.locale).toBe("ru");
    expect(result.request.profile.topDirections).toEqual([{slug: "it", percent: 100}]);
    expect(result.request.profile.favouriteProfessions).toEqual(["programmer"]);
  });

  it("searches with the follow-up, the previous question and the last reply", () => {
    const query = retrievalQuery([
      {role: "user", content: "Где учиться на хирурга?"},
      {role: "assistant", content: "Например, в КазНМУ."},
      {role: "user", content: "А сколько это стоит?"}
    ]);
    expect(query).toContain("хирурга");
    expect(query).toContain("КазНМУ");
    expect(query).toContain("стоит");
  });
});

describe("assistant reply formatting", () => {
  it("splits paragraphs and lists", () => {
    expect(parseBlocks("Привет!\n\n- один\n- два\n\n1. первый\n2. второй\nКонец")).toEqual([
      {kind: "paragraph", lines: ["Привет!"]},
      {kind: "list", ordered: false, items: ["один", "два"]},
      {kind: "list", ordered: true, items: ["первый", "второй"]},
      {kind: "paragraph", lines: ["Конец"]}
    ]);
  });

  it("turns headings into plain paragraphs", () => {
    expect(parseBlocks("### Заголовок")).toEqual([{kind: "paragraph", lines: ["Заголовок"]}]);
  });
});
