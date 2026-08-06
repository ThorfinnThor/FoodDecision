"use client";

import { useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/client-state";
import { categoryRouteSlug, localizedPath, pick } from "@/lib/i18n";
import type { AlternativeGoal, AlternativeRecommendation } from "@/lib/product-insights";
import { alternativeGoalOrder } from "@/lib/product-insights";
import type { Product } from "@/lib/types";
import { ProductVisual } from "./ProductVisual";

const goalLabels: Record<AlternativeGoal, [string, string]> = {
  overall_match: ["Beste Gesamtwahl", "Best overall"],
  low_sugar: ["Weniger Zucker", "Lower sugar"],
  protein: ["Mehr Protein", "Higher protein"],
  ingredient_quality: ["Bessere Zutaten", "Simpler ingredients"],
};

function label(goal: AlternativeGoal, product: Product) {
  return goalLabels[goal][product.locale === "de-DE" ? 0 : 1];
}

export function AlternativeExplorer({
  current,
  recommendations,
}: {
  current: Product;
  recommendations: Record<AlternativeGoal, AlternativeRecommendation[]>;
}) {
  const [goal, setGoal] = useState<AlternativeGoal>("overall_match");
  const options = recommendations[goal];
  const primary = options[0];
  const path = (value: string) => localizedPath(current.locale, value);
  const c = (de: string, en: string) => pick(current.locale, de, en);

  function trackComparison(candidate: Product) {
    trackEvent("alternative_compared", {
      entityType: "product",
      entityId: current.slug,
      metadata: { alternative: candidate.slug, goal },
    });
  }

  return (
    <section className="detail-section alternative-explorer-section">
      <div className="section-heading">
        <p className="eyebrow">{c("Bessere Alternative", "Better alternative")}</p>
        <h2>{c("Was möchtest du konkret verbessern?", "What would you like to improve?")}</h2>
        <p>{c(
          "Wir zeigen nur Produkte derselben Kategorie und Bezugsbasis, deren Ziel-Score um mindestens drei Punkte höher ist und deren Datensicherheit nicht niedrig ist.",
          "We only show products from the same category and serving basis whose goal score is at least three points higher and whose data confidence is not low.",
        )}</p>
      </div>

      <div className="alternative-goal-picker" role="group" aria-label={c("Verbesserungsziel", "Improvement goal")}>
        {alternativeGoalOrder.map((item) => (
          <button aria-pressed={goal === item} key={item} onClick={() => setGoal(item)} type="button">
            {label(item, current)}
            <span>{recommendations[item].length}</span>
          </button>
        ))}
      </div>

      {primary ? (
        <div className="alternative-workbench">
          <div className="alternative-primary-media"><ProductVisual compact product={primary.product} /></div>
          <div className="alternative-primary-copy">
            <p className="product-meta">{primary.product.brand} · {primary.product.categoryLabel}</p>
            <h3>{primary.product.name}</h3>
            <div className="alternative-score-shift">
              <div><span>{c("Aktuell", "Current")}</span><strong>{primary.currentScore}</strong></div>
              <span aria-hidden="true">→</span>
              <div><span>{c("Alternative", "Alternative")}</span><strong>{primary.candidateScore}</strong></div>
              <b>+{primary.scoreDelta} {c("Punkte", "points")}</b>
            </div>
            <div className="alternative-evidence-grid">
              <div><h4>{c("Warum sie besser passt", "Why it fits better")}</h4><ul>{primary.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div>
              <div><h4>{c("Mögliche Kompromisse", "Possible tradeoffs")}</h4>{primary.tradeoffs.length ? <ul className="tradeoff-list">{primary.tradeoffs.map((tradeoff) => <li key={tradeoff}>{tradeoff}</li>)}</ul> : <p>{c("In den verfügbaren Kerndaten ist kein wesentlicher Nachteil erkennbar.", "No material downside is visible in the available core data.")}</p>}</div>
            </div>
            <p className="alternative-confidence">{c("Datensicherheit des Ziel-Scores", "Goal score confidence")}: <strong>{primary.confidence === "high" ? c("hoch", "high") : c("mittel", "medium")}</strong></p>
            <div className="alternative-actions">
              <Link className="button-link" href={path(`/compare/${current.slug}-vs-${primary.product.slug}`)} onClick={() => trackComparison(primary.product)}>{c("Direkt vergleichen", "Compare directly")}</Link>
              <Link className="secondary-button-link" href={path(`/product/${primary.product.slug}`)}>{c("Alternative ansehen", "View alternative")}</Link>
            </div>
          </div>
          {options.length > 1 ? <div className="alternative-more-list">
            <span>{c("Weitere Verbesserungen", "More improvements")}</span>
            {options.slice(1).map((option) => <Link href={path(`/compare/${current.slug}-vs-${option.product.slug}`)} key={option.product.slug} onClick={() => trackComparison(option.product)}><strong>{option.product.name}</strong><small>+{option.scoreDelta} {c("Punkte", "points")} · {option.reasons[0]}</small></Link>)}
          </div> : null}
        </div>
      ) : (
        <div className="alternative-empty-state">
          <strong>{c("Keine belastbar bessere Alternative bestätigt", "No reliably better alternative confirmed")}</strong>
          <p>{c(
            `Im aktuellen Katalog liegt kein anderes ${current.categoryLabel}-Produkt bei „${label(goal, current)}“ mindestens drei Punkte vorn. Das ist besser als eine erzwungene Empfehlung.`,
            `No other ${current.categoryLabel} product in the current catalog leads by at least three points for “${label(goal, current)}.” That is better than forcing a recommendation.`,
          )}</p>
          <Link className="text-link" href={path(`/category/${categoryRouteSlug(current.category, current.locale)}`)}>{c("Alle Produkte der Kategorie ansehen", "View all products in this category")} <span aria-hidden="true">→</span></Link>
        </div>
      )}
      <p className="alternative-disclaimer">{c("Bewertungen beruhen auf den derzeit verfügbaren Daten. Zutaten und Allergene immer auf der aktuellen Verpackung prüfen.", "Assessments use currently available data. Always verify ingredients and allergens on the current package.")}</p>
    </section>
  );
}
