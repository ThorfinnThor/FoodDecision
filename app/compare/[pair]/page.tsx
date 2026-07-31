import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductVisual } from "@/components/ProductVisual";
import { SiteHeader } from "@/components/SiteHeader";
import { comparisonPairs, getProduct } from "@/lib/static-data";
import { scoreByType } from "@/lib/scoring";
import type { Product } from "@/lib/types";

type Props = {
  params: Promise<{ pair: string }>;
};

function splitPair(pair: string): [string, string] | null {
  const parts = pair.split("-vs-");
  if (parts.length !== 2) return null;
  return [parts[0], parts[1]];
}

export function generateStaticParams() {
  return comparisonPairs.map((pair) => ({ pair }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pair } = await params;
  const slugs = splitPair(pair);
  if (!slugs) return {};
  const a = getProduct(slugs[0]);
  const b = getProduct(slugs[1]);
  if (!a || !b) return {};

  return {
    title: `${a.name} vs. ${b.name} - Food Decision Engine`,
    description: `Vergleich von ${a.name} und ${b.name} mit Scores, Naehrwerten und Datenqualitaet.`,
  };
}

function winner(a: Product, b: Product, scoreType: "overall_match" | "low_sugar" | "protein") {
  const scoreA = scoreByType(a, scoreType)?.score ?? -1;
  const scoreB = scoreByType(b, scoreType)?.score ?? -1;
  if (scoreA === scoreB) return "Unentschieden";
  return scoreA > scoreB ? a.name : b.name;
}

export default async function ComparePage({ params }: Props) {
  const { pair } = await params;
  const slugs = splitPair(pair);
  if (!slugs) notFound();

  const a = getProduct(slugs[0]);
  const b = getProduct(slugs[1]);
  if (!a || !b) notFound();

  const rows = [
    ["Overall Match", scoreByType(a, "overall_match")?.score, scoreByType(b, "overall_match")?.score, winner(a, b, "overall_match")],
    ["Low Sugar", scoreByType(a, "low_sugar")?.score, scoreByType(b, "low_sugar")?.score, winner(a, b, "low_sugar")],
    ["Protein", scoreByType(a, "protein")?.score, scoreByType(b, "protein")?.score, winner(a, b, "protein")],
    ["Zucker", a.nutrition.sugar, b.nutrition.sugar, (a.nutrition.sugar ?? 999) < (b.nutrition.sugar ?? 999) ? a.name : b.name],
    ["Eiweiss", a.nutrition.protein, b.nutrition.protein, (a.nutrition.protein ?? -1) > (b.nutrition.protein ?? -1) ? a.name : b.name],
  ];

  return (
    <main>
      <SiteHeader />
      <section className="compare-hero">
        <div>
          <ProductVisual product={a} compact />
          <h1>{a.name}</h1>
        </div>
        <span className="vs-mark">vs</span>
        <div>
          <ProductVisual product={b} compact />
          <h1>{b.name}</h1>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Entscheidungshilfe</p>
          <h2>Gewinner pro Kriterium</h2>
        </div>
        <div className="comparison-table">
          {rows.map(([label, valueA, valueB, result]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{valueA ?? "?"}</strong>
              <strong>{valueB ?? "?"}</strong>
              <em>{result}</em>
            </div>
          ))}
        </div>
        <div className="hero-actions">
          <Link href={`/product/${a.slug}`}>{a.name} ansehen</Link>
          <Link href={`/product/${b.slug}`}>{b.name} ansehen</Link>
        </div>
      </section>
    </main>
  );
}
