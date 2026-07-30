import type { Product } from "@/lib/types";

const rows: Array<[keyof Product["nutrition"], string, string]> = [
  ["energyKcal", "Energie", "kcal"],
  ["fat", "Fett", "g"],
  ["saturatedFat", "gesaettigte Fettsaeuren", "g"],
  ["carbohydrates", "Kohlenhydrate", "g"],
  ["sugar", "Zucker", "g"],
  ["fiber", "Ballaststoffe", "g"],
  ["protein", "Eiweiss", "g"],
  ["salt", "Salz", "g"],
];

export function NutritionTable({ product }: { product: Product }) {
  return (
    <section className="section compact-section">
      <div className="section-heading">
        <p className="eyebrow">Naehrwerte</p>
        <h2>Pro {product.nutrition.basis === "100ml" ? "100 ml" : "100 g"}</h2>
      </div>
      <div className="nutrition-table">
        {rows.map(([key, label, unit]) => (
          <div key={key}>
            <span>{label}</span>
            <strong>{product.nutrition[key] ?? "?"} {product.nutrition[key] === null ? "" : unit}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
