export const locales = ["ru", "kk", "en"] as const;
export type Locale = (typeof locales)[number];
