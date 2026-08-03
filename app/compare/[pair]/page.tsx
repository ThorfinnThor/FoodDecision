import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductVisual } from "@/components/ProductVisual";
import { ScorePill } from "@/components/ScorePill";
import { SiteHeader } from "@/components/SiteHeader";
import { StructuredData } from "@/components/StructuredData";
import { ViewTracker } from "@/components/ViewTracker";
import { absoluteUrl } from "@/lib/seo";
import { comparisonPairs, getProduct } from "@/lib/static-data";
import { scoreByType } from "@/lib/scoring";
import type { Product, ScoreType } from "@/lib/types";

type Props = { params: Promise<{ pair: string }> };

function splitPair(pair: string): [string, string] | null {
  const parts = pair.split("-vs-");
  return parts.length === 2 ? [parts[0], parts[1]] : null;
}

export function generateStaticParams() {
  return comparisonPairs.map((pair) => ({ pair }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slugs = splitPair((await params).pair);
  if (!slugs) return {};
  const a = getProduct(slugs[0]);
  const b = getProduct(slugs[1]);
  if (!a || !b) return {};
  const path = `/compare/${a.slug}-vs-${b.slug}`;
  return {
    title: `${a.name} vs. ${b.name} - Vergleich`,
    description: `Vergleich von ${a.name} und ${b.name}: Scores, Zucker, Protein, Zutaten und Datenqualität.`,
    alternates: { canonical: path },
    robots: { index: false, follow: true },
  };
}

function score(product: Product, type: ScoreType) {
  return scoreByType(product, type)?.score ?? null;
}

function winner(a: Product, b: Product, type: ScoreType, lowerIsBetter = false) {
  const valueA = score(a, type);
  const valueB = score(b, type);
  if (valueA === null || valueB === null || valueA === valueB) return null;
  return lowerIsBetter ? (valueA < valueB ? a : b) : valueA > valueB ? a : b;
}

export default async function ComparePage({ params }: Props) {
  const slugs = splitPair((await params).pair);
  if (!slugs) notFound();
  const a = getProduct(slugs[0]);
  const b = getProduct(slugs[1]);
  if (!a || !b) notFound();

  const overallA = scoreByType(a, "overall_match");
  const overallB = scoreByType(b, "overall_match");
  const comparableCategory = a.category === b.category;
  const comparableNutrition = comparableCategory && a.nutrition.basis === b.nutrition.basis;
  const overallWinner = comparableCategory ? winner(a, b, "overall_match") : null;
  const lowSugarWinner = comparableNutrition && (a.nutrition.sugar ?? Infinity) !== (b.nutrition.sugar ?? Infinity)
    ? (a.nutrition.sugar ?? Infinity) < (b.nutrition.sugar ?? Infinity) ? a : b
    : null;
  const proteinWinner = comparableNutrition && (a.nutrition.protein ?? -1) !== (b.nutrition.protein ?? -1)
    ? (a.nutrition.protein ?? -1) > (b.nutrition.protein ?? -1) ? a : b
    : null;

  const rows = [
    { label: "Gesamturteil", a: score(a, "overall_match"), b: score(b, "overall_match"), unit: "/100", winner: overallWinner },
    { label: "Zucker-Score", a: score(a, "low_sugar"), b: score(b, "low_sugar"), unit: "/100", winner: comparableCategory ? winner(a, b, "low_sugar") : null },
    { label: "Protein-Score", a: score(a, "protein"), b: score(b, "protein"), unit: "/100", winner: comparableCategory ? winner(a, b, "protein") : null },
    { label: a.nutrition.basis === b.nutrition.basis ? `Zucker pro ${a.nutrition.basis}` : `Zucker (${a.nutrition.basis} / ${b.nutrition.basis})`, a: a.nutrition.sugar, b: b.nutrition.sugar, unit: " g", winner: lowSugarWinner },
    { label: a.nutrition.basis === b.nutrition.basis ? `Protein pro ${a.nutrition.basis}` : `Protein (${a.nutrition.basis} / ${b.nutrition.basis})`, a: a.nutrition.protein, b: b.nutrition.protein, unit: " g", winner: proteinWinner },
    { label: "Bekannte Allergene", a: a.allergens.join(", ") || "Keine bestätigt", b: b.allergens.join(", ") || "Keine bestätigt", unit: "", winner: null },
  ];

  return (
    <main>
      <ViewTracker entityId={`${a.slug}-vs-${b.slug}`} entityType="comparison" eventName="comparison_opened" />
      <StructuredData data={{
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `${a.name} und ${b.name} im Vergleich`,
        url: absoluteUrl(`/compare/${a.slug}-vs-${b.slug}`),
        numberOfItems: 2,
        itemListElement: [a, b].map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: product.name,
          url: absoluteUrl(`/product/${product.slug}`),
        })),
      }} />
      <SiteHeader />
      <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Start</Link><span aria-hidden="true">/</span><span aria-current="page">Vergleich</span></nav>
      <section className="compare-intro"><p className="eyebrow">Produktvergleich</p><h1>{a.name} oder {b.name}?</h1><p>Die wichtigsten Unterschiede zuerst - mit klarer Einordnung für deinen Bedarf.</p></section>

      {!comparableCategory ? <div className="comparison-context-note" role="note"><strong>Unterschiedliche Produktgruppen</strong><span>Scores werden innerhalb einer Kategorie berechnet. Deshalb zeigen wir hier die Werte nebeneinander, küren aber keinen Gesamtsieger.</span></div> : null}

      <section className="compare-products">
        {[a, b].map((product, index) => {
          const overall = index === 0 ? overallA : overallB;
          return (
            <article className={overallWinner?.id === product.id ? "compare-product is-winner" : "compare-product"} key={product.id}>
              {overallWinner?.id === product.id ? <span className="winner-label">Stärkere Gesamtwahl</span> : null}
              <ProductVisual product={product} compact />
              <p className="product-meta">{product.brand} · {product.categoryLabel}</p>
              <h2>{product.name}</h2>
              {overall ? <ScorePill score={overall} /> : null}
              <Link className="text-link" href={`/product/${product.slug}`}>Produktdetails <span aria-hidden="true">→</span></Link>
            </article>
          );
        })}
      </section>

      <section className="section compare-summary-section">
        <div className="section-heading"><p className="eyebrow">Beste Wahl für …</p><h2>Welches Produkt passt besser?</h2></div>
        <div className="compare-summary-grid">
          <article><span>Gesamt</span><strong>{comparableCategory ? overallWinner?.name ?? "Gleichstand" : "Nicht direkt vergleichbar"}</strong><p>{comparableCategory ? "Stärkstes Gesamturteil innerhalb derselben Produktgruppe." : "Die Gesamturteile verwenden unterschiedliche Kategorieprofile."}</p></article>
          <article><span>Wenig Zucker</span><strong>{comparableNutrition ? lowSugarWinner?.name ?? "Gleichstand" : "Nur Wertevergleich"}</strong><p>{comparableNutrition ? "Niedrigerer ausgewiesener Zuckerwert." : "Die Werte werden ohne Sieger nebeneinandergestellt."}</p></article>
          <article><span>Mehr Protein</span><strong>{comparableNutrition ? proteinWinner?.name ?? "Gleichstand" : "Nur Wertevergleich"}</strong><p>{comparableNutrition ? "Höherer ausgewiesener Proteingehalt." : "Die Werte werden ohne Sieger nebeneinandergestellt."}</p></article>
        </div>
      </section>

      <section className="section comparison-details">
        <div className="section-heading"><p className="eyebrow">Alle Unterschiede</p><h2>Direkt nebeneinander</h2></div>
        <div className="comparison-table-wrap">
          <table className="comparison-table">
            <thead><tr><th>Kriterium</th><th>{a.name}</th><th>{b.name}</th><th>Vorteil</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{row.a ?? "Keine Angabe"}{typeof row.a === "number" ? row.unit : ""}</td>
                  <td>{row.b ?? "Keine Angabe"}{typeof row.b === "number" ? row.unit : ""}</td>
                  <td>{row.winner?.name ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small-note">Allergen- und Rezepturangaben können unvollständig sein. Prüfe vor dem Kauf immer die Verpackung.</p>
      </section>
    </main>
  );
}
