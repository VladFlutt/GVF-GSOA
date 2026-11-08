import type { Locale } from "@/i18n/config";
import type { L10n } from "./types";

export function t(text: L10n, locale: Locale): string {
  return text[locale] ?? text.en ?? text.ru ?? "";
}
