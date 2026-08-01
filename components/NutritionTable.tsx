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
  return (
    <section className="detail-section" id="naehrwerte">
      <div className="section-heading">
        <p className="eyebrow">Nährwerte</p>
        <h2>Was steckt drin?</h2>
        <p>Alle Angaben pro {product.nutrition.basis === "100ml" ? "100 ml" : "100 g"}.</p>
      </div>
      <div className="nutrition-table">
        {rows.map(([key, label, unit]) => (
          <div key={key}>
            <span>{label}</span>
            <strong>{product.nutrition[key] ?? "Keine Angabe"} {product.nutrition[key] === null ? "" : unit}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
