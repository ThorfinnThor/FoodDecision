import type { Product } from "@/lib/types";

const flagLabels: Record<string, string> = {
  missing_brand: "Marke nicht bestätigt",
  incomplete_nutrition: "Nährwerte teilweise unvollständig",
  implausible_nutrition: "Einzelne Nährwerte nicht plausibel",
  missing_ingredients: "Zutatenliste fehlt",
  allergens_unverified: "Allergene nicht vollständig bestätigt",
  missing_image: "Produktbild fehlt",
  stale_source_data: "Quelldaten möglicherweise veraltet",
  ranking_confidence_medium: "Mittlere Datensicherheit",
  salt_high: "Erhöhter Salzgehalt",
};

export function DataQualityNotice({ product }: { product: Product }) {
  const hasFlags = product.qualityFlags.length > 0;

  return (
    <section className="quality-notice">
      <div>
        <p className="eyebrow">Daten & Transparenz</p>
        <h2>{hasFlags ? "Mit Hinweisen" : "Gute Datengrundlage"}</h2>
      </div>
      <p>
        Aktualisiert am {new Date(product.sourceUpdatedAt).toLocaleDateString("de-DE")}. Prüfe Zutaten und Allergene vor dem Kauf immer auf der Verpackung.{" "}
        {product.source === "Open Food Facts" ? (
          <>
            Quelle: {" "}
            <a href="https://world.openfoodfacts.org" rel="license noreferrer" target="_blank">
              Open Food Facts
            </a>{" "}
            (ODbL), Produktbilder CC BY-SA.
          </>
        ) : null}
      </p>
      {hasFlags ? (
        <ul className="quality-flags">
          {product.qualityFlags.map((flag) => (
            <li key={flag}>{flagLabels[flag] ?? flag.replaceAll("_", " ")}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
