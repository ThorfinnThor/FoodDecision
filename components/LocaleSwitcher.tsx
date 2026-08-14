"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { alternateLocale, categoryFromRouteSlug, categoryRouteSlug, localeSegment, rankingFromRouteSlug, rankingRouteSlug } from "@/lib/i18n";
import type { SiteLocale } from "@/lib/types";
import { canonicalAllergenIds } from "@/lib/allergens";

export function LocaleSwitcher({ locale }: { locale: SiteLocale }) {
  const alternate = alternateLocale(locale);
  return <Suspense fallback={<span className="locale-switcher" aria-hidden="true">{alternate === "de-DE" ? "DE" : "US"}</span>}>
    <LocaleSwitcherLink locale={locale} />
  </Suspense>;
}

function LocaleSwitcherLink({ locale }: { locale: SiteLocale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const alternate = alternateLocale(locale);
  const currentPrefix = `/${localeSegment(locale)}`;
  const alternatePrefix = `/${localeSegment(alternate)}`;
  const rest = pathname.startsWith(currentPrefix) ? pathname.slice(currentPrefix.length) || "/" : "/";
  const parts = rest.split("/").filter(Boolean);
  let translated = ["products", "best", "brands", "ingredients", "nutrition", "finder", "compare", "favorites", "shopping-list", "scan", "preferences", "methodology", "editorial-policy", "privacy", "legal-notice", "data-quality", "image-credits"].includes(parts[0]) && parts.length === 1 ? rest : "/";
  if (parts[0] === "compare" && parts.length > 1) translated = "/compare";
  if (parts[0] === "product" && parts.length > 1) translated = "/products";
  if (parts[0] === "brand" && parts.length > 1) translated = "/brands";
  if (parts[0] === "ingredient" && parts.length > 1) translated = "/ingredients";
  if (parts[0] === "nutrition" && parts[1]) {
    const routes: Record<string, Record<string, string>> = {
      "de-DE": { zucker: "sugar", protein: "protein", kalorien: "calories", ballaststoffe: "fiber", salz: "salt" },
      "en-US": { sugar: "zucker", protein: "protein", calories: "kalorien", fiber: "ballaststoffe", salt: "salz" },
    };
    const attribute = routes[locale][parts[1]];
    translated = attribute ? `/nutrition/${attribute}` : "/nutrition";
  }
  if (parts[0] === "category" && parts[1]) {
    const category = categoryFromRouteSlug(parts[1], locale);
    if (category) translated = `/category/${categoryRouteSlug(category, alternate)}`;
  }
  if (parts[0] === "best" && parts[1] && parts[2]) {
    const attribute = rankingFromRouteSlug(parts[1], locale);
    const category = categoryFromRouteSlug(parts[2], locale);
    if (attribute && category) translated = `/best/${rankingRouteSlug(attribute, alternate)}/${categoryRouteSlug(category, alternate)}`;
  }
  const translatedQuery = new URLSearchParams(searchParams.toString());
  if (translatedQuery.has("allergens")) {
    const allergens = canonicalAllergenIds(translatedQuery.get("allergens")?.split(",") ?? []);
    if (allergens.length) translatedQuery.set("allergens", allergens.join(","));
    else translatedQuery.delete("allergens");
  }
  const query = translatedQuery.toString();
  const href = `${alternatePrefix}${translated === "/" ? "" : translated}${query ? `?${query}` : ""}`;

  return (
    <Link
      aria-label={alternate === "de-DE" ? "Zum deutschen Markt wechseln" : "Switch to the US market"}
      className="locale-switcher"
      href={href}
      hrefLang={alternate}
      lang={alternate}
    >
      {alternate === "de-DE" ? "DE" : "US"}
    </Link>
  );
}
