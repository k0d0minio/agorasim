export const locales = ["pt", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "pt";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** A value that differs per language. */
export type Localized<T = string> = Record<Locale, T>;

/** Pick the value for a locale from a Localized object. */
export function t<T>(value: Localized<T>, locale: Locale): T {
  return value[locale];
}

export const localeNames: Localized = { pt: "PT", en: "EN" };
