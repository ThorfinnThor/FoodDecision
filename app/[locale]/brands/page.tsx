import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { categoryGroups } from "@/lib/discovery";
import { entitySlug } from "@/lib/product-insights";
import { localizedPath, pick } from "@/lib/i18n";
import { localeAlternates, requireLocale } from "@/lib/locale-page";
import { getCatalog } from "@/lib/static-data";
import { BRAND_NAME } from "@/lib/brand";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  return {
    title: pick(locale, `Marken im Produktkatalog | ${BRAND_NAME}`, `Brands in the product catalog | ${BRAND_NAME}`),
    description: pick(locale, "Entdecke Marken nach Produktanzahl und Kategorie. Bewertungen bleiben immer produktbezogen.", "Explore brands by product count and category. Scores always remain product specific."),
    alternates: localeAlternates(locale, "/brands"),
    robots: { index: false, follow: true },
  };
}

export default async function BrandsPage({ params }: Props) {
  const locale = requireLocale((await params).locale);
  const catalog = getCatalog(locale);
  const path = (value = "/") => localizedPath(locale, value);
  const brands = catalog.getBrands()
    .filter((brand) => brand.products.length >= 2)
    .filter((brand) => !/unbekannte marke|unknown brand/i.test(brand.name));
  const categoryCount = new Set(brands.flatMap((brand) => brand.products.map((product) => product.category))).size;

  return <main>
    <SiteHeader locale={locale} />
    <nav className="breadcrumb"><Link href={path()}>{pick(locale, "Start", "Home")}</Link><span>/</span><span>{pick(locale, "Marken", "Brands")}</span></nav>
    <section className="subpage-hero compact-subpage-hero">
      <p className="eyebrow">{pick(locale, "Katalog nach Marke", "Catalog by brand")}</p>
      <h1>{pick(locale, "Marken im aktuellen Katalog", "Brands in the current catalog")}</h1>
      <p>{pick(locale, `${brands.length} Marken mit mindestens zwei Produkten aus ${categoryCount} Kategorien. Eine Marke erhält keine pauschale Bewertung.`, `${brands.length} brands with at least two products across ${categoryCount} categories. A brand never receives a blanket score.`)}</p>
    </section>
    <section className="section directory-section">
      <div className="section-heading split-heading"><div><p className="eyebrow">{pick(locale, "Alphabetisch und nach Abdeckung", "Alphabetical and by coverage")}</p><h2>{pick(locale, "Produkte einer Marke prüfen", "Review products from a brand")}</h2></div><p>{pick(locale, "Öffne eine Marke, um ihre Produkte nach Kategorie, Datenqualität und Bewertung zu vergleichen.", "Open a brand to compare its products by category, data quality, and score.")}</p></div>
      {brands.length ? <div className="entity-directory">{brands.map((brand) => {
        const groups = categoryGroups(brand.products, catalog.getCategories());
        return <Link href={path(`/brand/${entitySlug(brand.name)}`)} key={brand.slug}>
          <span><strong>{brand.name}</strong><small>{groups.slice(0, 3).map((group) => group.category.label).join(" · ")}</small></span>
          <b>{brand.products.length} {pick(locale, brand.products.length === 1 ? "Produkt" : "Produkte", brand.products.length === 1 ? "product" : "products")}</b>
        </Link>;
      })}</div> : <div className="empty-state"><h3>{pick(locale, "Noch keine Markenübersicht verfügbar", "No brand directory available yet")}</h3><p>{pick(locale, "Marken erscheinen hier, sobald mehrere geprüfte Produkte vorliegen.", "Brands appear here once multiple assessed products are available.")}</p></div>}
    </section>
  </main>;
}

