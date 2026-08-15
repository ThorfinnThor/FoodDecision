import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
import { isComparisonIndexable } from "@/lib/search-indexing";
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
  if (slugs[0] === slugs[1]) return { robots: { index: false, follow: true } };
  const catalog = getCatalog(locale);
  const first = catalog.getProduct(slugs[0]);
  const second = catalog.getProduct(slugs[1]);
  if (!first || !second) return {};
  const indexable = isComparisonIndexable(catalog.qualityReport, first, second, catalog.comparisonPairs.includes(values.pair));
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
  if (slugs[0] === slugs[1]) redirect(`${localizedPath(locale, "/compare")}?first=${encodeURIComponent(slugs[0])}`);
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
  const overallFirst = value(first, "overall_match");
  const overallSecond = value(second, "overall_match");
  const lowerSugar = comparable ? better(first.nutrition.sugar, second.nutrition.sugar, true) : null;
  const higherProtein = comparable ? better(first.nutrition.protein, second.nutrition.protein) : null;
  const unit = first.nutrition.basis === "100ml" ? copy("pro 100 ml", "per 100 ml") : copy("pro 100 g", "per 100 g");
  const rows = [
    { label: copy("Gesamturteil", "Overall score"), first: overallFirst, second: overallSecond, unit: "/100", winner: first.category === second.category ? overall : null },
    { label: copy("Energie", "Energy"), first: first.nutrition.energyKcal, second: second.nutrition.energyKcal, unit: " kcal", winner: null },
    { label: copy("Zucker", "Sugar"), first: first.nutrition.sugar, second: second.nutrition.sugar, unit: " g", winner: comparable ? better(first.nutrition.sugar, second.nutrition.sugar, true) : null },
    { label: copy("Protein", "Protein"), first: first.nutrition.protein, second: second.nutrition.protein, unit: " g", winner: comparable ? better(first.nutrition.protein, second.nutrition.protein) : null },
    { label: copy("Gesättigte Fettsäuren", "Saturated fat"), first: first.nutrition.saturatedFat, second: second.nutrition.saturatedFat, unit: " g", winner: comparable ? better(first.nutrition.saturatedFat, second.nutrition.saturatedFat, true) : null },
    { label: copy("Salz", "Salt"), first: first.nutrition.salt, second: second.nutrition.salt, unit: " g", winner: comparable ? better(first.nutrition.salt, second.nutrition.salt, true) : null },
    { label: copy("Zutaten", "Ingredients"), first: first.ingredients.length, second: second.ingredients.length, unit: "", winner: null },
  ];
  const overallAnswer = !comparable
    ? copy("Die Produkte gehören nicht zur selben Vergleichsgruppe. Einzelwerte sind sichtbar, ein Gesamtsieger wäre jedoch irreführend.", "The products are not in the same comparison group. Individual values remain visible, but naming an overall winner would be misleading.")
    : overall
      ? copy(`${overall.name} hat im aktuellen Modell das höhere Gesamturteil. Die Entscheidung sollte trotzdem an deinem Ziel und den einzelnen Nährwerten ausgerichtet werden.`, `${overall.name} has the higher overall score in the current model. Your decision should still reflect your goal and the individual nutrition values.`)
      : copy("Beim Gesamturteil besteht Gleichstand. Zucker, Protein, Salz und Zutaten helfen bei der genaueren Entscheidung.", "The overall scores are tied. Sugar, protein, salt, and ingredients can help with the closer decision.");
  const sugarAnswer = !comparable
    ? copy("Ein direkter Zuckervergleich ist wegen unterschiedlicher Kategorie oder Bezugsbasis nicht belastbar.", "A direct sugar comparison is not reliable because the category or nutrition basis differs.")
    : lowerSugar
      ? copy(`${lowerSugar.name} enthält weniger Zucker: ${lowerSugar.nutrition.sugar} g ${unit}.`, `${lowerSugar.name} contains less sugar: ${lowerSugar.nutrition.sugar} g ${unit}.`)
      : copy(`Beide Produkte weisen denselben Zuckerwert aus: ${first.nutrition.sugar ?? copy("keine Angabe", "not available")} g ${unit}.`, `Both products report the same sugar value: ${first.nutrition.sugar ?? copy("keine Angabe", "not available")} g ${unit}.`);
  const proteinAnswer = !comparable
    ? copy("Ein direkter Proteinvergleich ist wegen unterschiedlicher Kategorie oder Bezugsbasis nicht belastbar.", "A direct protein comparison is not reliable because the category or nutrition basis differs.")
    : higherProtein
      ? copy(`${higherProtein.name} enthält mehr Protein: ${higherProtein.nutrition.protein} g ${unit}.`, `${higherProtein.name} contains more protein: ${higherProtein.nutrition.protein} g ${unit}.`)
      : copy(`Beide Produkte weisen denselben Proteinwert aus: ${first.nutrition.protein ?? copy("keine Angabe", "not available")} g ${unit}.`, `Both products report the same protein value: ${first.nutrition.protein ?? copy("keine Angabe", "not available")} g ${unit}.`);
  const faq = [
    { question: copy(`Welches Produkt hat das bessere Gesamturteil?`, `Which product has the better overall score?`), answer: overallAnswer },
    { question: copy(`Welches Produkt enthält weniger Zucker?`, `Which product contains less sugar?`), answer: sugarAnswer },
    { question: copy(`Welches Produkt enthält mehr Protein?`, `Which product contains more protein?`), answer: proteinAnswer },
  ];
  const relatedComparisons = catalog.comparisonPairs.flatMap((pair) => {
    if (pair === values.pair) return [];
    const relatedSlugs = splitPair(pair);
    if (!relatedSlugs) return [];
    const relatedFirst = catalog.getProduct(relatedSlugs[0]);
    const relatedSecond = catalog.getProduct(relatedSlugs[1]);
    return relatedFirst && relatedSecond && relatedFirst.category === first.category ? [{ pair, first: relatedFirst, second: relatedSecond }] : [];
  }).slice(0, 4);

  return <main>
    <StructuredData data={{ "@context": "https://schema.org", "@type": "ItemList", name: copy(`${first.name} und ${second.name} im Vergleich`, `${first.name} and ${second.name} compared`), inLanguage: locale, url: absoluteUrl(path(`/compare/${values.pair}`)), numberOfItems: 2, itemListElement: [first, second].map((product, index) => ({ "@type": "ListItem", position: index + 1, name: product.name, url: absoluteUrl(path(`/product/${product.slug}`)) })) }} />
    <StructuredData data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: copy("Start", "Home"), item: absoluteUrl(path()) }, { "@type": "ListItem", position: 2, name: copy("Vergleiche", "Compare"), item: absoluteUrl(path("/compare")) }, { "@type": "ListItem", position: 3, name: `${first.name} / ${second.name}`, item: absoluteUrl(path(`/compare/${values.pair}`)) }] }} />
    <StructuredData data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) }} />
    <SiteHeader locale={locale} />
    <nav className="breadcrumb"><Link href={path()}>{copy("Start", "Home")}</Link><span>/</span><Link href={path("/compare")}>{copy("Vergleiche", "Compare")}</Link></nav>
    <section className="compare-intro"><p className="eyebrow">{copy("Vorbereiteter Produktvergleich", "Prepared product comparison")}</p><h1>{first.name} {copy("oder", "or")} {second.name}?</h1><p>{copy("Die wichtigsten Unterschiede mit klarer Einordnung und sichtbaren Datenlücken.", "The most important differences with clear context and visible data gaps.")}</p></section>
    {!comparable ? <div className="comparison-context-note"><strong>{copy("Nur eingeschränkt vergleichbar", "Limited comparability")}</strong><span>{copy("Vorteile werden nur innerhalb derselben Kategorie und Bezugsbasis ausgewiesen.", "Advantages are shown only within the same category and nutrition basis.")}</span></div> : null}
    <ComparisonDecision first={first} second={second} />
    <section className="section compare-answer-section"><div className="section-heading split-heading"><div><p className="eyebrow">{copy("Kurzantwort", "Short answer")}</p><h2>{copy("Was der direkte Vergleich zeigt", "What the direct comparison shows")}</h2></div><p>{copy(`Beide Produkte werden innerhalb der Kategorie ${first.categoryLabel} und auf derselben Bezugsbasis eingeordnet.`, `Both products are assessed within ${first.categoryLabel} and use the same nutrition basis.`)}</p></div><div className="compare-answer-grid"><article><span>{copy("Gesamturteil", "Overall score")}</span><p>{overallAnswer}</p></article><article><span>{copy("Zucker", "Sugar")}</span><p>{sugarAnswer}</p></article><article><span>{copy("Protein", "Protein")}</span><p>{proteinAnswer}</p></article></div></section>
    <section className="compare-products">{[first, second].map((product) => <article className="compare-product" key={product.id}>
      <ProductVisual compact product={product} />
      <p className="product-meta">{product.brand} · {product.categoryLabel}</p>
      <h2>{product.name}</h2>
      {scoreByType(product, "overall_match") ? <ScorePill locale={locale} score={scoreByType(product, "overall_match")!} /> : null}
      <div className="compare-product-actions"><Link className="text-link" href={path(`/product/${product.slug}`)}>{copy("Produktdetails", "Product details")} →</Link><div className="save-actions"><FavoriteButton locale={locale} productName={product.name} productSlug={product.slug} /><ShoppingListButton locale={locale} productName={product.name} productSlug={product.slug} /></div></div>
    </article>)}</section>
    <section className="section comparison-details"><div className="section-heading"><p className="eyebrow">{copy("Direkter Vergleich", "Direct comparison")}</p><h2>{copy("Die entscheidenden Unterschiede", "The differences that matter")}</h2><p>{copy(`Alle Nährwerte beziehen sich auf ${first.nutrition.basis === "100ml" ? "100 ml" : "100 g"}. Ein Vorteil wird nur bei gleicher Kategorie und Bezugsbasis ausgewiesen.`, `All nutrition values refer to ${first.nutrition.basis === "100ml" ? "100 ml" : "100 g"}. An advantage is only shown when category and basis match.`)}</p></div><div className="comparison-table-wrap"><table className="comparison-table"><thead><tr><th>{copy("Kriterium", "Criterion")}</th><th>{first.name}</th><th>{second.name}</th><th>{copy("Vorteil", "Advantage")}</th></tr></thead><tbody>{rows.map((row) => <tr key={row.label}><th>{row.label}</th><td data-label={first.name}>{row.first ?? copy("Keine Angabe", "Not available")}{typeof row.first === "number" ? row.unit : ""}</td><td data-label={second.name}>{row.second ?? copy("Keine Angabe", "Not available")}{typeof row.second === "number" ? row.unit : ""}</td><td data-label={copy("Vorteil", "Advantage")}>{row.winner?.name ?? copy("Kein klarer Vorteil", "No clear advantage")}</td></tr>)}</tbody></table></div><p className="small-note">{copy("Prüfe Allergene und Rezeptur immer auf der aktuellen Verpackung.", "Always verify allergens and ingredients on the current package.")}</p></section>
    <section className="section compare-faq"><div className="section-heading"><p className="eyebrow">{copy("Häufige Fragen", "Common questions")}</p><h2>{copy("Die wichtigsten Antworten auf einen Blick", "Key answers at a glance")}</h2></div><div className="faq-list">{faq.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></section>
    {relatedComparisons.length ? <section className="section section-soft related-comparisons"><div className="section-heading split-heading"><div><p className="eyebrow">{copy("Weitere Vergleiche", "More comparisons")}</p><h2>{copy(`Weitere Produkte aus ${first.categoryLabel} vergleichen`, `Compare more ${first.categoryLabel} products`)}</h2></div><Link href={`${path("/compare")}?category=${first.category}`}>{copy("Alle Vergleiche dieser Kategorie", "All comparisons in this category")}</Link></div><div className="related-link-grid">{relatedComparisons.map((item) => <Link href={path(`/compare/${item.pair}`)} key={item.pair}><strong>{item.first.name} {copy("oder", "or")} {item.second.name}</strong><span>{copy("Vergleich öffnen", "Open comparison")}</span></Link>)}</div></section> : null}
  </main>;
}
