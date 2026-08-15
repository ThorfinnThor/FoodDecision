import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogGrid } from "@/components/CatalogGrid";
import { SiteHeader } from "@/components/SiteHeader";
import { StructuredData } from "@/components/StructuredData";
import { categoryInsights } from "@/lib/category-insights";
import { categoryFromRouteSlug, categoryRouteSlug, localizedPath, pick, rankingRouteSlug } from "@/lib/i18n";
import { requireLocale } from "@/lib/locale-page";
import { absoluteUrl } from "@/lib/seo";
import { getCatalog } from "@/lib/static-data";
import { categoryImage, categoryImageAlt } from "@/lib/category-images";
import { BRAND_NAME } from "@/lib/brand";
import { isCategoryIndexable } from "@/lib/search-indexing";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return (["de-DE", "en-US"] as const).flatMap((locale) => getCatalog(locale).getAvailableCategories().map((category) => ({ locale: locale === "de-DE" ? "de" : "en-us", slug: categoryRouteSlug(category.slug, locale) })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const values = await params;
  const locale = requireLocale(values.locale);
  const internalSlug = categoryFromRouteSlug(values.slug, locale);
  const catalog = getCatalog(locale);
  const category = internalSlug ? catalog.getCategory(internalSlug) : null;
  if (!category || catalog.getCategoryProductCount(category.slug) === 0) return { robots: { index: false, follow: false } };
  const indexable = isCategoryIndexable(catalog.qualityReport, category.slug);
  return {
    title: `${category.label} | ${BRAND_NAME}`,
    description: category.description,
    alternates: {
      canonical: localizedPath(locale, `/category/${categoryRouteSlug(category.slug, locale)}`),
      languages: {
        "de-DE": localizedPath("de-DE", `/category/${categoryRouteSlug(category.slug, "de-DE")}`),
        "en-US": localizedPath("en-US", `/category/${categoryRouteSlug(category.slug, "en-US")}`),
        "x-default": localizedPath("de-DE", `/category/${categoryRouteSlug(category.slug, "de-DE")}`),
      },
    },
    robots: { index: indexable, follow: true },
  };
}

export default async function CategoryPage({ params }: Props) {
  const values = await params;
  const locale = requireLocale(values.locale);
  const catalog = getCatalog(locale);
  const internalSlug = categoryFromRouteSlug(values.slug, locale);
  const category = internalSlug ? catalog.getCategory(internalSlug) : null;
  if (!category) notFound();
  const path = (value = "/") => localizedPath(locale, value);
  const items = catalog.getProductsByCategory(category.slug);
  if (!items.length) notFound();
  const insights = categoryInsights(items);
  const rankings = catalog.rankingPages.filter((ranking) =>
    ranking.category === category.slug
    && catalog.rankedProducts(ranking.category, ranking.sortScore).length >= ranking.minProductsRequired,
  );
  const heroImage = categoryImage(category.slug);

  return <main>
    <StructuredData data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: pick(locale, "Start", "Home"), item: absoluteUrl(path()) },
      { "@type": "ListItem", position: 2, name: category.label, item: absoluteUrl(path(`/category/${values.slug}`)) },
    ] }} />
    <SiteHeader locale={locale} />
    <nav className="breadcrumb" aria-label="Breadcrumb"><Link href={path()}>{pick(locale, "Start", "Home")}</Link><span aria-hidden="true">/</span><span aria-current="page">{category.label}</span></nav>
    <section className="category-page-hero">
      <Image alt={categoryImageAlt(category.slug, locale)} fill priority sizes="100vw" src={heroImage.src} style={{ objectPosition: heroImage.objectPosition }} />
      <div className="category-page-hero-shade" />
      <div className="category-page-hero-content"><p className="eyebrow">{pick(locale, "Kategorie entdecken", "Explore category")}</p><h1>{category.label}</h1><p>{category.description}</p><div className="hero-actions">{rankings.map((ranking) => <Link href={path(`/best/${rankingRouteSlug(ranking.attribute, locale)}/${categoryRouteSlug(category.slug, locale)}`)} key={ranking.attribute}>{ranking.title}</Link>)}</div></div>
      <a className="category-page-image-credit" href={heroImage.sourceUrl} rel="license noreferrer" target="_blank">{pick(locale, "Foto", "Photo")}: {heroImage.creator} · {heroImage.license}</a>
    </section>
    <section className="ranking-context category-facts"><div><p className="eyebrow">{pick(locale, "Katalog auf einen Blick", "Catalog at a glance")}</p><h2>{pick(locale, "Was die aktuellen Daten zeigen", "What the current data shows")}</h2></div><dl className="insight-stats"><div><dt>{pick(locale, "Produkte", "Products")}</dt><dd>{insights.products}</dd></div><div><dt>{pick(locale, "Median Zucker", "Median sugar")}</dt><dd>{insights.medianSugar === null ? "-" : `${insights.medianSugar.toFixed(1)} g`}</dd></div><div><dt>{pick(locale, "Median Protein", "Median protein")}</dt><dd>{insights.medianProtein === null ? "-" : `${insights.medianProtein.toFixed(1)} g`}</dd></div><div><dt>{pick(locale, "Zutatenabdeckung", "Ingredient coverage")}</dt><dd>{insights.ingredientCoverage}%</dd></div></dl></section>
    <section className="section"><div className="section-heading"><p className="eyebrow">{pick(locale, "Produkte vergleichen", "Compare products")}</p><h2>{items.length} {pick(locale, "Produkte mit nachvollziehbarer Bewertung", "products with explainable scoring")}</h2><p>{pick(locale, "Sortiere nach deinem Ziel oder öffne eine Produktseite für alle Details.", "Sort by your goal or open a product for all details.")}</p></div><CatalogGrid locale={locale} products={items} /></section>
  </main>;
}
