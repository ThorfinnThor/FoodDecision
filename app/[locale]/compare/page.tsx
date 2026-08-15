import type { Metadata } from "next";
import Link from "next/link";
import { ComparisonBuilder } from "@/components/ComparisonBuilder";
import { PreparedComparisonFilter } from "@/components/PreparedComparisonFilter";
import { ProductVisual } from "@/components/ProductVisual";
import { SiteHeader } from "@/components/SiteHeader";
import { BRAND_NAME } from "@/lib/brand";
import { localizedPath, pick } from "@/lib/i18n";
import { localeAlternates, requireLocale } from "@/lib/locale-page";
import { getCatalog } from "@/lib/static-data";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ first?: string; category?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  return {
    title: pick(locale, `Lebensmittel vergleichen | ${BRAND_NAME}`, `Compare foods | ${BRAND_NAME}`),
    description: pick(locale, "Vergleiche Scores, Nährwerte, Zutaten und Datenqualität direkt oder öffne einen vorbereiteten Vergleich.", "Compare scores, nutrition, ingredients, and data quality directly or open a prepared comparison."),
    alternates: localeAlternates(locale, "/compare"),
    robots: { index: true, follow: true },
  };
}

export default async function ComparePage({ params, searchParams }: Props) {
  const locale = requireLocale((await params).locale);
  const { first = "", category = "" } = await searchParams;
  const catalog = getCatalog(locale);
  const path = (value: string) => localizedPath(locale, value);
  const prepared = catalog.comparisonPairs.flatMap((pair) => {
    const [firstSlug, secondSlug] = pair.split("-vs-");
    const firstProduct = catalog.getProduct(firstSlug);
    const secondProduct = catalog.getProduct(secondSlug);
    return firstProduct && secondProduct ? [{ pair, firstProduct, secondProduct }] : [];
  });
  const categoryCounts = new Map<string, number>();
  for (const item of prepared) categoryCounts.set(item.firstProduct.category, (categoryCounts.get(item.firstProduct.category) ?? 0) + 1);
  const categoryOptions = catalog.getAvailableCategories().flatMap((item) => {
    const count = categoryCounts.get(item.slug) ?? 0;
    return count ? [{ slug: item.slug, label: item.label, count }] : [];
  });
  const selectedCategory = categoryOptions.some((item) => item.slug === category) ? category : "";
  const visiblePrepared = selectedCategory ? prepared.filter((item) => item.firstProduct.category === selectedCategory) : prepared;

  return <main>
    <SiteHeader locale={locale} />
    <section className="subpage-hero compact-subpage-hero">
      <p className="eyebrow">{pick(locale, "Produktvergleich", "Product comparison")}</p>
      <h1>{pick(locale, "Vergleiche die Unterschiede, die für deine Wahl zählen", "Compare the differences that matter for your choice")}</h1>
      <p>{pick(locale, "Öffne einen vorbereiteten Vergleich oder wähle zwei Produkte selbst aus.", "Open a prepared comparison or choose two products yourself.")}</p>
    </section>

    {prepared.length ? <section className="section comparison-library">
      <div className="section-heading split-heading">
        <div><p className="eyebrow">{pick(locale, "Vorbereitete Vergleiche", "Prepared comparisons")}</p><h2>{pick(locale, "Beliebte Produkte derselben Kategorie direkt vergleichen", "Compare popular products from the same category")}</h2></div>
        <p>{pick(locale, "Jeder Vergleich zeigt Scores, Nährwerte, Zutaten und sichtbare Datenlücken.", "Each comparison shows scores, nutrition, ingredients, and visible data gaps.")}</p>
      </div>
      <div className="comparison-library-toolbar">
        <PreparedComparisonFilter locale={locale} options={categoryOptions} selected={selectedCategory} />
        <p><strong>{visiblePrepared.length}</strong> {pick(locale, visiblePrepared.length === 1 ? "vorbereiteter Vergleich" : "vorbereitete Vergleiche", visiblePrepared.length === 1 ? "prepared comparison" : "prepared comparisons")}</p>
      </div>
      <div className="prepared-comparison-grid">{visiblePrepared.map(({ pair, firstProduct, secondProduct }) => <Link className="prepared-comparison-card" href={path(`/compare/${pair}`)} key={pair}>
        <span className="prepared-comparison-visuals"><ProductVisual compact product={firstProduct} /><b>{pick(locale, "oder", "or")}</b><ProductVisual compact product={secondProduct} /></span>
        <strong>{firstProduct.name} {pick(locale, "oder", "or")} {secondProduct.name}</strong>
        <small>{firstProduct.categoryLabel}</small>
      </Link>)}</div>
    </section> : null}

    <section className="section section-soft">
      <div className="section-heading"><p className="eyebrow">{pick(locale, "Eigene Auswahl", "Your selection")}</p><h2>{pick(locale, "Zwei Produkte selbst auswählen", "Choose two products")}</h2></div>
      <ComparisonBuilder categories={catalog.getCategories()} initialFirst={first} locale={locale} products={catalog.finderResults()} />
    </section>
  </main>;
}
