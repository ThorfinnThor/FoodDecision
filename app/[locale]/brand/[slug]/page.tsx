import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogGrid } from "@/components/CatalogGrid";
import { SiteHeader } from "@/components/SiteHeader";
import { categoryFinderPath, categoryGroups, categoryPagePath } from "@/lib/discovery";
import { localizedPath, pick } from "@/lib/i18n";
import { requireLocale } from "@/lib/locale-page";
import { getCatalog } from "@/lib/static-data";
import { BRAND_NAME } from "@/lib/brand";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return (["de-DE", "en-US"] as const).flatMap((locale) => getCatalog(locale).getBrands()
    .filter((brand) => brand.products.length >= 2)
    .slice(0, 300)
    .map((brand) => ({
    locale: locale === "de-DE" ? "de" : "en-us",
    slug: brand.slug,
  })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const values = await params;
  const locale = requireLocale(values.locale);
  const brand = getCatalog(locale).getBrand(values.slug);
  if (!brand) return {};
  const canonical = localizedPath(locale, `/brand/${brand.slug}`);
  return {
    title: `${brand.name} ${pick(locale, "Produkte", "products")} | ${BRAND_NAME}`,
    description: pick(locale, `${brand.products.length} Produkte von ${brand.name} nach Kategorie und Bewertung vergleichen.`, `Compare ${brand.products.length} products from ${brand.name} by category and score.`),
    alternates: { canonical },
    robots: { index: false, follow: true },
  };
}

export default async function BrandPage({ params }: Props) {
  const values = await params;
  const locale = requireLocale(values.locale);
  const catalog = getCatalog(locale);
  const brand = catalog.getBrand(values.slug);
  if (!brand) notFound();
  const path = (value = "/") => localizedPath(locale, value);
  const groups = categoryGroups(brand.products, catalog.getCategories());
  const eligible = brand.products.filter((product) => product.publishability === "ranking_eligible").length;

  return <main>
    <SiteHeader locale={locale} />
    <nav className="breadcrumb"><Link href={path()}>{pick(locale, "Start", "Home")}</Link><span>/</span><Link href={path("/brands")}>{pick(locale, "Marken", "Brands")}</Link><span>/</span><span>{brand.name}</span></nav>
    <section className="subpage-hero compact-subpage-hero">
      <p className="eyebrow">{pick(locale, "Markenübersicht", "Brand overview")}</p>
      <h1>{brand.name}</h1>
      <p>{pick(locale, `${brand.products.length} Produkte aus ${groups.length} Kategorien. ${eligible} Produkte erfüllen aktuell die Voraussetzungen für Rankings.`, `${brand.products.length} products across ${groups.length} categories. ${eligible} products currently meet the requirements for rankings.`)}</p>
    </section>
    <section className="section discovery-context-section">
      <div className="section-heading split-heading"><div><p className="eyebrow">{pick(locale, "Nicht pauschal bewerten", "Avoid blanket judgments")}</p><h2>{pick(locale, "Jedes Produkt zählt für sich", "Every product stands on its own")}</h2></div><p>{pick(locale, "Die Marke beeinflusst keinen Score. Nährwerte, Zutaten und Datenqualität werden für jedes Produkt mit den Regeln seiner Kategorie bewertet.", "The brand never affects a score. Nutrition, ingredients, and data quality are assessed for each product using its category rules.")}</p></div>
      <div className="category-breakdown">{groups.map((group) => <article key={group.category.slug}>
        <div><strong>{group.category.label}</strong><span>{group.products.length} {pick(locale, group.products.length === 1 ? "Produkt" : "Produkte", group.products.length === 1 ? "product" : "products")}</span></div>
        <p>{group.averageScore === null ? pick(locale, "Noch kein belastbarer Durchschnittswert.", "No reliable average score yet.") : pick(locale, `Durchschnittlicher Gesamtscore ${group.averageScore} von 100.`, `Average overall score ${group.averageScore} out of 100.`)}</p>
        <div><Link href={categoryPagePath(locale, group.category)}>{pick(locale, "Kategorie öffnen", "Open category")}</Link><Link href={categoryFinderPath(locale, group.category)}>{pick(locale, "Im Finder prüfen", "Use in finder")}</Link></div>
      </article>)}</div>
    </section>
    <section className="section section-soft">
      <div className="section-heading"><p className="eyebrow">{pick(locale, "Produkte", "Products")}</p><h2>{pick(locale, `Alle Produkte von ${brand.name}`, `All products from ${brand.name}`)}</h2></div>
      <CatalogGrid categories={groups.map((group) => group.category)} locale={locale} products={brand.products} />
    </section>
  </main>;
}
