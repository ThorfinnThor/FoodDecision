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
  const en = product.locale === "en-US";
  const englishFlags: Record<string, string> = { missing_brand: "Brand not confirmed", incomplete_nutrition: "Nutrition data is incomplete", implausible_nutrition: "Some nutrition values are implausible", missing_ingredients: "Ingredient list missing", allergens_unverified: "Allergens not fully verified", missing_image: "Product image missing", stale_source_data: "Source data may be outdated", unlicensed_image_source: "Image source is not eligible for display" };

  return (
    <section className="quality-notice">
      <div>
        <p className="eyebrow">{en ? "Data and transparency" : "Daten & Transparenz"}</p>
        <h2>{hasFlags ? (en ? "Important notes" : "Mit Hinweisen") : (en ? "Good data coverage" : "Gute Datengrundlage")}</h2>
      </div>
      <p>
        {en ? "Updated" : "Aktualisiert am"} {new Date(product.sourceUpdatedAt).toLocaleDateString(product.locale)}. {en ? "Always check ingredients and allergens on the current package before buying." : "Prüfe Zutaten und Allergene vor dem Kauf immer auf der Verpackung."}{" "}
        {product.source === "Open Food Facts" ? (
          <>
            {en ? "Source" : "Quelle"}: {" "}
            <a href="https://world.openfoodfacts.org" rel="license noreferrer" target="_blank">
              Open Food Facts
            </a>{" "}
            (ODbL), {en ? "product images CC BY-SA" : "Produktbilder CC BY-SA"}.
          </>
        ) : null}
      </p>
      {hasFlags ? (
        <ul className="quality-flags">
          {product.qualityFlags.map((flag) => (
            <li key={flag}>{(en ? englishFlags[flag] : flagLabels[flag]) ?? flag.replaceAll("_", " ")}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
