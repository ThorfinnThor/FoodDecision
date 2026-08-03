import type { Metadata } from "next";
import { ComparisonBuilder } from "@/components/ComparisonBuilder";
import { SiteHeader } from "@/components/SiteHeader";
import { finderResults, getCategories } from "@/lib/static-data";

export const metadata: Metadata = {
  title: "Produkte vergleichen - Food Decision Engine",
  description: "Wähle zwei Lebensmittel und vergleiche Scores, Nährwerte, Zutaten und Datenqualität direkt.",
  alternates: { canonical: "/compare" },
  robots: { index: false, follow: true },
};

type Props = { searchParams: Promise<{ first?: string }> };

export default async function CompareBuilderPage({ searchParams }: Props) {
  const { first = "" } = await searchParams;
  return (
    <main>
      <SiteHeader />
      <section className="subpage-hero compact-subpage-hero"><p className="eyebrow">Direktvergleich</p><h1>Zwei Produkte, alle relevanten Unterschiede</h1><p>Wähle zwei Produkte. Wir zeigen Gewinner pro Kriterium, Datenlücken und eine nachvollziehbare Einordnung.</p></section>
      <section className="section"><ComparisonBuilder categories={getCategories()} initialFirst={first} products={finderResults()} /></section>
    </main>
  );
}
