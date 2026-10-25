import {describe, expect, it} from "vitest";
import {EMPTY_PROFILE, type KnowledgeBase, type VisitorProfile} from "@/lib/assistant/knowledge";
import {localReply, replyLanguage, streamText} from "@/lib/assistant/local";
import type {ChatTurn} from "@/lib/assistant/input";
import type {Locale} from "@/lib/locales";

const t = (ru: string, kk = "", en = "") => ({ru, kk, en});
const l = (ru: string[], kk: string[] = [], en: string[] = []) => ({ru, kk, en});
const base: KnowledgeBase = {
  directions: [
    {slug: "medicine", name: t("Медицина","Медицина","Medicine"), description: t("Здоровье людей"), whoItSuits: t("Тем, кто любит биологию и помогать людям"), skills: l(["Внимательность"]), schoolSubjects: l(["Биология","Химия"],["Биология","Химия"],["Biology","Chemistry"])},
    {slug: "it-ai", name: t("IT и искусственный интеллект","IT және жасанды интеллект","IT and AI"), description: t("Технологии"), whoItSuits: t("Тем, кто любит логику"), skills: l(["Логика"]), schoolSubjects: l(["Математика","Информатика"],["Математика","Информатика"],["Mathematics","Computer science"])},
    {slug: "business-economics", name: t("Бизнес и экономика","Бизнес және экономика","Business and economics"), description: t("Деньги и компании"), whoItSuits: t("Тем, кто любит считать"), skills: l(["Аналитика"]), schoolSubjects: l(["Математика","Английский язык"])}
  ],
  professions: [
    {slug: "software-engineer", directionSlug: "it-ai", name: t("Программист","Бағдарламашы","Software engineer"), shortDescription: t("Пишет программы"), whatTheyDo: t("Разрабатывает программное обеспечение"), salaryLabel: t("800 000 ₸"), demandLabel: t("Очень высокая"), specialties: ["Software Engineering"], pros: l(["Удалённая работа"]), cons: l(["Сидячая работа"]), skills: l(["Алгоритмы"]), schoolSubjects: l(["Математика","Информатика"])},
    {slug: "data-analyst", directionSlug: "it-ai", name: t("Аналитик данных","Деректер талдаушысы","Data analyst"), shortDescription: t("Находит закономерности в данных"), whatTheyDo: t("Собирает и анализирует данные"), salaryLabel: t(""), demandLabel: t("Высокая"), specialties: [], pros: l([]), cons: l([]), skills: l(["SQL","Статистика"]), schoolSubjects: l(["Математика"])},
    {slug: "surgeon", directionSlug: "medicine", name: t("Хирург","Хирург","Surgeon"), shortDescription: t("Проводит операции"), whatTheyDo: t("Лечит хирургическим путём"), salaryLabel: t(""), demandLabel: t("Высокая"), specialties: ["General Medicine"], pros: l([]), cons: l([]), skills: l(["Точность"]), schoolSubjects: l(["Биология","Химия"])}
  ],
  universities: [
    {slug: "kaznmu", name: t("КазНМУ","ҚазҰМУ","KazNMU"), country: t("Казахстан","Қазақстан","Kazakhstan"), city: t("Алматы"), description: t("Медицинский университет"), ratingLabel: t(""), tuitionNote: t("2 500 000 ₸"), website: "https://kaznmu.edu.kz", email: null, phone: null, address: null, admission: {exams: t("ЕНТ: биология, химия"), ielts: "", sat: "", grants: "", deadline: ""}, directionSlugs: ["medicine"], professionSlugs: ["surgeon"], programNames: ["Общая медицина"]},
    {slug: "aitu", name: t("Astana IT University"), country: t("Казахстан"), city: t("Астана"), description: t("IT-университет"), ratingLabel: t(""), tuitionNote: t(""), website: null, email: null, phone: null, address: null, admission: null, directionSlugs: ["it-ai"], professionSlugs: ["software-engineer"], programNames: ["Software Engineering"]}
  ]
};

function ask(question: string, options: {locale?: Locale; pathname?: string; profile?: VisitorProfile; history?: ChatTurn[]} = {}) {
  return localReply({
    base,
    locale: options.locale ?? "ru",
    messages: [...(options.history ?? []), {role: "user", content: question}],
    pathname: options.pathname ?? "/ru",
    profile: options.profile ?? EMPTY_PROFILE
  });
}

describe("local assistant — using the site", () => {
  it("greets and explains where to start", () => {
    expect(ask("Привет")).toContain("помощник Next Path");
    expect(ask("С чего начать на Next Path?")).toContain("[Тест](/test)");
  });

  it("explains sections by their real paths", () => {
    expect(ask("Что показывает карьерная карта?")).toContain("(/career-path)");
    expect(ask("Как сохранить профессию в избранное?")).toContain("(/favorites)");
  });

  it("says that a missing feature does not exist", () => {
    expect(ask("Как зарегистрироваться?")).toContain("нет функции");
    expect(ask("Какие у меня шансы поступить в КазНМУ?")).toContain("не оцениваю шансы");
  });
});

describe("local assistant — choosing a profession", () => {
  it("asks a clarifying question about maths, as in the specification", () => {
    const reply = ask("Мне нравится математика, но я не знаю, какую профессию выбрать");
    expect(reply).toContain("работать с данными");
    expect(reply).toContain("/directions/it-ai");
  });

  it("uses the visitor's test result, or suggests the test", () => {
    const profile = {...EMPTY_PROFILE, topDirections: [{slug: "it-ai", percent: 81}]};
    expect(ask("Какие профессии подходят по моему тесту?", {profile})).toContain("81%");
    expect(ask("Какие профессии подходят по моему тесту?")).toContain("[Тест](/test)");
  });

  it("compares two professions from the catalogue", () => {
    const reply = ask("Чем программист отличается от аналитика данных?");
    expect(reply).toContain("Аналитик данных");
    expect(reply).toContain("Программист");
    expect(reply).toContain("800 000 ₸");
  });

  it("asks which professions to compare in a short-named direction", () => {
    expect(ask("Чем отличаются похожие профессии в IT?")).toContain("Программист, Аналитик данных");
  });
});

describe("local assistant — the educational path", () => {
  it("gives school subjects and where to study from the database", () => {
    expect(ask("Какие предметы нужны для поступления на медицину?")).toContain("Биология, Химия");
    expect(ask("Где можно учиться на программиста?")).toContain("/universities/aitu");
  });

  it("quotes tuition as stored and admits missing data", () => {
    expect(ask("Сколько стоит учёба в КазНМУ?")).toContain("2 500 000 ₸");
    const grants = ask("Есть ли гранты в КазНМУ?");
    expect(grants).toContain("В базе Next Path этого пока нет");
    expect(grants).toContain("https://kaznmu.edu.kz");
  });

  it("understands follow-ups and the current page", () => {
    const history: ChatTurn[] = [
      {role: "user", content: "Расскажи про КазНМУ"},
      {role: "assistant", content: "КазНМУ — медицинский университет."}
    ];
    expect(ask("А какие там экзамены?", {history})).toContain("ЕНТ: биология, химия");
    expect(ask("Сколько стоит обучение?", {pathname: "/ru/universities/kaznmu"})).toContain("2 500 000 ₸");
  });

  it("does not invent what the database lacks", () => {
    expect(ask("Расскажи про профессию пилота")).toContain("не нашёл");
  });
});

describe("local assistant — deciding what the question is about first", () => {
  const aboutUniversity: ChatTurn[] = [
    {role: "user", content: "Расскажи про КазНМУ"},
    {role: "assistant", content: "**КазНМУ** — Казахстан, Алматы. Могу рассказать о стоимости, экзаменах, грантах или сроках — спроси."}
  ];

  it("answers a question about the platform even right after talking about a university", () => {
    const reply = ask("для чего вообще ваша платформа?", {history: aboutUniversity});
    expect(reply).toContain("профориентационная платформа");
    expect(reply).not.toContain("КазНМУ");
    expect(ask("что это за сайт?", {history: aboutUniversity})).toContain("профориентационная платформа");
    expect(ask("а что ты умеешь?", {history: aboutUniversity})).toContain("помощник Next Path");
  });

  it("answers a general question generally, not about the previous university", () => {
    expect(ask("Как узнать о грантах в университетах?", {history: aboutUniversity})).toContain("(/grants)");
    expect(ask("Какие университеты есть в базе?")).toContain("Университеты в базе Next Path");
  });

  it("says plainly that the site is free", () => {
    expect(ask("Сайт платный?", {history: aboutUniversity})).toContain("Next Path бесплатный");
  });

  it("does not take a profession's name for another word", () => {
    expect(ask("Какие навыки нужны программисту?")).toContain("Алгоритмы");
    expect(ask("Сколько зарабатывает программист?")).toContain("800 000 ₸");
  });

  it("lays out the steps towards a profession, separating advice from data", () => {
    const reply = ask("Как стать программистом?");
    expect(reply).toContain("1. Подтяни школьные предметы: Математика, Информатика.");
    expect(reply).toContain("/universities/aitu");
    expect(reply).toContain("Общая рекомендация (это не данные Next Path)");
  });

  it("recognises a vague request with words in between", () => {
    expect(ask("кем мне стать?")).toContain("Давай сузим выбор");
  });
});

describe("local assistant — boundaries and language", () => {
  it("declines homework and gives the helpline in distress", () => {
    expect(ask("Реши домашнее задание по алгебре")).toContain("С этим я не помогу");
    expect(ask("Мне очень плохо, не хочу жить")).toContain("150");
  });

  it("answers in the language of the message", () => {
    expect(replyLanguage("Маған биология ұнайды", "ru")).toBe("kk");
    expect(replyLanguage("How much does it cost?", "ru")).toBe("en");
    expect(replyLanguage("Сколько стоит?", "kk")).toBe("kk");
    expect(ask("How much does Astana IT University cost?")).toContain("Next Path doesn't have this information yet");
  });

  it("streams the whole reply", async () => {
    const reader = streamText("Привет, как дела?").getReader();
    const decoder = new TextDecoder();
    let text = "";
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      text += decoder.decode(value);
    }
    expect(text).toBe("Привет, как дела?");
  });
});
