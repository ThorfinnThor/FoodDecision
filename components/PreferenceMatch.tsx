"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  assessProductCriteria,
  finderCriteriaFromStored,
  finderCriteriaToSearchParams,
  productMatch,
  type FinderCriteria,
} from "@/lib/product-insights";
import { localizedPath, pick } from "@/lib/i18n";
import { PREFERENCES_KEY } from "@/lib/storage-keys";
import type { Product, ScoreType } from "@/lib/types";

const goalLabels: Record<ScoreType, [string, string]> = {
  nutrition: ["Ausgewogene Nährwerte", "Balanced nutrition"],
  ingredient_quality: ["Nachvollziehbare Zutaten", "Simpler ingredients"],
  protein: ["Mehr Protein", "Higher protein"],
  low_sugar: ["Weniger Zucker", "Lower sugar"],
  family: ["Für Familien", "Family-friendly"],
  vegan: ["Vegan", "Vegan"],
  overall_match: ["Beste Gesamtwahl", "Best overall"],
};

type PreferenceState = {
  ready: boolean;
  criteria: FinderCriteria | null;
};

function personalCriteria(criteria: FinderCriteria): FinderCriteria {
  return { ...criteria, category: "all", query: "" };
}

function specificCriteriaCount(criteria: FinderCriteria) {
  return [
    criteria.veganOnly,
    criteria.additiveFree,
    criteria.sweetenerFree,
    criteria.palmOilFree,
    criteria.maxSugar !== null,
    criteria.minProtein !== null,
    criteria.maxCalories !== null,
    Boolean(criteria.includeIngredient),
    Boolean(criteria.excludeIngredient),
    criteria.minimumConfidence !== "any",
  ].filter(Boolean).length + criteria.excludedAllergens.length;
}

export function PreferenceMatch({ product }: { product: Product }) {
  const [state, setState] = useState<PreferenceState>({ ready: false, criteria: null });
  const path = (value: string) => localizedPath(product.locale, value);
  const c = (de: string, en: string) => pick(product.locale, de, en);
  const storageKey = `${PREFERENCES_KEY}:${product.locale}`;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) {
        setState({ ready: true, criteria: null });
        return;
      }
      try {
        setState({ ready: true, criteria: personalCriteria(finderCriteriaFromStored(JSON.parse(stored), [])) });
      } catch {
        setState({ ready: true, criteria: null });
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  const result = useMemo(() => {
    if (!state.criteria) return null;
    return {
      assessment: assessProductCriteria(product, state.criteria),
      criteriaCount: specificCriteriaCount(state.criteria),
      match: productMatch(product, state.criteria),
    };
  }, [product, state.criteria]);

  const finderHref = state.criteria
    ? `${path("/finder")}?${finderCriteriaToSearchParams(state.criteria).toString()}`
    : path("/finder");

  return (
    <section className="detail-section preference-match-section" aria-labelledby="preference-match-title">
      <div className="section-heading">
        <p className="eyebrow">{c("Dein persönlicher Check", "Your personal check")}</p>
        <h2 id="preference-match-title">{c("Passt dieses Produkt zu deinen Kriterien?", "Does this product fit your criteria?")}</h2>
      </div>

      {!state.ready ? (
        <div className="preference-match-panel is-loading" aria-busy="true">
          <p>{c("Persönliche Kriterien werden geladen.", "Loading your personal criteria.")}</p>
        </div>
      ) : !result || !state.criteria ? (
        <div className="preference-match-panel preference-match-empty">
          <div>
            <strong>{c("Noch keine Kriterien gespeichert", "No criteria saved yet")}</strong>
            <p>{c("Lege Ziel, Nährwertgrenzen und Ausschlüsse fest, um dieses Produkt persönlich einzuordnen.", "Set a goal, nutrition limits, and exclusions to assess this product for your needs.")}</p>
          </div>
          <div className="preference-match-actions">
            <Link className="button-link" href={finderHref}>{c("Finder starten", "Start Finder")}</Link>
            <Link className="secondary-button-link" href={path("/preferences")}>{c("Standards festlegen", "Set defaults")}</Link>
          </div>
        </div>
      ) : (
        <div className={`preference-match-panel ${result.assessment.passes ? "is-match" : "is-excluded"}`}>
          <div className="preference-match-verdict">
            <span className="preference-match-status">{result.assessment.passes ? c("Passt", "Matches") : c("Passt nicht", "Doesn’t match")}</span>
            <div className="preference-match-score">
              <strong className={result.assessment.passes ? undefined : "preference-match-no"}>{result.assessment.passes ? `${result.match.score}%` : c("Nein", "No")}</strong>
              <span>{result.assessment.passes ? c("Ziel-Match", "goal match") : c("Kriterien nicht erfüllt", "criteria not met")}</span>
            </div>
            <p>{c("Priorität", "Priority")}: <strong>{goalLabels[state.criteria.goal][product.locale === "de-DE" ? 0 : 1]}</strong></p>
            <small>{result.criteriaCount ? c(`${result.criteriaCount} zusätzliche Kriterien aktiv`, `${result.criteriaCount} additional criteria active`) : c("Keine zusätzlichen Ausschlüsse aktiv", "No additional exclusions active")}</small>
          </div>

          <div className="preference-match-evidence">
            <h3>{result.assessment.passes ? c("Warum es passt", "Why it matches") : c("Warum du genauer prüfen solltest", "Why it needs review")}</h3>
            <ul>
              {(result.assessment.passes ? result.match.reasons : result.assessment.failures).slice(0, 4).map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
            <p className="filter-disclaimer">{c("Bei Allergien und Rezepturänderungen gilt immer die aktuelle Verpackungsangabe.", "For allergies and recipe changes, always rely on the current package label.")}</p>
            <div className="preference-match-actions">
              <Link className="button-link" href={finderHref}>{c("Kriterien im Finder anpassen", "Adjust criteria in Finder")}</Link>
              <Link className="secondary-button-link" href={path("/preferences")}>{c("Standards bearbeiten", "Edit defaults")}</Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
