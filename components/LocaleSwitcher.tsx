"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { alternateLocale, categoryFromRouteSlug, categoryRouteSlug, localeSegment, rankingFromRouteSlug, rankingRouteSlug } from "@/lib/i18n";
import type { SiteLocale } from "@/lib/types";

export function LocaleSwitcher({ locale }: { locale: SiteLocale }) {
  const pathname = usePathname();
  const alternate = alternateLocale(locale);
  const currentPrefix = `/${localeSegment(locale)}`;
  const alternatePrefix = `/${localeSegment(alternate)}`;
  const rest = pathname.startsWith(currentPrefix) ? pathname.slice(currentPrefix.length) || "/" : "/";
  const parts = rest.split("/").filter(Boolean);
  let translated = ["products", "finder", "compare", "favorites", "shopping-list", "scan", "preferences", "methodology"].includes(parts[0]) && parts.length === 1 ? rest : "/";
  if (parts[0] === "category" && parts[1]) {
    const category = categoryFromRouteSlug(parts[1], locale);
    if (category) translated = `/category/${categoryRouteSlug(category, alternate)}`;
  }
  if (parts[0] === "best" && parts[1] && parts[2]) {
    const attribute = rankingFromRouteSlug(parts[1], locale);
    const category = categoryFromRouteSlug(parts[2], locale);
    if (attribute && category) translated = `/best/${rankingRouteSlug(attribute, alternate)}/${categoryRouteSlug(category, alternate)}`;
  }
  const href = `${alternatePrefix}${translated === "/" ? "" : translated}`;

  return (
    <Link
      aria-label={alternate === "de-DE" ? "Zur deutschen Version wechseln" : "Switch to US English"}
      className="locale-switcher"
      href={href}
      hrefLang={alternate}
      lang={alternate}
    >
      {alternate === "de-DE" ? "DE" : "EN"}
    </Link>
  );
}
