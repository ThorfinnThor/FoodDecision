"use client";

import { useState } from "react";
import { pick } from "@/lib/i18n";
import { scoreByType } from "@/lib/scoring";
import type { Product, ScoreType } from "@/lib/types";
import { FavoriteButton } from "./FavoriteButton";
import { ShoppingListButton } from "./ShoppingListButton";

const goals: ScoreType[] = ["overall_match", "low_sugar", "protein", "ingredient_quality", "family"];

function goalLabel(goal: ScoreType, locale: Product["locale"]) {
  const labels: Record<ScoreType, [string, string]> = {
    nutrition: ["Nährwerte", "Nutrition"],
    ingredient_quality: ["Zutaten", "Ingredients"],
    protein: ["Protein", "Protein"],
    low_sugar: ["Wenig Zucker", "Lower sugar"],
    family: ["Familie", "Family fit"],
    vegan: ["Vegan", "Vegan"],
    overall_match: ["Gesamtwahl", "Overall"],
  };
  return labels[goal][locale === "de-DE" ? 0 : 1];
}

export function ComparisonDecision({ first, second }: { first: Product; second: Product }) {
  const locale = first.locale;
  const [goal, setGoal] = useState<ScoreType>("overall_match");
  const firstScore = scoreByType(first, goal);
  const secondScore = scoreByType(second, goal);
  const comparable = first.category === second.category && first.nutrition.basis === second.nutrition.basis;
  const tied = firstScore?.score !== null && firstScore?.score === secondScore?.score;
  const winner = !comparable || tied || firstScore?.score === null || secondScore?.score === null || firstScore === undefined || secondScore === undefined
    ? null
    : (firstScore.score ?? 0) > (secondScore.score ?? 0) ? { product: first, score: firstScore, other: secondScore } : { product: second, score: secondScore, other: firstScore };
  const advantage = winner ? Math.abs((winner.score.score ?? 0) - (winner.other.score ?? 0)) : 0;

  return (
    <section className="detail-section compare-summary-section">
      <div className="section-heading">
        <p className="eyebrow">{pick(locale, "Entscheidung nach deinem Ziel", "Decision by your goal")}</p>
        <h2>{pick(locale, "Was ist dir bei diesem Vergleich wichtig?", "What matters in this comparison?")}</h2>
      </div>
      <div className="comparison-goal-picker" role="group" aria-label={pick(locale, "Vergleichsziel", "Comparison goal")}>
        {goals.map((item) => <button aria-pressed={goal === item} key={item} onClick={() => setGoal(item)} type="button">{goalLabel(item, locale)}</button>)}
      </div>
      <div className="compare-summary-grid">
        <article><span>{pick(locale, "Ziel", "Goal")}</span><strong>{goalLabel(goal, locale)}</strong><p>{pick(locale, "Beide Produkte werden mit derselben kategoriespezifischen Regel bewertet.", "Both products use the same category-specific scoring rule.")}</p></article>
        <article><span>{pick(locale, "Stärkere Wahl", "Stronger choice")}</span><strong>{winner?.product.name ?? pick(locale, "Kein fairer Gewinner", "No fair winner")}</strong><p>{winner ? (winner.score.positives[0] ?? pick(locale, "Höherer Ziel-Score im direkten Vergleich.", "Higher goal score in this comparison.")) : pick(locale, "Gleichstand, fehlende Werte oder unterschiedliche Kategorien.", "The scores are tied, incomplete, or from different categories.")}</p></article>
        <article><span>{pick(locale, "Abstand", "Difference")}</span><strong>{winner ? `${advantage} ${pick(locale, "Punkte", "points")}` : "-"}</strong><p>{winner ? pick(locale, `${winner.score.score}/100 bei ${winner.score.confidence === "high" ? "hoher" : winner.score.confidence === "medium" ? "mittlerer" : "niedriger"} Datensicherheit.`, `${winner.score.score}/100 with ${winner.score.confidence} data confidence.`) : pick(locale, "Ohne belastbare Differenz wird keine Empfehlung erzwungen.", "No recommendation is forced without a reliable difference.")}</p></article>
      </div>
      {winner ? (
        <div className="comparison-next-step">
          <div>
            <span>{pick(locale, "Nächster Schritt", "Next step")}</span>
            <strong>{winner.product.name}</strong>
            <p>{pick(locale, "Speichere die stärkere Wahl oder setze sie direkt auf deine Einkaufsliste.", "Save the stronger choice or add it directly to your shopping list.")}</p>
          </div>
          <div className="save-actions">
            <FavoriteButton locale={locale} productName={winner.product.name} productSlug={winner.product.slug} />
            <ShoppingListButton locale={locale} productName={winner.product.name} productSlug={winner.product.slug} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
