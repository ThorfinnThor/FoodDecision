import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ComparisonDecision } from "@/components/ComparisonDecision";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ProductVisual } from "@/components/ProductVisual";
import { ScorePill } from "@/components/ScorePill";
import { ShoppingListButton } from "@/components/ShoppingListButton";
import { SiteHeader } from "@/components/SiteHeader";
import { StructuredData } from "@/components/StructuredData";
import { BRAND_NAME } from "@/lib/brand";
import { localizedPath, pick } from "@/lib/i18n";
import { requireLocale } from "@/lib/locale-page";
import { absoluteUrl } from "@/lib/seo";
import { scoreByType } from "@/lib/scoring";
import { getCatalog } from "@/lib/static-data";
import type { Product, ScoreType } from "@/lib/types";

type Props = { params: Promise<{ locale: string; pair: string }> };

function splitPair(pair: string) {
  const products = pair.split("-vs-");
  return products.length === 2 ? products : null;
}

function value(product: Product, type: ScoreType) {
  return scoreByType(product, type)?.score ?? null;
}

export function generateStaticParams() {
  return (["de-DE", "en-US"] as const).flatMap((locale) => getCatalog(locale).comparisonPairs.map((pair) => ({
    locale: locale === "de-DE" ? "de" : "en-us",
    pair,
  })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const values = await params;
  const locale = requireLocale(values.locale);
  const slugs = splitPair(values.pair);
  if (!slugs) return {};
  const catalog = getCatalog(locale);
  const first = catalog.getProduct(slugs[0]);
  const second = catalog.getProduct(slugs[1]);
  if (!first || !second) return {};
  const indexable = first.category === second.category && catalog.comparisonPairs.includes(values.pair);
  return {
    title: pick(locale, `${first.name} und ${second.name} im Vergleich | ${BRAND_NAME}`, `${first.name} and ${second.name} compared | ${BRAND_NAME}`),
    description: pick(locale, `Vergleich von ${first.name} und ${second.name} mit Scores, Zucker, Protein, Zutaten und Datenqualität.`, `Compare ${first.name} and ${second.name} using scores, sugar, protein, ingredients, and data quality.`),
    alternates: { canonical: localizedPath(locale, `/compare/${values.pair}`) },
    robots: { index: indexable, follow: true },
  };
}

export default async function ComparePairPage({ params }: Props) {
  const values = await params;
  const locale = requireLocale(values.locale);
  const slugs = splitPair(values.pair);
  if (!slugs) notFound();
  const catalog = getCatalog(locale);
  const first = catalog.getProduct(slugs[0]);
  const second = catalog.getProduct(slugs[1]);
  if (!first || !second) notFound();
  const path = (value = "/") => localizedPath(locale, value);
  const copy = (german: string, english: string) => pick(locale, german, english);
  const comparable = first.category === second.category && first.nutrition.basis === second.nutrition.basis;
  const better = (firstValue: number | null, secondValue: number | null, low = false) => {
    if (firstValue === null || secondValue === null || firstValue === secondValue) return null;
    return (low ? firstValue < secondValue : firstValue > secondValue) ? first : second;
  };
  const overall = better(value(first, "overall_match"), value(second, "overall_match"));
  const rows = [
    { label: copy("Gesamturteil", "Overall score"), first: value(first, "overall_match"), second: value(second, "overall_match"), unit: "/100", winner: first.category === second.category ? overall : null },
    { label: copy("Zucker", "Sugar"), first: first.nutrition.sugar, second: second.nutrition.sugar, unit: " g", winner: comparable ? better(first.nutrition.sugar, second.nutrition.sugar, true) : null },
    { label: copy("Protein", "Protein"), first: first.nutrition.protein, second: second.nutrition.protein, unit: " g", winner: comparable ? better(first.nutrition.protein, second.nutrition.protein) : null },
    { label: copy("Zutaten", "Ingredients"), first: first.ingredients.length, second: second.ingredients.length, unit: "", winner: null },
  ];

  return <main>
    <StructuredData data={{ "@context": "https://schema.org", "@type": "ItemList", name: copy(`${first.name} und ${second.name} im Vergleich`, `${first.name} and ${second.name} compared`), inLanguage: locale, url: absoluteUrl(path(`/compare/${values.pair}`)), numberOfItems: 2 }} />
    <SiteHeader locale={locale} />
    <nav className="breadcrumb"><Link href={path()}>{copy("Start", "Home")}</Link><span>/</span><Link href={path("/compare")}>{copy("Vergleiche", "Compare")}</Link></nav>
    <section className="compare-intro"><p className="eyebrow">{copy("Vorbereiteter Produktvergleich", "Prepared product comparison")}</p><h1>{first.name} {copy("oder", "or")} {second.name}?</h1><p>{copy("Die wichtigsten Unterschiede mit klarer Einordnung und sichtbaren Datenlücken.", "The most important differences with clear context and visible data gaps.")}</p></section>
    {!comparable ? <div className="comparison-context-note"><strong>{copy("Nur eingeschränkt vergleichbar", "Limited comparability")}</strong><span>{copy("Vorteile werden nur innerhalb derselben Kategorie und Bezugsbasis ausgewiesen.", "Advantages are shown only within the same category and nutrition basis.")}</span></div> : null}
    <ComparisonDecision first={first} second={second} />
    <section className="compare-products">{[first, second].map((product) => <article className="compare-product" key={product.id}>
      <ProductVisual compact product={product} />
      <p className="product-meta">{product.brand} · {product.categoryLabel}</p>
      <h2>{product.name}</h2>
      {scoreByType(product, "overall_match") ? <ScorePill locale={locale} score={scoreByType(product, "overall_match")!} /> : null}
      <div className="compare-product-actions"><Link className="text-link" href={path(`/product/${product.slug}`)}>{copy("Produktdetails", "Product details")} →</Link><div className="save-actions"><FavoriteButton locale={locale} productName={product.name} productSlug={product.slug} /><ShoppingListButton locale={locale} productName={product.name} productSlug={product.slug} /></div></div>
    </article>)}</section>
    <section className="section comparison-details"><div className="section-heading"><p className="eyebrow">{copy("Direkter Vergleich", "Direct comparison")}</p><h2>{copy("Die entscheidenden Unterschiede", "The differences that matter")}</h2></div><div className="comparison-table-wrap"><table className="comparison-table"><thead><tr><th>{copy("Kriterium", "Criterion")}</th><th>{first.name}</th><th>{second.name}</th><th>{copy("Vorteil", "Advantage")}</th></tr></thead><tbody>{rows.map((row) => <tr key={row.label}><th>{row.label}</th><td data-label={first.name}>{row.first ?? copy("Keine Angabe", "Not available")}{typeof row.first === "number" ? row.unit : ""}</td><td data-label={second.name}>{row.second ?? copy("Keine Angabe", "Not available")}{typeof row.second === "number" ? row.unit : ""}</td><td data-label={copy("Vorteil", "Advantage")}>{row.winner?.name ?? copy("Kein klarer Vorteil", "No clear advantage")}</td></tr>)}</tbody></table></div><p className="small-note">{copy("Prüfe Allergene und Rezeptur immer auf der aktuellen Verpackung.", "Always verify allergens and ingredients on the current package.")}</p></section>
  </main>;
}
