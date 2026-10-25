import {normalizeForSearch} from "@/lib/format";
import type {Locale} from "@/lib/locales";

/**
 * The assistant's knowledge base is the platform's own catalogue — no second
 * copy of educational data exists. `catalogue.ts` reads the database into the
 * plain shapes below; this module is pure: it finds the records a question is
 * about and writes them out as reference text for the model.
 *
 * Every value is copied from the database as is. A field the source leaves
 * empty is left out of the reference text, so the model has nothing to
 * "fill in" and is told to say the information is missing.
 */

export type Localised = {ru: string; kk: string; en: string};
export type LocalisedList = {ru: string[]; kk: string[]; en: string[]};

export type DirectionDoc = {
  slug: string;
  name: Localised;
  description: Localised;
  whoItSuits: Localised;
  skills: LocalisedList;
  schoolSubjects: LocalisedList;
};

export type ProfessionDoc = {
  slug: string;
  directionSlug: string;
  name: Localised;
  shortDescription: Localised;
  whatTheyDo: Localised;
  salaryLabel: Localised;
  demandLabel: Localised;
  specialties: string[];
  pros: LocalisedList;
  cons: LocalisedList;
  skills: LocalisedList;
  schoolSubjects: LocalisedList;
};

export type UniversityDoc = {
  slug: string;
  name: Localised;
  country: Localised;
  city: Localised;
  description: Localised;
  ratingLabel: Localised;
  tuitionNote: Localised;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  admission: {exams: Localised; ielts: string; sat: string; grants: string; deadline: string} | null;
  directionSlugs: string[];
  professionSlugs: string[];
  programNames: string[];
};

export type KnowledgeBase = {
  directions: DirectionDoc[];
  professions: ProfessionDoc[];
  universities: UniversityDoc[];
};

/** What the browser tells about the visitor: only catalogue slugs and test percentages. */
export type VisitorProfile = {
  topDirections: {slug: string; percent: number}[];
  favouriteDirections: string[];
  favouriteProfessions: string[];
  favouriteUniversities: string[];
  selectedProfession: string | null;
};

export const EMPTY_PROFILE: VisitorProfile = {
  topDirections: [],
  favouriteDirections: [],
  favouriteProfessions: [],
  favouriteUniversities: [],
  selectedProfession: null
};

// ---------------------------------------------------------------------------
// Reading localised values

export function pick(value: Localised, locale: Locale): string {
  const translated = value[locale]?.trim();
  return translated ? translated : value.ru.trim();
}

export function pickList(value: LocalisedList, locale: Locale): string[] {
  const translated = value[locale]?.filter((item) => item.trim().length > 0) ?? [];
  return translated.length > 0 ? translated : value.ru.filter((item) => item.trim().length > 0);
}

// ---------------------------------------------------------------------------
// Matching a question to catalogue records

const STOP_WORDS = new Set(
  [
    // ru
    "как", "что", "это", "где", "кто", "какой", "какая", "какие", "каких", "какую", "мне", "меня", "мой", "моя", "мои",
    "для", "про", "при", "или", "если", "есть", "нет", "все", "всё", "так", "там", "тут", "уже", "еще", "ещё", "можно",
    "нужно", "надо", "хочу", "хотел", "хотела", "буду", "быть", "будет", "чтобы", "очень", "тоже", "только", "сайт",
    "сайте", "расскажи", "расскажите", "подскажи", "подскажите", "помоги", "помогите", "пожалуйста", "привет",
    "здравствуйте", "спасибо", "знаю", "нравится", "интересно", "выбрать", "между", "чем", "она", "они", "его", "ему",
    // kk
    "қалай", "қандай", "қайда", "маған", "менің", "үшін", "және", "немесе", "бар", "жоқ", "керек", "сайт",
    // en
    "the", "and", "for", "what", "which", "how", "where", "who", "can", "you", "your", "about", "with", "want",
    "like", "need", "tell", "please", "this", "that", "are", "is", "do", "does", "my", "me"
  ].map(normalizeForSearch)
);

/**
 * Words of the question reduced to a crude stem, so Russian and Kazakh endings
 * still match: "программистом" → "программис", "медицине" → "медици".
 */
export function questionStems(question: string): string[] {
  const words = normalizeForSearch(question)
    .split(/[^\p{L}\p{N}+#]+/u)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
  const stems = words.map((word) => (word.length <= 4 ? word : word.slice(0, Math.max(4, Math.ceil(word.length * 0.7)))));
  return [...new Set(stems)];
}

type Haystack = {names: string; body: string};

function haystack(names: string[], body: string[]): Haystack {
  return {names: normalizeForSearch(names.join(" | ")), body: normalizeForSearch(body.join(" | "))};
}

function allLanguages(value: Localised): string[] {
  return [value.ru, value.kk, value.en];
}

function allLanguageLists(value: LocalisedList): string[] {
  return [...value.ru, ...value.kk, ...value.en];
}

function score(stems: string[], target: Haystack): number {
  return stems.reduce((total, stem) => {
    if (target.names.includes(stem)) return total + 3;
    if (target.body.includes(stem)) return total + 1;
    return total;
  }, 0);
}

function rank<T>(items: T[], stems: string[], toHaystack: (item: T) => Haystack, limit: number, minScore: number): T[] {
  if (stems.length === 0) return [];
  return items
    .map((item) => ({item, score: score(stems, toHaystack(item))}))
    .filter((entry) => entry.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}

export type Matches = {
  directions: DirectionDoc[];
  professions: ProfessionDoc[];
  universities: UniversityDoc[];
};

export function findMatches(base: KnowledgeBase, question: string): Matches {
  const stems = questionStems(question);
  return {
    directions: rank(
      base.directions,
      stems,
      (direction) => haystack(allLanguages(direction.name), [...allLanguageLists(direction.skills), ...allLanguageLists(direction.schoolSubjects)]),
      2,
      2
    ),
    professions: rank(
      base.professions,
      stems,
      (profession) =>
        haystack(
          [...allLanguages(profession.name), ...profession.specialties],
          [
            ...allLanguages(profession.shortDescription),
            ...allLanguageLists(profession.skills),
            ...allLanguageLists(profession.schoolSubjects)
          ]
        ),
      4,
      2
    ),
    universities: rank(
      base.universities,
      stems,
      (university) =>
        haystack(
          [...allLanguages(university.name), ...allLanguages(university.city), ...allLanguages(university.country)],
          university.programNames
        ),
      4,
      3
    )
  };
}

// ---------------------------------------------------------------------------
// Which page the visitor is on

export type PageContext = {kind: "direction" | "profession" | "university"; slug: string} | {kind: "section"; path: string};

/** `/ru/professions/frontend-developer?x=1` → the profession `frontend-developer`. */
export function pageContext(pathname: string): PageContext | null {
  const path = pathname.split(/[?#]/)[0].replace(/^\/(ru|kk|en)(?=\/|$)/, "") || "/";
  const detail = /^\/(directions|professions|universities)\/([^/]+)\/?$/.exec(path);
  if (detail) {
    const kind = detail[1] === "directions" ? "direction" : detail[1] === "professions" ? "profession" : "university";
    return {kind, slug: decodeURIComponent(detail[2])};
  }
  return /^\/[\w/-]*$/.test(path) ? {kind: "section", path} : null;
}

// ---------------------------------------------------------------------------
// Writing reference text

function line(label: string, value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? `${label}: ${trimmed}` : null;
}

function listLine(label: string, values: string[]): string | null {
  return values.length > 0 ? `${label}: ${values.join("; ")}` : null;
}

function block(title: string, lines: (string | null)[]): string {
  return [title, ...lines.filter((value): value is string => value !== null).map((value) => `  ${value}`)].join("\n");
}

export function describeDirection(base: KnowledgeBase, direction: DirectionDoc, locale: Locale): string {
  const professions = base.professions.filter((profession) => profession.directionSlug === direction.slug);
  return block(`[Направление] ${pick(direction.name, locale)} — /directions/${direction.slug}`, [
    line("Описание", pick(direction.description, locale)),
    line("Кому подходит", pick(direction.whoItSuits, locale)),
    listLine("Навыки", pickList(direction.skills, locale)),
    listLine("Школьные предметы", pickList(direction.schoolSubjects, locale)),
    listLine(
      "Профессии",
      professions.map((profession) => `${pick(profession.name, locale)} (/professions/${profession.slug})`)
    )
  ]);
}

/** Universities with a program of this profession first, then those with a program in its direction. */
export function universitiesForProfession(base: KnowledgeBase, profession: ProfessionDoc, limit = 8): UniversityDoc[] {
  const linked = base.universities.filter((university) => university.professionSlugs.includes(profession.slug));
  const byDirection = base.universities.filter(
    (university) => !linked.includes(university) && university.directionSlugs.includes(profession.directionSlug)
  );
  return [...linked, ...byDirection].slice(0, limit);
}

export function describeProfession(base: KnowledgeBase, profession: ProfessionDoc, locale: Locale): string {
  const direction = base.directions.find((item) => item.slug === profession.directionSlug);
  const universities = universitiesForProfession(base, profession);
  return block(`[Профессия] ${pick(profession.name, locale)} — /professions/${profession.slug}`, [
    direction ? line("Направление", `${pick(direction.name, locale)} (/directions/${direction.slug})`) : null,
    line("Кратко", pick(profession.shortDescription, locale)),
    line("Чем занимается", pick(profession.whatTheyDo, locale)),
    line("Зарплата (как указано в источнике, период не указан)", pick(profession.salaryLabel, locale)),
    line("Востребованность", pick(profession.demandLabel, locale)),
    listLine("Специальности", profession.specialties),
    listLine("Плюсы", pickList(profession.pros, locale)),
    listLine("Минусы", pickList(profession.cons, locale)),
    listLine("Навыки", pickList(profession.skills, locale)),
    listLine("Школьные предметы", pickList(profession.schoolSubjects, locale)),
    listLine(
      "Где учиться (университеты из базы с программами этой профессии или её направления)",
      universities.map((university) => `${pick(university.name, locale)} (/universities/${university.slug})`)
    )
  ]);
}

export function describeUniversity(base: KnowledgeBase, university: UniversityDoc, locale: Locale): string {
  const directions = base.directions.filter((direction) => university.directionSlugs.includes(direction.slug));
  const admission = university.admission;
  return block(`[Университет] ${pick(university.name, locale)} — /universities/${university.slug}`, [
    line("Страна, город", [pick(university.country, locale), pick(university.city, locale)].filter(Boolean).join(", ")),
    line("Описание", pick(university.description, locale)),
    line("Рейтинг (как в источнике)", pick(university.ratingLabel, locale)),
    line("Стоимость обучения в год (как в источнике)", pick(university.tuitionNote, locale)),
    listLine("Направления", directions.map((direction) => pick(direction.name, locale))),
    listLine("Программы", university.programNames.slice(0, 12)),
    admission ? line("Экзамены для поступления", pick(admission.exams, locale)) : null,
    admission ? line("IELTS", admission.ielts) : null,
    admission ? line("SAT", admission.sat) : null,
    admission ? line("Гранты", admission.grants) : null,
    admission ? line("Сроки", admission.deadline) : null,
    line("Официальный сайт", university.website),
    line("Email", university.email),
    line("Телефон", university.phone),
    line("Адрес", university.address)
  ]);
}

/** A one-line-per-record map of the whole catalogue, so the model knows what exists and what does not. */
export function catalogueIndex(base: KnowledgeBase, locale: Locale): string {
  const directions = base.directions
    .map((direction) => {
      const professions = base.professions
        .filter((profession) => profession.directionSlug === direction.slug)
        .map((profession) => `${pick(profession.name, locale)} [${profession.slug}]`);
      return `- ${pick(direction.name, locale)} [/directions/${direction.slug}]: ${professions.join(", ") || "профессий пока нет"}`;
    })
    .join("\n");
  const universities = base.universities
    .map((university) => {
      const place = [pick(university.city, locale), pick(university.country, locale)].filter(Boolean).join(", ");
      return `- ${pick(university.name, locale)}${place ? ` (${place})` : ""} [${university.slug}]`;
    })
    .join("\n");
  return [
    "## Направления и их профессии (в скобках — адрес; профессия открывается по /professions/<адрес>)",
    directions || "- Каталог пуст",
    "",
    "## Университеты в базе (университет открывается по /universities/<адрес>)",
    universities || "- Каталог пуст"
  ].join("\n");
}

function describeProfile(base: KnowledgeBase, profile: VisitorProfile, locale: Locale): string | null {
  const directionName = (slug: string) => {
    const direction = base.directions.find((item) => item.slug === slug);
    return direction ? pick(direction.name, locale) : null;
  };
  const professionName = (slug: string) => {
    const profession = base.professions.find((item) => item.slug === slug);
    return profession ? pick(profession.name, locale) : null;
  };
  const universityName = (slug: string) => {
    const university = base.universities.find((item) => item.slug === slug);
    return university ? pick(university.name, locale) : null;
  };
  const present = (values: (string | null)[]) => values.filter((value): value is string => value !== null);

  const lines = [
    listLine(
      "Результат теста (совпадение с направлениями)",
      present(
        profile.topDirections.map((score) => {
          const name = directionName(score.slug);
          return name ? `${name} — ${Math.round(score.percent)}%` : null;
        })
      )
    ),
    listLine("Избранные направления", present(profile.favouriteDirections.map(directionName))),
    listLine("Избранные профессии", present(profile.favouriteProfessions.map(professionName))),
    listLine("Избранные университеты", present(profile.favouriteUniversities.map(universityName))),
    profile.selectedProfession ? line("Профессия, выбранная на карьерной карте", professionName(profile.selectedProfession)) : null
  ].filter((value): value is string => value !== null);

  if (lines.length === 0) return "Пользователь ещё не проходил тест и ничего не сохранял в избранное.";
  return lines.map((value) => `- ${value}`).join("\n");
}

/**
 * The reference text for one question: what the visitor has done on the site,
 * the page they are on, and the catalogue records the question is about.
 */
export function buildReference({
  base,
  locale,
  question,
  pathname,
  profile
}: {
  base: KnowledgeBase;
  locale: Locale;
  question: string;
  pathname: string;
  profile: VisitorProfile;
}): string {
  const matches = findMatches(base, question);
  const context = pageContext(pathname);

  const directions = new Set(matches.directions);
  const professions = new Set(matches.professions);
  const universities = new Set(matches.universities);

  let pageLine = `Пользователь сейчас на странице ${pathname || "/"}.`;
  if (context?.kind === "direction") {
    const direction = base.directions.find((item) => item.slug === context.slug);
    if (direction) {
      directions.add(direction);
      pageLine = `Пользователь сейчас на странице направления «${pick(direction.name, locale)}».`;
    }
  } else if (context?.kind === "profession") {
    const profession = base.professions.find((item) => item.slug === context.slug);
    if (profession) {
      professions.add(profession);
      pageLine = `Пользователь сейчас на странице профессии «${pick(profession.name, locale)}».`;
    }
  } else if (context?.kind === "university") {
    const university = base.universities.find((item) => item.slug === context.slug);
    if (university) {
      universities.add(university);
      pageLine = `Пользователь сейчас на странице университета «${pick(university.name, locale)}».`;
    }
  }

  const records = [
    ...[...directions].map((direction) => describeDirection(base, direction, locale)),
    ...[...professions].map((profession) => describeProfession(base, profession, locale)),
    ...[...universities].map((university) => describeUniversity(base, university, locale))
  ];

  return [
    "## Пользователь",
    pageLine,
    describeProfile(base, profile, locale),
    "",
    "## Подробные записи базы, подходящие к вопросу",
    records.length > 0
      ? records.join("\n\n")
      : "Подробных записей по этому вопросу не найдено. Опирайся на перечень каталога выше; если нужной записи там нет — скажи, что в базе Next Path этого нет."
  ].join("\n");
}
