"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FINDER_STATE_KEY, PREFERENCES_KEY, trackEvent } from "@/lib/client-state";
import { readBrowserJson, writeBrowserJson } from "@/lib/browser-storage";
import { defaultFinderCriteria, finderCriteriaFromStored, finderCriteriaToSearchParams, optionalBoundedNumber, productMatch, productMatchesCriteria, type FinderCriteria } from "@/lib/product-insights";
import { pick } from "@/lib/i18n";
import { allergenLabel, allergenOptions, type AllergenId } from "@/lib/allergens";
import type { Category, Product, ScoreType, SiteLocale } from "@/lib/types";
import { ProductCard } from "./ProductCard";

const goals: Array<{ value: ScoreType; label: string; description: string }> = [
  { value: "overall_match", label: "Beste Gesamtwahl", description: "Ausgewogene Bewertung über alle verfügbaren Kriterien." },
  { value: "protein", label: "Proteinreich", description: "Mehr Protein im Kontext der jeweiligen Kategorie." },
  { value: "low_sugar", label: "Wenig Zucker", description: "Niedriger Zuckerwert im Vergleich zu ähnlichen Produkten." },
  { value: "ingredient_quality", label: "Gute Zutaten", description: "Kürzere, nachvollziehbare Zutatenlisten bevorzugen." },
  { value: "family", label: "Für Familien", description: "Konservative Bewertung aus Zucker, Zutaten und Salz." },
  { value: "vegan", label: "Vegan", description: "Vegane Kennzeichnung und bekannte Allergene berücksichtigen." },
];

export function FinderExperience({
  categories,
  initialCriteria,
  products,
  locale,
  showResultsInitially,
}: {
  categories: Category[];
  initialCriteria: FinderCriteria;
  products: Product[];
  locale: SiteLocale;
  showResultsInitially: boolean;
}) {
  const [step, setStep] = useState(showResultsInitially ? 3 : 0);
  const [criteria, setCriteria] = useState<FinderCriteria>(initialCriteria);
  const [visibleCount, setVisibleCount] = useState(24);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [hasInteracted, setHasInteracted] = useState(false);
  const [veganFilterIsImplicit, setVeganFilterIsImplicit] = useState(initialCriteria.goal === "vegan" && initialCriteria.veganOnly);
  const stageHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusAfterStepChange = useRef(false);
  const preferencesKey = `${PREFERENCES_KEY}:${locale}`;
  const finderStateKey = `${FINDER_STATE_KEY}:${locale}`;

  useEffect(() => {
    if (showResultsInitially) return;
    const timer = window.setTimeout(() => {
      const stored = readBrowserJson("local", preferencesKey, {});
      if (!hasInteracted) setCriteria(finderCriteriaFromStored(stored, categories.map((category) => category.slug)));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [categories, hasInteracted, preferencesKey, showResultsInitially]);

  useEffect(() => {
    if (step !== 3) return;
    const search = finderCriteriaToSearchParams(criteria).toString();
    window.history.replaceState({}, "", `${window.location.pathname}${search ? `?${search}` : ""}`);
    writeBrowserJson("local", finderStateKey, criteria);
  }, [criteria, finderStateKey, step]);

  useEffect(() => {
    if (!focusAfterStepChange.current) return;
    focusAfterStepChange.current = false;
    stageHeadingRef.current?.focus();
  }, [step]);

  const results = useMemo(
    () => products
      .filter((product) => productMatchesCriteria(product, criteria))
      .map((product) => ({ product, match: productMatch(product, criteria) }))
      .sort((a, b) => b.match.score - a.match.score || a.product.name.localeCompare(b.product.name, locale)),
    [criteria, locale, products],
  );

  const steps = locale === "de-DE" ? ["Produktgruppe", "Priorität", "Feinfilter", "Ergebnisse"] : ["Category", "Priority", "Filters", "Results"];
  const localizedGoals = locale === "de-DE" ? goals : [
    { value: "overall_match" as const, label: "Best overall", description: "Balanced assessment across all available criteria." },
    { value: "protein" as const, label: "Higher protein", description: "More protein within the relevant category." },
    { value: "low_sugar" as const, label: "Lower sugar", description: "Less sugar compared with similar products." },
    { value: "ingredient_quality" as const, label: "Simpler ingredients", description: "Prefer shorter, understandable ingredient lists." },
    { value: "family" as const, label: "Suitable for families", description: "Conservative assessment of sugar, ingredients, and salt." },
    { value: "vegan" as const, label: "Vegan", description: "Consider vegan labels and known allergens." },
  ];
  const update = <K extends keyof FinderCriteria>(key: K, value: FinderCriteria[K]) => {
    setHasInteracted(true);
    setCriteria((current) => ({ ...current, [key]: value }));
    setVisibleCount(24);
  };
  const activeFilters: Array<{ key: string; label: string; clear: () => void }> = [];
  const selectedCategory = categories.find((item) => item.slug === criteria.category);
  const selectedGoal = localizedGoals.find((item) => item.value === criteria.goal);
  if (criteria.goal !== "overall_match") activeFilters.push({ key: "goal", label: selectedGoal?.label ?? criteria.goal, clear: () => selectGoal("overall_match") });
  if (selectedCategory) activeFilters.push({ key: "category", label: selectedCategory.label, clear: () => update("category", "all") });
  if (criteria.veganOnly) activeFilters.push({ key: "vegan", label: pick(locale, "Nur vegan", "Vegan only"), clear: () => update("veganOnly", false) });
  if (criteria.additiveFree) activeFilters.push({ key: "additives", label: pick(locale, "Ohne Zusatzstoffe", "No common additives"), clear: () => update("additiveFree", false) });
  if (criteria.sweetenerFree) activeFilters.push({ key: "sweeteners", label: pick(locale, "Ohne Süßungsmittel", "No sweeteners"), clear: () => update("sweetenerFree", false) });
  if (criteria.palmOilFree) activeFilters.push({ key: "palm", label: pick(locale, "Ohne Palmöl", "No palm oil"), clear: () => update("palmOilFree", false) });
  criteria.excludedAllergens.forEach((allergen) => activeFilters.push({ key: `allergen-${allergen}`, label: `${pick(locale, "Ohne", "No")} ${allergenLabel(allergen, locale)}`, clear: () => toggleAllergen(allergen) }));
  if (criteria.maxSugar !== null) activeFilters.push({ key: "maxSugar", label: `${pick(locale, "Zucker max.", "Sugar max.")} ${criteria.maxSugar} g`, clear: () => update("maxSugar", null) });
  if (criteria.minProtein !== null) activeFilters.push({ key: "minProtein", label: `${pick(locale, "Protein min.", "Protein min.")} ${criteria.minProtein} g`, clear: () => update("minProtein", null) });
  if (criteria.maxCalories !== null) activeFilters.push({ key: "maxCalories", label: `${pick(locale, "Kalorien max.", "Calories max.")} ${criteria.maxCalories}`, clear: () => update("maxCalories", null) });
  if (criteria.includeIngredient) activeFilters.push({ key: "include", label: `+ ${criteria.includeIngredient}`, clear: () => update("includeIngredient", "") });
  if (criteria.excludeIngredient) activeFilters.push({ key: "exclude", label: `− ${criteria.excludeIngredient}`, clear: () => update("excludeIngredient", "") });
  if (criteria.minimumConfidence !== "any") activeFilters.push({ key: "confidence", label: `${pick(locale, "Datensicherheit", "Confidence")}: ${criteria.minimumConfidence === "high" ? pick(locale, "hoch", "high") : pick(locale, "mittel", "medium")}`, clear: () => update("minimumConfidence", "any") });
  if (criteria.query) activeFilters.push({ key: "query", label: `“${criteria.query}”`, clear: () => update("query", "") });

  function toggleAllergen(allergen: AllergenId) {
    update(
      "excludedAllergens",
      criteria.excludedAllergens.includes(allergen)
        ? criteria.excludedAllergens.filter((item) => item !== allergen)
        : [...criteria.excludedAllergens, allergen],
    );
  }

  function showResults() {
    moveToStep(3);
    trackEvent("finder_completed", {
      entityType: "finder",
      metadata: { goal: criteria.goal, category: criteria.category, resultCount: results.length },
    });
  }

  function moveToStep(nextStep: number) {
    focusAfterStepChange.current = true;
    setStep(Math.max(0, Math.min(3, nextStep)));
  }

  function selectGoal(goal: ScoreType) {
    setHasInteracted(true);
    setCriteria((current) => {
      const next = { ...current, goal };
      if (goal === "vegan") next.veganOnly = true;
      else if (veganFilterIsImplicit) next.veganOnly = false;
      return next;
    });
    setVeganFilterIsImplicit(goal === "vegan");
    setVisibleCount(24);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  return (
    <section className="finder-experience">
      <ol className="finder-progress" aria-label={pick(locale, "Finder Fortschritt", "Finder progress")}>
        {steps.map((label, index) => (
          <li aria-current={step === index ? "step" : undefined} className={step >= index ? "is-active" : ""} key={label}>
            <span>{index + 1}</span>{label}
          </li>
        ))}
      </ol>
      <p aria-live="polite" className="sr-only">{pick(locale, `Schritt ${step + 1} von 4: ${steps[step]}`, `Step ${step + 1} of 4: ${steps[step]}`)}</p>

      <div className="finder-stage">
        {step === 0 ? (
          <div className="finder-step">
            <div className="finder-step-heading"><span>{pick(locale, "Schritt 1 von 4", "Step 1 of 4")}</span><h2 ref={stageHeadingRef} tabIndex={-1}>{pick(locale, "Was suchst du?", "What are you looking for?")}</h2><p>{pick(locale, "Wähle eine Produktgruppe oder vergleiche den gesamten Katalog.", "Choose a category or compare the full catalog.")}</p></div>
            <div className="choice-grid category-choice-grid" role="group" aria-label={pick(locale, "Produktkategorie", "Product category")}>
              <button aria-pressed={criteria.category === "all"} onClick={() => update("category", "all")} type="button"><strong>{pick(locale, "Alle Produkte", "All products")}</strong><span>{products.length} {pick(locale, "bewertete Produkte", "assessed products")}</span></button>
              {categories.map((item) => {
                const count = products.filter((product) => product.category === item.slug).length;
                return <button aria-pressed={criteria.category === item.slug} key={item.slug} onClick={() => update("category", item.slug)} type="button"><strong>{item.label}</strong><span>{count} {count === 1 ? pick(locale, "Produkt", "product") : pick(locale, "Produkte", "products")}</span></button>;
              })}
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="finder-step">
            <div className="finder-step-heading"><span>{pick(locale, "Schritt 2 von 4", "Step 2 of 4")}</span><h2 ref={stageHeadingRef} tabIndex={-1}>{pick(locale, "Was ist dir am wichtigsten?", "What matters most?")}</h2><p>{pick(locale, "Diese Priorität hat den größten Einfluss auf deinen Match-Score.", "This priority has the greatest effect on your match score.")}</p></div>
            <div className="choice-grid" role="group" aria-label={pick(locale, "Priorität", "Priority")}>
              {localizedGoals.map((item) => (
                <button aria-pressed={criteria.goal === item.value} key={item.value} onClick={() => selectGoal(item.value)} type="button"><strong>{item.label}</strong><span>{item.description}</span></button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="finder-step">
            <div className="finder-step-heading"><span>{pick(locale, "Schritt 3 von 4", "Step 3 of 4")}</span><h2 ref={stageHeadingRef} tabIndex={-1}>{pick(locale, "Grenzen und Ausschlüsse", "Limits and exclusions")}</h2><p>{pick(locale, "Alle Filter sind optional. Fehlende Produktwerte gelten bei aktiven Grenzwerten nicht als passend.", "All filters are optional. Missing values do not pass active numeric limits.")}</p></div>

            <div className="advanced-filter-grid">
              <fieldset className="filter-panel"><legend>{pick(locale, "Ernährung und Zutaten", "Diet and ingredients")}</legend>
                <label className="toggle-row"><input checked={criteria.veganOnly} onChange={(event) => { setVeganFilterIsImplicit(false); update("veganOnly", event.target.checked); }} type="checkbox" /><span><strong>{pick(locale, "Nur vegan", "Vegan only")}</strong><small>{pick(locale, "Ausdrückliche Vegan Kennzeichnung und bekannte Widersprüche", "Explicit vegan labels and known conflicts")}</small></span></label>
                <label className="toggle-row"><input checked={criteria.additiveFree} onChange={(event) => update("additiveFree", event.target.checked)} type="checkbox" /><span><strong>{pick(locale, "Ohne typische Zusatzstoffe", "No common additives")}</strong><small>{pick(locale, "Aromen, Emulgatoren, Farb- und Konservierungsstoffe", "Flavorings, emulsifiers, colors, and preservatives")}</small></span></label>
                <label className="toggle-row"><input checked={criteria.sweetenerFree} onChange={(event) => update("sweetenerFree", event.target.checked)} type="checkbox" /><span><strong>{pick(locale, "Ohne Süßungsmittel", "No sweeteners")}</strong><small>{pick(locale, "Zum Beispiel Erythrit, Stevia oder Sucralose", "For example erythritol, stevia, or sucralose")}</small></span></label>
                <label className="toggle-row"><input checked={criteria.palmOilFree} onChange={(event) => update("palmOilFree", event.target.checked)} type="checkbox" /><span><strong>{pick(locale, "Ohne Palmöl", "No palm oil")}</strong><small>{pick(locale, "Auf Basis der vorhandenen Zutatenliste", "Based on the available ingredient list")}</small></span></label>
              </fieldset>

              <fieldset className="filter-panel"><legend>{pick(locale, "Allergene ausschließen", "Exclude allergens")}</legend>
                <div className="check-chip-grid">
                  {allergenOptions(locale).map((allergen) => <label key={allergen.id}><input checked={criteria.excludedAllergens.includes(allergen.id)} onChange={() => toggleAllergen(allergen.id)} type="checkbox" /><span>{allergen.label}</span></label>)}
                </div>
                <p className="filter-disclaimer">{pick(locale, "Bei Allergien gilt immer die aktuelle Verpackungsangabe.", "For allergies, always rely on the current package label.")}</p>
              </fieldset>

              <fieldset className="filter-panel"><legend>{pick(locale, "Nährwertgrenzen pro 100 g/ml", "Nutrition limits per 100 g/ml")}</legend>
                <label className="number-filter"><span>{pick(locale, "Maximaler Zucker", "Maximum sugar")}</span><input max="100" min="0" onChange={(event) => update("maxSugar", optionalBoundedNumber(event.target.value, 100))} placeholder={pick(locale, "keine Grenze", "no limit")} step="0.5" type="number" value={criteria.maxSugar ?? ""} /><small>g</small></label>
                <label className="number-filter"><span>{pick(locale, "Mindestprotein", "Minimum protein")}</span><input max="100" min="0" onChange={(event) => update("minProtein", optionalBoundedNumber(event.target.value, 100))} placeholder={pick(locale, "keine Grenze", "no limit")} step="0.5" type="number" value={criteria.minProtein ?? ""} /><small>g</small></label>
                <label className="number-filter"><span>{pick(locale, "Maximale Kalorien", "Maximum calories")}</span><input max="1000" min="0" onChange={(event) => update("maxCalories", optionalBoundedNumber(event.target.value, 1000))} placeholder={pick(locale, "keine Grenze", "no limit")} step="10" type="number" value={criteria.maxCalories ?? ""} /><small>kcal</small></label>
              </fieldset>

              <fieldset className="filter-panel"><legend>{pick(locale, "Suche und Datenqualität", "Search and data quality")}</legend>
                <label className="stacked-field"><span>{pick(locale, "Produkt, Marke oder Zutat suchen", "Search product, brand, or ingredient")}</span><input onChange={(event) => update("query", event.target.value)} placeholder={pick(locale, "z. B. Hafer oder Mandel", "e.g. oats or almonds")} type="search" value={criteria.query} /></label>
                <label className="stacked-field"><span>{pick(locale, "Zutat muss enthalten sein", "Must include ingredient")}</span><input onChange={(event) => update("includeIngredient", event.target.value)} placeholder={pick(locale, "z. B. Leinsamen", "e.g. flaxseed")} type="text" value={criteria.includeIngredient} /></label>
                <label className="stacked-field"><span>{pick(locale, "Zutat ausschließen", "Exclude ingredient")}</span><input onChange={(event) => update("excludeIngredient", event.target.value)} placeholder={pick(locale, "z. B. Kokos", "e.g. coconut")} type="text" value={criteria.excludeIngredient} /></label>
                <label className="stacked-field"><span>{pick(locale, "Mindestsicherheit des Ziel-Scores", "Minimum score confidence")}</span><select onChange={(event) => update("minimumConfidence", event.target.value as FinderCriteria["minimumConfidence"])} value={criteria.minimumConfidence}><option value="any">{pick(locale, "Alle Datenlagen", "Any confidence")}</option><option value="medium">{pick(locale, "Mindestens mittel", "At least medium")}</option><option value="high">{pick(locale, "Nur hoch", "High only")}</option></select></label>
              </fieldset>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="finder-step finder-results-step">
            <div className="finder-results-toolbar">
              <div className="finder-step-heading"><span>{results.length} {pick(locale, results.length === 1 ? "passendes Produkt" : "passende Produkte", results.length === 1 ? "matching product" : "matching products")}</span><h2 ref={stageHeadingRef} tabIndex={-1}>{pick(locale, "Deine Treffer", "Your matches")}</h2><p>{pick(locale, "Der Match-Score ordnet alle passenden Katalogprodukte nach deiner Priorität, aktiven Filtern, Gesamturteil und Datenvollständigkeit.", "The match score ranks every matching catalog product by your priority, active filters, overall score, and data completeness.")}</p></div>
              <div className="finder-result-actions"><button className="secondary-command" onClick={() => moveToStep(2)} type="button">{pick(locale, "Filter anpassen", "Adjust filters")}</button><button className="secondary-command" onClick={copyLink} type="button">{copyStatus === "copied" ? pick(locale, "Link kopiert", "Link copied") : copyStatus === "failed" ? pick(locale, "Kopieren fehlgeschlagen", "Copy failed") : pick(locale, "Link kopieren", "Copy link")}</button></div>
            </div>
            {activeFilters.length ? <div className="active-filter-bar" aria-label={pick(locale, "Aktive Filter", "Active filters")}>{activeFilters.map((filter) => <button key={filter.key} onClick={filter.clear} title={pick(locale, `${filter.label} entfernen`, `Remove ${filter.label}`)} type="button"><span>{filter.label}</span><b aria-hidden="true">×</b></button>)}</div> : null}
            {results.length ? (
              <>
                <div className="product-grid">{results.slice(0, visibleCount).map(({ product, match }) => <ProductCard key={product.id} matchReasons={match.reasons} matchScore={match.score} product={product} />)}</div>
                {visibleCount < results.length ? <button className="load-more-button" onClick={() => setVisibleCount((count) => count + 24)} type="button">{pick(locale, "Weitere Produkte laden", "Load more products")}</button> : null}
              </>
            ) : <div className="empty-state"><h3>{pick(locale, "Keine passende Kombination gefunden", "No matching combination found")}</h3><p>{pick(locale, "Lockere einen Grenzwert oder entferne einen Ausschluss. Unbekannte Werte gelten bei aktiven Grenzen nicht als passend.", "Relax a limit or remove an exclusion. Unknown values do not pass active limits.")}</p><button onClick={() => setCriteria(defaultFinderCriteria(criteria.goal))} type="button">{pick(locale, "Filter zurücksetzen", "Reset filters")}</button></div>}
          </div>
        ) : null}

        {step < 3 ? <div className="finder-controls">
          <button disabled={step === 0} onClick={() => moveToStep(step - 1)} type="button">{pick(locale, "Zurück", "Back")}</button>
          <button className="primary-button" onClick={() => step === 2 ? showResults() : moveToStep(step + 1)} type="button">{step === 2 ? `${pick(locale, "Ergebnisse anzeigen", "Show results")} (${results.length})` : pick(locale, "Weiter", "Next")}</button>
        </div> : null}
      </div>
    </section>
  );
}
