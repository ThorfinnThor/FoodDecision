import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataQualityNotice } from "@/components/DataQualityNotice";
import { DecisionSnapshot } from "@/components/DecisionSnapshot";
import { FavoriteButton } from "@/components/FavoriteButton";
import { NutritionTable } from "@/components/NutritionTable";
import { ProductCard } from "@/components/ProductCard";
import { ProductVisual } from "@/components/ProductVisual";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { ScorePill } from "@/components/ScorePill";
import { ShoppingListButton } from "@/components/ShoppingListButton";
import { SiteHeader } from "@/components/SiteHeader";
import { StructuredData } from "@/components/StructuredData";
import { categoryRouteSlug, localizedPath, pick, rankingRouteSlug } from "@/lib/i18n";
import { requireLocale } from "@/lib/locale-page";
import { absoluteUrl } from "@/lib/seo";
import { getCatalog } from "@/lib/static-data";
import { gradeLabel, scoreByType } from "@/lib/scoring";

type Props = { params: Promise<{ locale: string; slug: string }> };
export function generateStaticParams() { return (["de-DE", "en-US"] as const).flatMap((locale) => getCatalog(locale).products.map((product) => ({ locale: locale === "de-DE" ? "de" : "en-us", slug: product.slug }))); }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const values = await params; const locale = requireLocale(values.locale); const product = getCatalog(locale).getProduct(values.slug); if (!product) return {}; const canonical = localizedPath(locale, `/product/${product.slug}`); const otherLocale = locale === "de-DE" ? "en-US" : "de-DE"; const counterpart = getCatalog(otherLocale).getProductByGtin(product.gtin); return { title: `${product.name} - ${pick(locale, "Bewertung & Nährwerte", "Score and nutrition")}`, description: product.description, alternates: counterpart ? { canonical, languages: { [locale]: canonical, [otherLocale]: localizedPath(otherLocale, `/product/${counterpart.slug}`) } } : { canonical }, robots: { index: false, follow: true } }; }

export default async function ProductPage({ params }: Props) {
  const values = await params; const locale = requireLocale(values.locale); const catalog = getCatalog(locale); const product = catalog.getProduct(values.slug); if (!product) notFound();
  const path = (value = "/") => localizedPath(locale, value); const c = (de: string, en: string) => pick(locale, de, en);
  const alternatives = catalog.getAlternatives(product, "overall_match", 3); const comparisonTarget = alternatives[0]?.product ?? null; const overall = scoreByType(product, "overall_match");
  const positives = [...new Set(product.scores.flatMap((score) => score.positives))].slice(0, 4); const negatives = [...new Set(product.scores.flatMap((score) => score.negatives))].slice(0, 3);
  const relatedRankings = catalog.rankingPages
    .filter((ranking) => ranking.category === product.category)
    .filter((ranking) => catalog.rankedProducts(ranking.category, ranking.sortScore).length >= ranking.minProductsRequired)
    .slice(0, 3);
  return <main className="product-page">
    <StructuredData data={{ "@context": "https://schema.org", "@type": "Product", name: product.name, description: product.description, brand: { "@type": "Brand", name: product.brand }, gtin13: product.gtin, category: product.categoryLabel, image: product.imageUrl || undefined, url: absoluteUrl(path(`/product/${product.slug}`)), inLanguage: locale }} />
    <SiteHeader locale={locale} />
    <nav className="breadcrumb" aria-label="Breadcrumb"><Link href={path()}>{c("Start", "Home")}</Link><span>/</span><Link href={path(`/category/${categoryRouteSlug(product.category, locale)}`)}>{product.categoryLabel}</Link><span>/</span><span>{product.name}</span></nav>
    <section className="product-detail-hero"><div className="product-detail-visual"><ProductVisual product={product} />{product.imageUrl && product.imageSourceUrl ? <a className="image-credit" href={product.imageSourceUrl} rel="license noreferrer" target="_blank">{c("Produktbild", "Product image")}: Open Food Facts, CC BY-SA</a> : null}</div><div className="product-detail-copy"><p className="product-meta">{product.brand} · {product.categoryLabel}</p><h1>{product.name}</h1><p className="product-lead">{product.description}</p>{overall ? <div className="main-verdict"><ScorePill locale={locale} score={overall} /><div><span>{c("Gesamturteil", "Overall assessment")}</span><strong>{gradeLabel(overall.grade, locale)}</strong><p>{c("Auf Basis der aktuell verfügbaren Produktdaten.", "Based on the currently available product data.")}</p></div></div> : null}<div className="pros-cons"><div><h2>{c("Spricht dafür", "Reasons to consider")}</h2><ul>{(positives.length ? positives : [c("Keine besonderen Stärken bestätigt.", "No specific strengths confirmed.")]).map((item) => <li key={item}>{item}</li>)}</ul></div><div><h2>{c("Darauf achten", "Things to check")}</h2><ul>{(negatives.length ? negatives : [c("Keine kritischen Hinweise in den verfügbaren Daten.", "No critical issues in the available data.")]).map((item) => <li key={item}>{item}</li>)}</ul></div></div><div className="save-actions"><FavoriteButton locale={locale} productName={product.name} productSlug={product.slug} /><ShoppingListButton locale={locale} productName={product.name} productSlug={product.slug} /></div></div></section>
    <DecisionSnapshot categoryProducts={catalog.getProductsByCategory(product.category)} product={product} />
    <ScoreBreakdown product={product} />
    <section className="detail-section ingredients-section"><div className="section-heading"><p className="eyebrow">{c("Zutaten & Allergene", "Ingredients and allergens")}</p><h2>{c("Was du vor dem Kauf wissen solltest", "What to know before buying")}</h2></div><div className="two-column"><div className="detail-panel"><h3>{c("Zutaten", "Ingredients")}</h3>{product.ingredients.length ? <ul className="tag-list">{product.ingredients.map((item) => <li key={item}>{item}</li>)}</ul> : <p>{c("Keine verlässliche Zutatenliste verfügbar.", "No reliable ingredient list available.")}</p>}</div><div className="detail-panel"><h3>{c("Bekannte Allergene", "Known allergens")}</h3><ul className="tag-list warning-tags">{(product.allergens.length ? product.allergens : [c("Keine bestätigten Allergendaten", "No confirmed allergen data")]).map((item) => <li key={item}>{item}</li>)}</ul><p className="small-note">{c("Bei Allergien zählt immer die aktuelle Verpackungsangabe.", "For allergies, always rely on the current package label.")}</p></div></div></section>
    <NutritionTable product={product} /><section className="detail-section source-section"><DataQualityNotice product={product} /></section>
    {alternatives.length ? <section className="section section-soft"><div className="section-heading"><p className="eyebrow">{c("Alternativen", "Alternatives")}</p><h2>{c("Weitere starke Optionen in", "Other strong options in")} {product.categoryLabel}</h2><p>{c("Nach Gesamturteil und Datenvollständigkeit sortiert.", "Sorted by overall score and data completeness.")}</p></div><div className="product-grid">{alternatives.map((item) => <ProductCard key={item.product.id} matchReasons={item.match.reasons} matchScore={item.match.score} product={item.product} />)}</div></section> : null}
    <section className="detail-section related-section"><div className="section-heading"><p className="eyebrow">{c("Weiter entdecken", "Keep exploring")}</p><h2>{c("Passende Einordnungen", "Related rankings")}</h2></div><div className="related-link-grid">{relatedRankings.map((ranking) => <Link href={path(`/best/${rankingRouteSlug(ranking.attribute, locale)}/${categoryRouteSlug(ranking.category, locale)}`)} key={ranking.attribute}><strong>{ranking.title}</strong><span>{c("Zum Ranking", "View ranking")}</span></Link>)}</div></section>
    {comparisonTarget ? <div className="mobile-sticky-cta"><Link href={path(`/compare/${product.slug}-vs-${comparisonTarget.slug}`)}>{c("Mit Alternative vergleichen", "Compare with an alternative")}</Link></div> : null}
  </main>;
}
