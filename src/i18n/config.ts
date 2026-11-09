export const locales = ["ru", "en", "el"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ru";
export const localeNames: Record<Locale, string> = { ru: "Русский", en: "English", el: "Ελληνικά" };
export function isLocale(v: string): v is Locale {
  return (locales as readonly string[]).includes(v);
}
