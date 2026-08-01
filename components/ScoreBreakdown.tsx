import { scoreLabel } from "@/lib/scoring";
import type { Product } from "@/lib/types";

const scoreNames: Record<Product["scores"][number]["type"], string> = {
  nutrition: "Gesundheit",
  ingredient_quality: "Zutaten",
  protein: "Protein",
  low_sugar: "Zucker",
  family: "Für Familien",
  vegan: "Vegane Eignung",
  overall_match: "Gesamturteil",
};

export function ScoreBreakdown({ product }: { product: Product }) {
  return (
    <section className="section" id="score-details">
      <div className="section-heading">
        <p className="eyebrow">Transparent bewertet</p>
        <h2>Warum dieses Produkt so bewertet wird</h2>
        <p>Jeder Teilscore basiert auf verfügbaren Produktdaten. Fehlende Angaben werden nicht als Null gewertet.</p>
      </div>
      <div className="score-grid">
        {product.scores.map((score) => (
          <article className="score-detail" key={score.type}>
            <div className="score-detail-head">
              <h3>{scoreNames[score.type]}</h3>
              <strong>{scoreLabel(score)}</strong>
            </div>
            <p>{score.confidence === "high" ? "Hohe" : score.confidence === "medium" ? "Mittlere" : "Niedrige"} Datensicherheit</p>
            <ul className="reason-list">
              {[...score.positives, ...score.negatives].slice(0, 3).map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
              {score.missingData.map((item) => (
                <li key={item}>Noch keine verlässliche Angabe: {item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <details className="method-note">
        <summary>So funktioniert der Score</summary>
        <p>Die Bewertung kombiniert kategoriespezifische Regeln für Nährwerte, Zutaten und den gewählten Bedarf. Regelstand: {product.scores[0]?.ruleVersion ?? "aktuell"}. Umwelt- und unabhängige Testdaten werden erst ergänzt, wenn belastbare Quellen vorliegen.</p>
      </details>
    </section>
  );
}
