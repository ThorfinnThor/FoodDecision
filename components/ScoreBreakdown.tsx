import { categoryScoringProfiles } from "@/lib/catalog";
import { OVERALL_SCORE_WEIGHTS, scoreByType, scoreLabel } from "@/lib/scoring";
import type { Product } from "@/lib/types";
import { pick } from "@/lib/i18n";

const scoreNames: Record<Product["scores"][number]["type"], string> = {
  nutrition: "Nährwerte",
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
  const nutrition = scoreByType(product, "nutrition");
  const ingredients = scoreByType(product, "ingredient_quality");
  const overall = scoreByType(product, "overall_match");
  const profile = categoryScoringProfiles[product.category];
  const number = (value: number) => value.toLocaleString(locale, { maximumFractionDigits: 2 });
  const nutritionValue = nutrition?.score ?? 50;
  const ingredientValue = ingredients?.score ?? 50;
  return (
    <section className="section" id="score-details">
      <div className="section-heading">
        <p className="eyebrow">{pick(locale, "Transparent bewertet", "Transparent scoring")}</p>
        <h2>{pick(locale, "Warum dieses Produkt so bewertet wird", "Why this product received these scores")}</h2>
        <p>{pick(locale, "Jede Teilbewertung basiert auf verfügbaren Produktdaten. Fehlende Angaben werden im Gesamturteil konservativ mit 50 Punkten angesetzt und senken die Datensicherheit.", "Each component score uses available product data. Missing components are conservatively set to 50 points in the overall score and reduce data confidence.")}</p>
      </div>
      {overall?.score !== null && overall?.score !== undefined ? <div className="score-calculation" aria-label={pick(locale, "Berechnung des Gesamturteils", "Overall score calculation")}>
        <div><span>{pick(locale, "Nährwerte", "Nutrition")}</span><strong>{nutritionValue} × {OVERALL_SCORE_WEIGHTS.nutrition * 100}%</strong>{nutrition?.score == null ? <small>{pick(locale, "50 als konservativer Ersatzwert", "50 used as a conservative fallback")}</small> : null}</div>
        <b aria-hidden="true">+</b>
        <div><span>{pick(locale, "Zutaten", "Ingredients")}</span><strong>{ingredientValue} × {OVERALL_SCORE_WEIGHTS.ingredientQuality * 100}%</strong>{ingredients?.score == null ? <small>{pick(locale, "50 als konservativer Ersatzwert", "50 used as a conservative fallback")}</small> : null}</div>
        <b aria-hidden="true">=</b>
        <div className="score-calculation-result"><span>{pick(locale, "Gesamturteil", "Overall")}</span><strong>{overall.score}/100</strong></div>
      </div> : null}
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
        <p>{pick(locale, "Das Gesamturteil besteht aus 65 Prozent Nährwerten und 35 Prozent Zutaten. Zucker, Protein und Familientauglichkeit bleiben als eigene Zielbewertungen sichtbar und werden nicht doppelt gezählt.", "The overall score consists of 65 percent nutrition and 35 percent ingredients. Sugar, protein, and family fit remain visible as separate goal scores and are not counted twice.")} {pick(locale, "Regelstand", "Rule version")}: {product.scores[0]?.ruleVersion ?? pick(locale, "aktuell", "current")}.</p>
        <h3>{pick(locale, `Grenzwerte für ${product.categoryLabel}`, `Reference values for ${product.categoryLabel}`)}</h3>
        <dl className="score-thresholds">
          <div><dt>{pick(locale, "Zucker", "Sugar")}</dt><dd>{pick(locale, `stark bis ${number(profile.sugar.excellent)} g, auffällig ab ${number(profile.sugar.weak)} g pro ${profile.sugar.unit}`, `strong up to ${number(profile.sugar.excellent)} g, high from ${number(profile.sugar.weak)} g per ${profile.sugar.unit}`)}</dd></div>
          <div><dt>{pick(locale, "Protein", "Protein")}</dt><dd>{pick(locale, `solide ab ${number(profile.protein.okay)} g, sehr stark ab ${number(profile.protein.excellent)} g pro ${profile.sugar.unit}`, `solid from ${number(profile.protein.okay)} g, very strong from ${number(profile.protein.excellent)} g per ${profile.sugar.unit}`)}</dd></div>
          <div><dt>{pick(locale, "Salz", "Salt")}</dt><dd>{pick(locale, `stark bis ${number(profile.salt.excellent)} g, auffällig ab ${number(profile.salt.weak)} g pro ${profile.sugar.unit}`, `strong up to ${number(profile.salt.excellent)} g, high from ${number(profile.salt.weak)} g per ${profile.sugar.unit}`)}</dd></div>
          <div><dt>{pick(locale, "Gesättigte Fettsäuren", "Saturated fat")}</dt><dd>{pick(locale, `stark bis ${number(profile.saturatedFat.excellent)} g, auffällig ab ${number(profile.saturatedFat.weak)} g pro ${profile.sugar.unit}`, `strong up to ${number(profile.saturatedFat.excellent)} g, high from ${number(profile.saturatedFat.weak)} g per ${profile.sugar.unit}`)}</dd></div>
        </dl>
      </details>
    </section>
  );
}
