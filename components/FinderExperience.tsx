"use client";

import { useMemo, useState } from "react";
import { scoreByType } from "@/lib/scoring";
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
  const [category, setCategory] = useState<string>("all");
  const [goal, setGoal] = useState<ScoreType>(initialGoal);
  const [excludeMilk, setExcludeMilk] = useState(false);
  const [veganOnly, setVeganOnly] = useState(initialGoal === "vegan");
  const [query, setQuery] = useState(initialQuery);

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products
      .filter((product) => category === "all" || product.category === category)
      .filter((product) => !veganOnly || product.labels.some((label) => /vegan|pflanzlich/i.test(label)))
      .filter((product) => !excludeMilk || !product.allergens.some((allergen) => /milch|laktose/i.test(allergen)))
      .filter((product) => !normalizedQuery || [product.name, product.brand, ...product.ingredients].join(" ").toLowerCase().includes(normalizedQuery))
      .sort((a, b) => (scoreByType(b, goal)?.score ?? -1) - (scoreByType(a, goal)?.score ?? -1));
  }, [category, excludeMilk, goal, products, query, veganOnly]);

  const steps = ["Produktgruppe", "Priorität", "Ausschlüsse", "Ergebnisse"];

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
            <div className="finder-step-heading"><span>Schritt 1 von 3</span><h2>Was suchst du?</h2><p>Wähle eine Kategorie oder bleib offen für alle Produkte.</p></div>
            <div className="choice-grid" role="radiogroup" aria-label="Produktkategorie">
              <button aria-pressed={category === "all"} onClick={() => setCategory("all")} type="button"><strong>Alle Produkte</strong><span>Kategorieübergreifend entdecken</span></button>
              {categories.map((item) => (
                <button aria-pressed={category === item.slug} key={item.slug} onClick={() => setCategory(item.slug)} type="button"><strong>{item.label}</strong><span>{item.intent}</span></button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="finder-step">
            <div className="finder-step-heading"><span>Schritt 2 von 3</span><h2>Was ist dir am wichtigsten?</h2><p>Diese Priorität bestimmt die Reihenfolge deiner Ergebnisse.</p></div>
            <div className="choice-grid" role="radiogroup" aria-label="Priorität">
              {goals.map((item) => (
                <button aria-pressed={goal === item.value} key={item.value} onClick={() => { setGoal(item.value); if (item.value === "vegan") setVeganOnly(true); }} type="button"><strong>{item.label}</strong><span>{item.description}</span></button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="finder-step">
            <div className="finder-step-heading"><span>Schritt 3 von 3</span><h2>Was möchtest du ausschließen?</h2><p>Überspringe diesen Schritt, wenn du keine Ausschlüsse brauchst.</p></div>
            <div className="finder-options">
              <label><input checked={veganOnly} onChange={(event) => setVeganOnly(event.target.checked)} type="checkbox" /><span><strong>Nur vegane Produkte</strong><small>Berücksichtigt vorhandene Labels und bekannte Allergene.</small></span></label>
              <label><input checked={excludeMilk} onChange={(event) => setExcludeMilk(event.target.checked)} type="checkbox" /><span><strong>Milch und Laktose ausschließen</strong><small>Produktetikett bei Allergien trotzdem immer prüfen.</small></span></label>
              <label className="finder-search-label" htmlFor="finder-query"><strong>Suchbegriff</strong><small>Optional nach Produkt, Marke oder Zutat suchen.</small></label>
              <input id="finder-query" onChange={(event) => setQuery(event.target.value)} placeholder="z. B. Hafer oder Mandel" type="search" value={query} />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="finder-step finder-results-step">
            <div className="finder-step-heading"><span>{results.length} passende Produkte</span><h2>Deine Auswahl</h2><p>Sortiert nach „{goals.find((item) => item.value === goal)?.label}“. Öffne ein Produkt für die vollständige Begründung.</p></div>
            {results.length ? <div className="product-grid">{results.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-state"><h3>Keine passende Kombination gefunden</h3><p>Ändere einen Ausschluss oder wähle alle Kategorien.</p></div>}
          </div>
        ) : null}

        <div className="finder-controls">
          <button disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))} type="button">Zurück</button>
          {step < 3 ? <button className="primary-button" onClick={() => setStep((value) => Math.min(3, value + 1))} type="button">{step === 2 ? "Ergebnisse anzeigen" : "Weiter"}</button> : <button className="primary-button" onClick={() => setStep(0)} type="button">Auswahl ändern</button>}
        </div>
      </div>
    </section>
  );
}
