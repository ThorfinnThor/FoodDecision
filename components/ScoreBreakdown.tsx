import { scoreLabel } from "@/lib/scoring";
import type { Product } from "@/lib/types";
import { pick } from "@/lib/i18n";

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
  const locale = product.locale;
  const names = locale === "de-DE" ? scoreNames : { nutrition: "Nutrition", ingredient_quality: "Ingredients", protein: "Protein", low_sugar: "Sugar", family: "Family fit", vegan: "Vegan suitability", overall_match: "Overall" };
  return (
    <section className="section" id="score-details">
      <div className="section-heading">
        <p className="eyebrow">{pick(locale, "Transparent bewertet", "Transparent scoring")}</p>
        <h2>{pick(locale, "Warum dieses Produkt so bewertet wird", "Why this product received these scores")}</h2>
        <p>{pick(locale, "Jede Teilbewertung basiert auf verfügbaren Produktdaten. Fehlende Angaben werden nicht als Null gewertet.", "Each component score uses available product data. Missing values are not treated as zero.")}</p>
      </div>
      <div className="score-grid">
        {product.scores.map((score) => (
          <article className="score-detail" key={score.type}>
            <div className="score-detail-head">
              <h3>{names[score.type]}</h3>
              <strong>{scoreLabel(score, locale)}</strong>
            </div>
            <p>{locale === "de-DE" ? `${score.confidence === "high" ? "Hohe" : score.confidence === "medium" ? "Mittlere" : "Niedrige"} Datensicherheit` : `${score.confidence === "high" ? "High" : score.confidence === "medium" ? "Medium" : "Low"} data confidence`}</p>
            <ul className="reason-list">
              {[...score.positives, ...score.negatives].slice(0, 3).map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
              {score.missingData.map((item) => (
                <li key={item}>{pick(locale, "Noch keine verlässliche Angabe", "No reliable value yet")}: {item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <details className="method-note">
        <summary>{pick(locale, "So funktioniert der Score", "How the score works")}</summary>
        <p>{pick(locale, "Die Bewertung kombiniert passende Regeln für Nährwerte, Zutaten und den gewählten Bedarf in dieser Kategorie.", "The assessment combines rules for nutrition, ingredients, and the selected goal within this category.")} {pick(locale, "Regelstand", "Rule version")}: {product.scores[0]?.ruleVersion ?? pick(locale, "aktuell", "current")}.</p>
      </details>
    </section>
  );
}
