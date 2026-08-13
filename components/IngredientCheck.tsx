import { analyzeIngredients, analyzeVeganStatus } from "@/lib/ingredient-analysis";
import { pick } from "@/lib/i18n";
import type { Product } from "@/lib/types";

type Signal = {
  key: string;
  label: string;
  status: string;
  detail: string;
  tone: "clear" | "detected" | "unknown";
};

export function IngredientCheck({ product }: { product: Product }) {
  const locale = product.locale;
  const c = (de: string, en: string) => pick(locale, de, en);
  const ingredients = analyzeIngredients(product.ingredients);
  const vegan = analyzeVeganStatus(product.labels, product.allergens, product.ingredients);

  if (!ingredients.hasData) {
    return <div className="ingredient-check-empty">
      <strong>{c("Zutatencheck nicht möglich", "Ingredient check unavailable")}</strong>
      <span>{c("Die Quelle enthält derzeit keine verlässliche Zutatenliste. Ausschlüsse werden deshalb nicht als erfüllt dargestellt.", "The source currently has no reliable ingredient list, so exclusions are not shown as satisfied.")}</span>
    </div>;
  }

  const ingredientSignal = (
    key: string,
    label: string,
    detected: boolean,
    evidence: string[],
  ): Signal => ({
    key,
    label,
    status: detected ? c("Erkannt", "Detected") : c("Nicht erkannt", "Not detected"),
    detail: detected
      ? c(`Gefunden in: ${evidence.join(", ")}`, `Found in: ${evidence.join(", ")}`)
      : c("In der verfügbaren Zutatenliste nicht erkannt.", "Not detected in the available ingredient list."),
    tone: detected ? "detected" : "clear",
  });

  const signals: Signal[] = [
    ingredientSignal("added-sugar", c("Zugesetzter Zucker", "Added sugar"), ingredients.detected.addedSugar, ingredients.evidence.addedSugar),
    ingredientSignal("sweeteners", c("Süßungsmittel", "Sweeteners"), ingredients.detected.sweeteners, ingredients.evidence.sweeteners),
    ingredientSignal("additives", c("Typische Zusatzstoffe", "Common additives"), ingredients.detected.additives, ingredients.evidence.additives),
    ingredientSignal("palm-oil", c("Palmöl", "Palm oil"), ingredients.detected.palmOil, ingredients.evidence.palmOil),
    vegan.status === "claimed" ? {
      key: "vegan",
      label: c("Vegane Kennzeichnung", "Vegan claim"),
      status: c("Bestätigt", "Confirmed"),
      detail: c("Als vegan oder pflanzlich gekennzeichnet. In den verfügbaren Allergen- und Zutatenangaben wurde kein definierter Widerspruch erkannt. Dies ist keine unabhängige Bestätigung.", "Labeled vegan or plant based. No defined conflict was found in the available allergen and ingredient data. This is not independent confirmation."),
      tone: "clear",
    } : vegan.status === "conflict" ? {
      key: "vegan",
      label: c("Vegane Kennzeichnung", "Vegan claim"),
      status: c("Widerspruch", "Conflict"),
      detail: c(`Kennzeichnung und Produktdaten widersprechen sich: ${[...vegan.conflictingAllergens, ...vegan.conflictingIngredients].join(", ")}.`, `The claim conflicts with product data: ${[...vegan.conflictingAllergens, ...vegan.conflictingIngredients].join(", ")}.`),
      tone: "detected",
    } : {
      key: "vegan",
      label: c("Vegane Kennzeichnung", "Vegan claim"),
      status: c("Nicht bestätigt", "Not confirmed"),
      detail: c("Keine verlässliche vegane oder pflanzliche Kennzeichnung in den Quelldaten.", "No reliable vegan or plant based claim in the source data."),
      tone: "unknown",
    },
  ];

  return <div className="ingredient-check">
    <div className="ingredient-check-heading">
      <div><p className="eyebrow">{c("Automatischer Zutatencheck", "Automated ingredient check")}</p><h3>{c("Was in der verfügbaren Liste auffällt", "What stands out in the available list")}</h3></div>
      <span>{ingredients.ingredientCount} {c(ingredients.ingredientCount === 1 ? "Zutat" : "Zutaten", ingredients.ingredientCount === 1 ? "ingredient" : "ingredients")}</span>
    </div>
    <div className="ingredient-signal-grid">
      {signals.map((signal) => <article className={`ingredient-signal is-${signal.tone}`} key={signal.key}>
        <div><span aria-hidden="true" /><strong>{signal.label}</strong></div>
        <b>{signal.status}</b>
        <p>{signal.detail}</p>
      </article>)}
    </div>
    <p className="small-note">{c("„Nicht erkannt“ ist keine Garantie. Rezepturen ändern sich; prüfe bei Unverträglichkeiten und Allergien immer die aktuelle Verpackung.", "“Not detected” is not a guarantee. Recipes change; always check the current package for intolerances and allergies.")}</p>
  </div>;
}
