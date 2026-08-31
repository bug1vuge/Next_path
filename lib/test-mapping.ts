/**
 * Bridge between the source questionnaire and the direction catalogue.
 *
 * The source spreadsheet does not score the eight catalogue directions
 * directly. Each answer is tagged with one of twelve archetype labels, grouped
 * in three blocks of fifteen questions:
 *
 *   "Личность"  → Ученый / Аналитический · Рациональный / Системный ·
 *                 Интуитивный / Креативный · Прагматический / Лидерский
 *   "Интересы"  → Естественные науки · Цифровые технологии / IT ·
 *                 Творчество / Искусство · Социум / Бизнес
 *   "Карьера"   → Science & Deep Tech · IT и ИИ · Дизайн и Креатив ·
 *                 Бизнес и Менеджмент
 *
 * The product requires a per-direction match percentage, so the table below
 * translates each archetype into direction weights. It is a **product
 * decision, not source data** — it is kept in this single file, applied only by
 * the importer when it writes `Option.weights`, and can be re-tuned by editing
 * the table and re-running `pnpm db:import:sheet`. `Option.archetype` keeps the
 * raw source label so nothing is lost.
 *
 * Weights are relative (0…1) within one archetype. Every catalogue direction is
 * reachable from at least one archetype, so no direction is structurally
 * unreachable in the results.
 */
export const DIRECTION_SLUGS = [
  "it-ai",
  "medicine",
  "engineering-architecture",
  "business-economics",
  "design-creative",
  "psychology-social-sciences",
  "law-government",
  "education-science"
] as const;

export type DirectionSlug = (typeof DIRECTION_SLUGS)[number];

export type ArchetypeWeights = Partial<Record<DirectionSlug, number>>;

/** Keys are normalised archetype labels: lower-cased, whitespace-collapsed. */
export const ARCHETYPE_DIRECTION_WEIGHTS: Record<string, ArchetypeWeights> = {
  // Block "Личность" — how the person thinks and decides.
  "ученый / аналитический": {
    "education-science": 1,
    medicine: 0.6,
    "it-ai": 0.4,
    "engineering-architecture": 0.3
  },
  "рациональный / системный": {
    "it-ai": 1,
    "engineering-architecture": 0.8,
    "business-economics": 0.4,
    "law-government": 0.3
  },
  "интуитивный / креативный": {
    "design-creative": 1,
    "psychology-social-sciences": 0.5,
    "education-science": 0.3
  },
  "прагматический / лидерский": {
    "business-economics": 1,
    "law-government": 0.7,
    "psychology-social-sciences": 0.3
  },

  // Block "Интересы" — what the person likes doing.
  "естественные науки": {
    medicine: 1,
    "education-science": 0.8,
    "engineering-architecture": 0.3
  },
  "цифровые технологии / it": {
    "it-ai": 1,
    "engineering-architecture": 0.5
  },
  "творчество / искусство": {
    "design-creative": 1,
    "psychology-social-sciences": 0.3
  },
  "социум / бизнес": {
    "business-economics": 1,
    "law-government": 0.8,
    "psychology-social-sciences": 0.7
  },

  // Block "Карьера" — the working world the person is drawn to.
  "science & deep tech": {
    "education-science": 1,
    "engineering-architecture": 0.7,
    medicine: 0.6,
    "it-ai": 0.4
  },
  "it и ии": {
    "it-ai": 1,
    "engineering-architecture": 0.4
  },
  "дизайн и креатив": {
    "design-creative": 1
  },
  "бизнес и менеджмент": {
    "business-economics": 1,
    "law-government": 0.6,
    "psychology-social-sciences": 0.4
  }
};

export function normaliseArchetype(label: string): string {
  return label.replace(/\s+/g, " ").trim().toLowerCase();
}

export function weightsForArchetype(label: string): ArchetypeWeights | null {
  return ARCHETYPE_DIRECTION_WEIGHTS[normaliseArchetype(label)] ?? null;
}

/** Source test block ("Тип теста") → schema question category. */
export function categoryForBlock(block: string): "INTERESTS" | "APTITUDES" | "ACTIVITY_TYPE" {
  const value = normaliseArchetype(block);
  if (value.startsWith("личност")) return "APTITUDES";
  if (value.startsWith("карьер")) return "ACTIVITY_TYPE";
  return "INTERESTS";
}
