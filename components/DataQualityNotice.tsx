import type { Product } from "@/lib/types";
import { assessDataFreshness, scoreRuleVersions, type DataFreshnessStatus } from "@/lib/data-freshness";

const flagLabels: Record<string, string> = {
  missing_brand: "Marke nicht bestätigt",
  incomplete_nutrition: "Nährwerte teilweise unvollständig",
  implausible_nutrition: "Einzelne Nährwerte nicht plausibel",
  missing_ingredients: "Zutatenliste fehlt",
  allergens_unverified: "Allergene nicht vollständig bestätigt",
  missing_image: "Produktbild fehlt",
  stale_source_data: "Quelldaten möglicherweise veraltet",
  unlicensed_image_source: "Bildquelle nicht zur Anzeige freigegeben",
  ranking_confidence_medium: "Mittlere Datensicherheit",
  salt_high: "Erhöhter Salzgehalt",
};

export function DataQualityNotice({ product }: { product: Product }) {
  const hasFlags = product.qualityFlags.length > 0;
  const en = product.locale === "en-US";
  const freshness = assessDataFreshness(product.sourceUpdatedAt, product.importedAt);
  const versions = scoreRuleVersions(product.scores);
  const date = (value: string) => new Date(value).toLocaleDateString(product.locale);
  const freshnessLabels: Record<DataFreshnessStatus, [string, string]> = {
    recent: ["Sehr aktueller Quellenstand", "Very recent source data"],
    established: ["Etablierter Quellenstand", "Established source data"],
    stale: ["Älteren Quellenstand prüfen", "Older source data to verify"],
    unknown: ["Quellenalter unbekannt", "Source age unknown"],
  };
  const englishFlags: Record<string, string> = { missing_brand: "Brand not confirmed", incomplete_nutrition: "Nutrition data is incomplete", implausible_nutrition: "Some nutrition values are implausible", missing_ingredients: "Ingredient list missing", allergens_unverified: "Allergens not fully verified", missing_image: "Product image missing", stale_source_data: "Source data may be outdated", unlicensed_image_source: "Image source is not eligible for display" };

  return (
    <section className="quality-notice">
      <div>
        <p className="eyebrow">{en ? "Data and transparency" : "Daten & Transparenz"}</p>
        <h2>{hasFlags ? (en ? "Important notes" : "Mit Hinweisen") : (en ? "Good data coverage" : "Gute Datengrundlage")}</h2>
      </div>
      <p>
        {en ? "Product information can change after our catalog import. Always check ingredients and allergens on the current package before buying." : "Produktangaben können sich nach unserem Katalogimport ändern. Prüfe Zutaten und Allergene vor dem Kauf immer auf der aktuellen Verpackung."}{" "}
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
      <dl className="freshness-facts">
        <div><dt>{en ? "Source updated" : "Quellenstand"}</dt><dd>{date(product.sourceUpdatedAt)}</dd></div>
        <div><dt>{en ? "Catalog import" : "Katalogimport"}</dt><dd>{date(product.importedAt)}</dd></div>
        <div><dt>{en ? "Freshness" : "Datenfrische"}</dt><dd>{freshnessLabels[freshness.status][en ? 1 : 0]}{freshness.ageAtImportDays !== null ? <small>{en ? `${freshness.ageAtImportDays} days old at import` : `beim Import ${freshness.ageAtImportDays} Tage alt`}</small> : null}</dd></div>
        <div><dt>{en ? "Scoring rules" : "Bewertungsregeln"}</dt><dd>{versions.length ? versions.join(", ") : (en ? "Not available" : "Nicht verfügbar")}</dd></div>
      </dl>
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
