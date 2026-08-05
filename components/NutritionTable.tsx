import type { Product } from "@/lib/types";

const rows: Array<[keyof Product["nutrition"], string, string]> = [
  ["energyKcal", "Energie", "kcal"],
  ["fat", "Fett", "g"],
  ["saturatedFat", "davon gesättigte Fettsäuren", "g"],
  ["carbohydrates", "Kohlenhydrate", "g"],
  ["sugar", "Zucker", "g"],
  ["fiber", "Ballaststoffe", "g"],
  ["protein", "Eiweiß", "g"],
  ["salt", "Salz", "g"],
];

export function NutritionTable({ product }: { product: Product }) {
  const en = product.locale === "en-US";
  const labels = en ? ["Energy", "Fat", "Saturated fat", "Carbohydrates", "Sugar", "Fiber", "Protein", "Salt"] : rows.map((row) => row[1]);
  return (
    <section className="detail-section" id="naehrwerte">
      <div className="section-heading">
        <p className="eyebrow">{en ? "Nutrition" : "Nährwerte"}</p>
        <h2>{en ? "What's inside?" : "Was steckt drin?"}</h2>
        <p>{en ? "All values per" : "Alle Angaben pro"} {product.nutrition.basis === "100ml" ? "100 ml" : "100 g"}.</p>
      </div>
      <div className="nutrition-table">
        {rows.map(([key, , unit], index) => (
          <div key={key}>
            <span>{labels[index]}</span>
            <strong>{product.nutrition[key] ?? (en ? "Not available" : "Keine Angabe")} {product.nutrition[key] === null ? "" : unit}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
