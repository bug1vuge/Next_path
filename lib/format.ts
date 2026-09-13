import type {Locale} from "./locales";

const CURRENCY_SUFFIX: Record<string, string> = {KZT: "₸"};
const CURRENCY_PREFIX: Record<string, string> = {USD: "$", GBP: "£", EUR: "€", CAD: "CA$", SGD: "S$", AUD: "A$", CHF: "CHF "};

const INTL_LOCALE: Record<Locale, string> = {ru: "ru-RU", kk: "kk-KZ", en: "en-US"};

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale]).format(value);
}

/** A single amount with its own currency — amounts are never converted. */
export function formatMoney(value: number, currency: string | null, locale: Locale): string {
  const amount = formatNumber(value, locale);
  if (!currency) return amount;
  const prefix = CURRENCY_PREFIX[currency];
  if (prefix) return `${prefix}${amount}`;
  return `${amount} ${CURRENCY_SUFFIX[currency] ?? currency}`;
}

/**
 * A tuition range, or a single figure when both bounds are equal.
 * Returns `null` when the source gave no usable number, so the caller can hide
 * the block instead of rendering a placeholder.
 */
export function formatMoneyRange(
  min: number | null,
  max: number | null,
  currency: string | null,
  locale: Locale
): string | null {
  if (min === null && max === null) return null;
  if (min !== null && max !== null && min !== max) {
    return `${formatMoney(min, currency, locale)} – ${formatMoney(max, currency, locale)}`;
  }
  const single = min ?? max;
  return single === null ? null : formatMoney(single, currency, locale);
}

export function formatDate(value: Date | number, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {dateStyle: "long"}).format(value);
}

/**
 * Case- and diacritic-insensitive comparison key. Cyrillic "ё"/"й" and Latin
 * accents are folded so "Дизайн", "дизаин" and "Design" behave predictably.
 */
export function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ё/gi, "е")
    .toLowerCase()
    .trim();
}
