import type { Metadata } from "next";
import { FinderExperience } from "@/components/FinderExperience";
import { SiteHeader } from "@/components/SiteHeader";
import { finderResults, getCategories } from "@/lib/static-data";
import type { ScoreType } from "@/lib/types";

export const metadata: Metadata = {
  title: "Produkt-Finder - Food Decision Engine",
  description: "Finde Lebensmittel nach Kategorie, Ziel und Ausschlusskriterien - ohne Registrierung.",
};

const validGoals = new Set<ScoreType>(["overall_match", "protein", "low_sugar", "vegan", "family", "ingredient_quality"]);

type Props = {
  searchParams: Promise<{ goal?: string; q?: string }>;
};

export default async function FinderPage({ searchParams }: Props) {
  const params = await searchParams;
  const goal = validGoals.has(params.goal as ScoreType) ? (params.goal as ScoreType) : "overall_match";

  return (
    <main>
      <SiteHeader />
      <section className="subpage-hero finder-hero">
        <p className="eyebrow">Produkt-Finder</p>
        <h1>Was passt zu deinem Alltag?</h1>
        <p>Wähle, was dir wichtig ist. Du bekommst bereits nach wenigen Angaben eine nachvollziehbare Auswahl - ohne Registrierung.</p>
      </section>
      <FinderExperience categories={getCategories()} initialGoal={goal} initialQuery={params.q ?? ""} products={finderResults()} />
    </main>
  );
}
