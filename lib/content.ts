import type {Locale} from "./locales";

/**
 * Catalogue content comes from a Russian source spreadsheet.
 *
 * The Kazakh and English columns are deliberately stored **empty** until a real
 * translation exists: an empty column means "not translated yet" and never
 * claims that a Russian string is a Kazakh or English translation. Reading goes
 * through the helpers below, which fall back to the Russian source value so the
 * catalogue stays usable in every locale while the interface chrome is
 * translated properly.
 */
export const CONTENT_LOCALE: Locale = "ru";

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

/** True when catalogue text shown in this locale is actually the Russian source. */
export function isUntranslatedContentLocale(locale: Locale): boolean {
  return locale !== CONTENT_LOCALE;
}
