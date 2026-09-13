import type {Locale} from "./locales";

/**
 * Catalogue content comes from the team's spreadsheet, which carries a Russian,
 * a Kazakh and an English tab for every sheet.
 *
 * Two storage shapes exist, and each has its own reader:
 *
 * - `localizedText` / `localizedList` for fields that were localised from the
 *   start and have a column per language: `name_ru`, `name_kk`, `name_en`;
 * - `localizedValue` / `localizedValues` for fields that began Russian-only and
 *   gained translations later: the unsuffixed column is the Russian source value
 *   (and, for country and city, the key the filters use), next to `city_kk` and
 *   `city_en`.
 *
 * Either way an empty translation falls back to the Russian source value, so a
 * cell the translators have not filled yet shows the original rather than a
 * blank.
 */
type LocalisedField<Field extends string> = `${Field}_ru` | `${Field}_kk` | `${Field}_en`;

export function localizedText<Field extends string>(
  record: Record<LocalisedField<Field>, string>,
  field: Field,
  locale: Locale
): string {
  const value = record[`${field}_${locale}` as LocalisedField<Field>];
  if (typeof value === "string" && value.trim().length > 0) return value;
  return record[`${field}_ru` as LocalisedField<Field>] ?? "";
}

export function localizedList<Field extends string>(
  record: Record<LocalisedField<Field>, string[]>,
  field: Field,
  locale: Locale
): string[] {
  const value = record[`${field}_${locale}` as LocalisedField<Field>];
  if (Array.isArray(value) && value.length > 0) return value;
  return record[`${field}_ru` as LocalisedField<Field>] ?? [];
}

type Translations<Field extends string, Value> = Record<Field, Value> & Partial<Record<`${Field}_kk` | `${Field}_en`, Value>>;

export function localizedValue<Field extends string>(
  record: Translations<Field, string>,
  field: Field,
  locale: Locale
): string;
export function localizedValue<Field extends string>(
  record: Translations<Field, string | null>,
  field: Field,
  locale: Locale
): string | null;
export function localizedValue(record: Record<string, string | null | undefined>, field: string, locale: Locale): string | null {
  const source = record[field] ?? null;
  if (locale === "ru") return source;
  const translated = record[`${field}_${locale}`];
  return typeof translated === "string" && translated.trim().length > 0 ? translated : source;
}

/** "Country, city" in the reader's language, or just the country when the source gives no city. */
export function localizedPlace(
  record: Translations<"country", string> & Translations<"city", string>,
  locale: Locale
): string {
  const country = localizedValue(record, "country", locale);
  const city = localizedValue(record, "city", locale);
  return city ? `${country}, ${city}` : country;
}

export function localizedValues<Field extends string>(
  record: Translations<Field, string[]>,
  field: Field,
  locale: Locale
): string[] {
  const source = record[field];
  if (locale === "ru") return source;
  const translated = (record as Partial<Record<string, string[]>>)[`${field}_${locale}`];
  return Array.isArray(translated) && translated.length > 0 ? translated : source;
}
