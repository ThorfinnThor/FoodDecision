import { notFound } from "next/navigation";
import { localeFromSegment, localizedPath } from "./i18n.ts";
import type { SiteLocale } from "./types.ts";

export function requireLocale(segment: string): SiteLocale {
  const locale = localeFromSegment(segment);
  if (!locale) notFound();
  return locale;
}

export function localeAlternates(locale: SiteLocale, path = "/") {
  const canonical = localizedPath(locale, path);
  return {
    canonical,
    languages: {
      "de-DE": localizedPath("de-DE", path),
      "en-US": localizedPath("en-US", path),
      "x-default": localizedPath("de-DE", path),
    },
  };
}
