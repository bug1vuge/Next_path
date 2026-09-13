/**
 * Parsers for the source spreadsheet.
 *
 * Rule for every function here: when a source value cannot be understood with
 * confidence it returns `null`. Nothing is guessed, rounded up, converted
 * between currencies or filled in with a plausible-looking default — an unknown
 * value stays unknown so the interface can hide the block instead of showing an
 * invented number.
 */
import type {Demand} from "@prisma/client";

export function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/ /g, " ").replace(/\s+\n/g, "\n").trim();
}

/**
 * Non-empty source text, or `null` when the cell is blank. A cell holding only a
 * dash is the sheet's way of saying "nothing here", so it counts as blank too.
 */
export function optionalText(value: unknown): string | null {
  const result = text(value);
  return result.length > 0 && !/^[-–—]+$/.test(result) ? result : null;
}

/**
 * Text shown inside a single sentence — test questions and answers. Line breaks
 * typed inside a spreadsheet cell and doubled spaces are layout artefacts that
 * would otherwise split a sentence mid-line; the wording itself is untouched.
 */
export function inlineText(value: unknown): string {
  return text(value).replace(/\s*\n\s*/g, " ").replace(/ {2,}/g, " ");
}

/**
 * Categorical labels ("Очень Высокая", "Очень высокая") differ only in casing
 * across rows. Left as-is they become two separate filter options for the same
 * level, so the casing is made consistent; the words are not changed.
 */
export function sentenceCase(value: string | null): string | null {
  if (!value) return value;
  const lower = value.toLocaleLowerCase();
  return lower.charAt(0).toLocaleUpperCase() + lower.slice(1);
}

export function slugify(value: string): string {
  return text(value)
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/giu, "-")
    .replace(/(^-+|-+$)/g, "");
}

/** Comparison key for matching the same entity across sheets. */
export function matchKey(value: unknown): string {
  return text(value).toLowerCase().replace(/[«»"'.,]/g, "").replace(/\s+/g, " ").trim();
}

/** Splits a source cell that lists several values. */
export function splitList(value: unknown): string[] {
  return text(value)
    .split(/[;\n]|,(?![^(]*\))/)
    .map((item) => item.trim().replace(/[;.]+$/, ""))
    .filter((item) => item.length > 0);
}

const DEMAND_RANKS: [RegExp, Demand, number][] = [
  [/очень\s+высок/i, "HIGH", 3],
  [/высок/i, "HIGH", 2],
  [/средн/i, "MEDIUM", 1],
  [/низк/i, "LOW", 0]
];

export function parseDemand(value: unknown): {demand: Demand; label: string | null; rank: number | null} {
  const label = sentenceCase(optionalText(value));
  if (!label) return {demand: "MEDIUM", label: null, rank: null};
  for (const [pattern, demand, rank] of DEMAND_RANKS) {
    if (pattern.test(label)) return {demand, label, rank};
  }
  return {demand: "MEDIUM", label, rank: null};
}

/**
 * Older revisions of the sheet recorded pay as a level ("Высокая",
 * "Средняя/Высокая"); the current one records a figure ("800 000 ₸"). A level is
 * kept verbatim and ranked only so the catalogue can sort by it — no amount is
 * ever derived from a word.
 */
export function parseSalaryLevel(value: unknown): {label: string | null; rank: number | null} {
  const label = optionalText(value);
  if (!label) return {label: null, rank: null};
  const normalised = label.toLowerCase();
  if (/очень\s+высок/.test(normalised)) return {label, rank: 4};
  if (/средн.*высок/.test(normalised)) return {label, rank: 2};
  if (/высок/.test(normalised)) return {label, rank: 3};
  if (/средн/.test(normalised)) return {label, rank: 1};
  if (/низк/.test(normalised)) return {label, rank: 0};
  return {label, rank: null};
}

/** A salary written as digits, if the source ever supplies one. */
export function parseSalaryAmount(value: unknown): number | null {
  const raw = text(value);
  if (!/\d/.test(raw)) return null;
  const amount = Number(raw.replace(/[^\d]/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

const CURRENCY_PATTERNS: [RegExp, string][] = [
  [/\bCAD\b/i, "CAD"],
  [/\bSGD\b/i, "SGD"],
  [/\bAUD\b/i, "AUD"],
  [/\bCHF\b/i, "CHF"],
  [/тг|тенге|₸|\bKZT\b/i, "KZT"],
  [/[£]/, "GBP"],
  [/[€]/, "EUR"],
  [/[$]|\bUSD\b/i, "USD"]
];

export function detectCurrency(value: string): string | null {
  for (const [pattern, code] of CURRENCY_PATTERNS) if (pattern.test(value)) return code;
  return null;
}

export type Tuition = {min: number | null; max: number | null; currency: string | null; note: string | null};

/**
 * Reads "стоимость/год" cells such as "600000-1300000 тг", "645 000-790 000 тг",
 * "грант/6-9 млн тг", "$30 000 – $42 000" or "от £24,500 до £40,900+".
 *
 * Only the first currency segment is parsed — trailing clauses about
 * international students describe a different price and are left in `note`.
 * Values are never converted between currencies.
 *
 * `translations` are the same cell from the Kazakh and English tabs. When the
 * Russian cell omits its currency ("700000-1770000") but a translation of that
 * very cell names it ("700,000-1,770,000 KZT"), the currency is taken from the
 * translation — the source stating it, not a guess.
 */
export function parseTuition(value: unknown, translations: unknown[] = []): Tuition {
  const note = optionalText(value);
  if (!note) return {min: null, max: null, currency: null, note: null};

  const segment = note.split("/").find((part) => /\d/.test(part)) ?? note;
  const currency =
    detectCurrency(segment) ??
    detectCurrency(note) ??
    translations.map((translation) => detectCurrency(text(translation))).find((code) => code !== null) ??
    null;
  const millions = /млн/i.test(segment);
  const scale = millions ? 1_000_000 : 1;

  const numbers = (segment.match(/\d[\d\s.,]*/g) ?? [])
    .map((raw) => {
      const cleaned = raw.replace(/\s/g, "").replace(/,(?=\d{3}\b)/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(/,/g, ".");
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed * scale : null;
    })
    .filter((amount): amount is number => amount !== null && amount > 0);

  if (numbers.length === 0 || !currency) return {min: null, max: null, currency, note};

  const min = Math.round(Math.min(...numbers));
  const max = Math.round(Math.max(...numbers));
  // A single figure is a point price, not a range.
  return {min, max: max === min ? min : max, currency, note};
}

/**
 * Ratings in the source mix world rankings ("166", "401-500"), national
 * positions ("топ-3", "1(4)") and spreadsheet artefacts. They are not
 * comparable on one scale, so the label is preserved verbatim and a numeric
 * value is stored only for a single plausible world-ranking position.
 */
export function parseRating(value: unknown): {rating: number | null; label: string | null} {
  const label = optionalText(value);
  if (!label) return {rating: null, label: null};
  const single = /^\d{1,4}$/.exec(label.replace(/\s/g, ""));
  if (single) {
    const rating = Number(single[0]);
    if (rating >= 1 && rating <= 2000) return {rating, label};
  }
  return {rating: null, label};
}

/** Direction tokens differ slightly between sheets ("PSYCHOLOGY/SOCIAL SCIENCE"). */
const DIRECTION_ALIASES: Record<string, string> = {
  "psychology-social-science": "psychology-social-sciences",
  "education-sciences": "education-science",
  "law-goverment": "law-government",
  "it-artificial-intelligence": "it-ai",
  "business-economic": "business-economics"
};

export function directionSlug(value: string): string {
  const slug = slugify(value);
  return DIRECTION_ALIASES[slug] ?? slug;
}

/**
 * Tokens for matching a university's free-text "осн. направления" cell against
 * the English specialty names listed for each profession. Parenthesised English
 * fragments such as "(Computer Science)" are the part that can be compared.
 */
export function specialtyTokens(value: unknown): Set<string> {
  const source = text(value);
  const tokens = new Set<string>();
  for (const fragment of source.split(/[(),\n;.]/)) {
    const token = matchKey(fragment);
    if (token.length > 2) tokens.add(token);
  }
  return tokens;
}
