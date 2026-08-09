import type { Metadata } from "next";
import { FinderExperience } from "@/components/FinderExperience";
import { SiteHeader } from "@/components/SiteHeader";
import { pick } from "@/lib/i18n";
import { localeAlternates, requireLocale } from "@/lib/locale-page";
import { finderCriteriaFromSearchParams, hasFinderSearchParams, type FinderSearchParams } from "@/lib/product-insights";
import { getCatalog } from "@/lib/static-data";
import { BRAND_NAME } from "@/lib/brand";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<FinderSearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  return {
    title: pick(locale, `Produktfinder | ${BRAND_NAME}`, `Product finder | ${BRAND_NAME}`),
    description: pick(locale, "Finde Lebensmittel nach Kategorie, Ziel und Ausschlusskriterien.", "Find foods by category, goal, and exclusions."),
    alternates: localeAlternates(locale, "/finder"),
    robots: { index: false, follow: true },
  };
}

export default async function FinderPage({ params, searchParams }: Props) {
  const locale = requireLocale((await params).locale);
  const values = await searchParams;
  const catalog = getCatalog(locale);
  const categories = catalog.getAvailableCategories();
  const initialCriteria = finderCriteriaFromSearchParams(values, categories.map((category) => category.slug));
  return <main><SiteHeader locale={locale} /><section className="subpage-hero finder-hero"><p className="eyebrow">{pick(locale, "Produktfinder", "Product finder")}</p><h1>{pick(locale, "Was passt zu deinem Alltag?", "What fits your everyday life?")}</h1><p>{pick(locale, "Wähle, was dir wichtig ist, und erhalte eine nachvollziehbare Auswahl ohne Registrierung.", "Choose what matters to you and get an explainable shortlist without an account.")}</p></section><FinderExperience categories={categories} initialCriteria={initialCriteria} locale={locale} products={catalog.finderResults()} showResultsInitially={hasFinderSearchParams(values)} /></main>;
}
