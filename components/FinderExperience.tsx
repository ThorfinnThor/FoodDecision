"use client";

import { useEffect, useMemo, useState } from "react";
import { PREFERENCES_KEY, trackEvent } from "@/lib/client-state";
import { productMatch, productMatchesCriteria, type FinderCriteria } from "@/lib/product-insights";
import type { Category, Product, ScoreType } from "@/lib/types";
import { ProductCard } from "./ProductCard";

const goals: Array<{ value: ScoreType; label: string; description: string }> = [
  { value: "overall_match", label: "Beste Gesamtwahl", description: "Ausgewogene Bewertung über alle verfügbaren Kriterien." },
  { value: "protein", label: "Proteinreich", description: "Mehr Protein im Kontext der jeweiligen Kategorie." },
  { value: "low_sugar", label: "Wenig Zucker", description: "Niedriger Zuckerwert im Vergleich zu ähnlichen Produkten." },
  { value: "ingredient_quality", label: "Gute Zutaten", description: "Kürzere, nachvollziehbare Zutatenlisten bevorzugen." },
  { value: "family", label: "Für Familien", description: "Konservative Bewertung aus Zucker, Zutaten und Salz." },
  { value: "vegan", label: "Vegan", description: "Vegane Kennzeichnung und bekannte Allergene berücksichtigen." },
];

const allergenChoices = ["Milch", "Gluten", "Soja", "Eier", "Erdnüsse", "Mandeln", "Haselnüsse"];

function defaultCriteria(initialGoal: ScoreType, initialQuery: string): FinderCriteria {
  return {
    category: "all",
    goal: initialGoal,
    veganOnly: initialGoal === "vegan",
    additiveFree: false,
    sweetenerFree: false,
    palmOilFree: false,
    excludedAllergens: [],
    maxSugar: null,
    minProtein: null,
    maxCalories: null,
    includeIngredient: "",
    excludeIngredient: "",
    minimumConfidence: "any",
    query: initialQuery,
  };
}

export function FinderExperience({
  categories,
  initialGoal,
  initialQuery,
  products,
}: {
  categories: Category[];
  initialGoal: ScoreType;
  initialQuery: string;
  products: Product[];
}) {
  const [step, setStep] = useState(0);
  const [criteria, setCriteria] = useState<FinderCriteria>(() => defaultCriteria(initialGoal, initialQuery));
  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? "{}") as Partial<FinderCriteria>;
        setCriteria((current) => ({
          ...current,
          ...stored,
          goal: initialGoal !== "overall_match" ? initialGoal : stored.goal ?? current.goal,
          query: initialQuery || stored.query || "",
        }));
      } catch {
        // Invalid local preferences are ignored and replaced on the next save.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialGoal, initialQuery]);

  const results = useMemo(
    () => products
      .filter((product) => productMatchesCriteria(product, criteria))
      .map((product) => ({ product, match: productMatch(product, criteria) }))
      .sort((a, b) => b.match.score - a.match.score || a.product.name.localeCompare(b.product.name, "de")),
    [criteria, products],
  );

  const steps = ["Produktgruppe", "Priorität", "Feinfilter", "Ergebnisse"];
  const update = <K extends keyof FinderCriteria>(key: K, value: FinderCriteria[K]) => {
    setCriteria((current) => ({ ...current, [key]: value }));
    setVisibleCount(24);
  };

  function toggleAllergen(allergen: string) {
    update(
      "excludedAllergens",
      criteria.excludedAllergens.includes(allergen)
        ? criteria.excludedAllergens.filter((item) => item !== allergen)
        : [...criteria.excludedAllergens, allergen],
    );
  }

  function showResults() {
    setStep(3);
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(criteria));
    const url = new URL(window.location.href);
    url.searchParams.set("goal", criteria.goal);
    if (criteria.category === "all") url.searchParams.delete("category");
    else url.searchParams.set("category", criteria.category);
    window.history.replaceState({}, "", url);
    trackEvent("finder_completed", {
      entityType: "finder",
      metadata: { goal: criteria.goal, category: criteria.category, resultCount: results.length },
    });
  }

  return (
    <section className="finder-experience">
      <ol className="finder-progress" aria-label="Finder Fortschritt">
        {steps.map((label, index) => (
          <li aria-current={step === index ? "step" : undefined} className={step >= index ? "is-active" : ""} key={label}>
            <span>{index + 1}</span>{label}
          </li>
        ))}
      </ol>

      <div className="finder-stage">
        {step === 0 ? (
          <div className="finder-step">
            <div className="finder-step-heading"><span>Schritt 1 von 3</span><h2>Was suchst du?</h2><p>Wähle eine Produktgruppe oder vergleiche den gesamten Katalog.</p></div>
            <div className="choice-grid category-choice-grid" role="radiogroup" aria-label="Produktkategorie">
              <button aria-pressed={criteria.category === "all"} onClick={() => update("category", "all")} type="button"><strong>Alle Produkte</strong><span>{products.length} bewertete Produkte</span></button>
              {categories.map((item) => {
                const count = products.filter((product) => product.category === item.slug).length;
                return <button aria-pressed={criteria.category === item.slug} key={item.slug} onClick={() => update("category", item.slug)} type="button"><strong>{item.label}</strong><span>{count ? `${count} ${count === 1 ? "Produkt" : "Produkte"}` : "Nach nächstem Import verfügbar"}</span></button>;
              })}
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="finder-step">
            <div className="finder-step-heading"><span>Schritt 2 von 3</span><h2>Was ist dir am wichtigsten?</h2><p>Diese Priorität hat den größten Einfluss auf deinen Match-Score.</p></div>
            <div className="choice-grid" role="radiogroup" aria-label="Priorität">
              {goals.map((item) => (
                <button aria-pressed={criteria.goal === item.value} key={item.value} onClick={() => {
                  update("goal", item.value);
                  if (item.value === "vegan") update("veganOnly", true);
                }} type="button"><strong>{item.label}</strong><span>{item.description}</span></button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="finder-step">
            <div className="finder-step-heading"><span>Schritt 3 von 3</span><h2>Grenzen und Ausschlüsse</h2><p>Alle Filter sind optional. Fehlende Produktwerte gelten bei aktiven Grenzwerten nicht als passend.</p></div>

            <div className="advanced-filter-grid">
              <fieldset className="filter-panel"><legend>Ernährung und Zutaten</legend>
                <label className="toggle-row"><input checked={criteria.veganOnly} onChange={(event) => update("veganOnly", event.target.checked)} type="checkbox" /><span><strong>Nur vegan</strong><small>Labels und bekannte Allergene</small></span></label>
                <label className="toggle-row"><input checked={criteria.additiveFree} onChange={(event) => update("additiveFree", event.target.checked)} type="checkbox" /><span><strong>Ohne typische Zusatzstoffe</strong><small>Aromen, Emulgatoren, Farb- und Konservierungsstoffe</small></span></label>
                <label className="toggle-row"><input checked={criteria.sweetenerFree} onChange={(event) => update("sweetenerFree", event.target.checked)} type="checkbox" /><span><strong>Ohne Süßungsmittel</strong><small>Zum Beispiel Erythrit, Stevia oder Sucralose</small></span></label>
                <label className="toggle-row"><input checked={criteria.palmOilFree} onChange={(event) => update("palmOilFree", event.target.checked)} type="checkbox" /><span><strong>Ohne Palmöl</strong><small>Auf Basis der vorhandenen Zutatenliste</small></span></label>
              </fieldset>

              <fieldset className="filter-panel"><legend>Allergene ausschließen</legend>
                <div className="check-chip-grid">
                  {allergenChoices.map((allergen) => <label key={allergen}><input checked={criteria.excludedAllergens.includes(allergen)} onChange={() => toggleAllergen(allergen)} type="checkbox" /><span>{allergen}</span></label>)}
                </div>
                <p className="filter-disclaimer">Bei Allergien gilt immer die aktuelle Verpackungsangabe.</p>
              </fieldset>

              <fieldset className="filter-panel"><legend>Nährwertgrenzen pro 100 g/ml</legend>
                <label className="number-filter"><span>Maximaler Zucker</span><input min="0" onChange={(event) => update("maxSugar", event.target.value === "" ? null : Number(event.target.value))} placeholder="keine Grenze" step="0.5" type="number" value={criteria.maxSugar ?? ""} /><small>Gramm</small></label>
                <label className="number-filter"><span>Mindestprotein</span><input min="0" onChange={(event) => update("minProtein", event.target.value === "" ? null : Number(event.target.value))} placeholder="keine Grenze" step="0.5" type="number" value={criteria.minProtein ?? ""} /><small>Gramm</small></label>
                <label className="number-filter"><span>Maximale Kalorien</span><input min="0" onChange={(event) => update("maxCalories", event.target.value === "" ? null : Number(event.target.value))} placeholder="keine Grenze" step="10" type="number" value={criteria.maxCalories ?? ""} /><small>kcal</small></label>
              </fieldset>

              <fieldset className="filter-panel"><legend>Suche und Datenqualität</legend>
                <label className="stacked-field"><span>Produkt, Marke oder Zutat suchen</span><input onChange={(event) => update("query", event.target.value)} placeholder="z. B. Hafer oder Mandel" type="search" value={criteria.query} /></label>
                <label className="stacked-field"><span>Zutat muss enthalten sein</span><input onChange={(event) => update("includeIngredient", event.target.value)} placeholder="z. B. Leinsamen" type="text" value={criteria.includeIngredient} /></label>
                <label className="stacked-field"><span>Zutat ausschließen</span><input onChange={(event) => update("excludeIngredient", event.target.value)} placeholder="z. B. Kokos" type="text" value={criteria.excludeIngredient} /></label>
                <label className="stacked-field"><span>Mindestsicherheit des Ziel-Scores</span><select onChange={(event) => update("minimumConfidence", event.target.value as FinderCriteria["minimumConfidence"])} value={criteria.minimumConfidence}><option value="any">Alle Datenlagen</option><option value="medium">Mindestens mittel</option><option value="high">Nur hoch</option></select></label>
              </fieldset>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="finder-step finder-results-step">
            <div className="finder-results-toolbar">
              <div className="finder-step-heading"><span>{results.length} {results.length === 1 ? "passendes Produkt" : "passende Produkte"}</span><h2>Deine Auswahl</h2><p>Der Match-Score kombiniert deine Priorität, aktive Filter, Gesamturteil und Datenvollständigkeit.</p></div>
              <button className="secondary-command" onClick={() => setStep(2)} type="button">Filter anpassen</button>
            </div>
            {results.length ? (
              <>
                <div className="product-grid">{results.slice(0, visibleCount).map(({ product, match }) => <ProductCard key={product.id} matchReasons={match.reasons} matchScore={match.score} product={product} />)}</div>
                {visibleCount < results.length ? <button className="load-more-button" onClick={() => setVisibleCount((count) => count + 24)} type="button">Weitere Produkte laden</button> : null}
              </>
            ) : <div className="empty-state"><h3>Keine passende Kombination gefunden</h3><p>Lockere einen Grenzwert oder entferne einen Ausschluss. Unbekannte Werte werden bei aktiven Grenzen bewusst nicht als passend behandelt.</p><button onClick={() => setCriteria(defaultCriteria(criteria.goal, ""))} type="button">Filter zurücksetzen</button></div>}
          </div>
        ) : null}

        {step < 3 ? <div className="finder-controls">
          <button disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))} type="button">Zurück</button>
          <button className="primary-button" onClick={() => step === 2 ? showResults() : setStep((value) => Math.min(3, value + 1))} type="button">{step === 2 ? `Ergebnisse anzeigen (${results.length})` : "Weiter"}</button>
        </div> : null}
      </div>
    </section>
  );
}
