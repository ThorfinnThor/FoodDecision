import { pick } from "@/lib/i18n";
import { productDecisionSummary } from "@/lib/product-insights";
import type { PeerMetric } from "@/lib/product-insights";
import type { Product } from "@/lib/types";

function metricCopy(metric: PeerMetric, product: Product) {
  const locale = product.locale;
  const name = metric.key === "sugar" ? pick(locale, "Zucker", "Sugar") : pick(locale, "Protein", "Protein");
  const absoluteDifference = Math.abs(metric.percentDifference);
  const direction = metric.percentDifference < 0 ? pick(locale, "niedriger", "lower") : pick(locale, "höher", "higher");
  const context = metric.position === "typical"
    ? pick(locale, "Nahe am Median der Kategorie.", "Close to the category median.")
    : pick(locale, `${absoluteDifference} % ${direction} als der Kategorie-Median.`, `${absoluteDifference}% ${direction} than the category median.`);
  return { name, context };
}

function nutritionNumber(value: number, product: Product) {
  return value.toLocaleString(product.locale, { maximumFractionDigits: 2 });
}

export function DecisionSnapshot({ categoryProducts, product }: { categoryProducts: Product[]; product: Product }) {
  const locale = product.locale;
  const summary = productDecisionSummary(product, categoryProducts);
  const primaryUse = summary.bestFor[0];
  const peerCopy = summary.peerCount === 1
    ? pick(locale, "Verglichen mit 1 Produkt derselben Kategorie und Bezugsbasis.", "Compared with 1 product in the same category and serving basis.")
    : pick(locale, `Verglichen mit ${summary.peerCount} Produkten derselben Kategorie und Bezugsbasis.`, `Compared with ${summary.peerCount} products in the same category and serving basis.`);

  return (
    <section className="detail-section suitability-section">
      <div className="section-heading">
        <p className="eyebrow">{pick(locale, "Entscheidung auf einen Blick", "Decision snapshot")}</p>
        <h2>{pick(locale, "Wo dieses Produkt in seiner Kategorie steht", "Where this product stands in its category")}</h2>
        <p>{peerCopy}</p>
      </div>
      <div className="suitability-grid">
        <article>
          <span>{pick(locale, "Besonders passend für", "Best suited for")}</span>
          <strong className="decision-text-value">{primaryUse?.label ?? pick(locale, "Allgemeinen Vergleich", "General comparison")}</strong>
          <p>{primaryUse?.reason ?? pick(locale, "Für eine klare Empfehlung fehlen noch belastbare Teildaten.", "More reliable component data is needed for a specific recommendation.")}</p>
        </article>
        {summary.peerMetrics.map((metric) => {
          const copy = metricCopy(metric, product);
          return <article className={`peer-metric is-${metric.position}`} key={metric.key}><span>{copy.name}</span><strong>{nutritionNumber(metric.value, product)} g</strong><p>{copy.context} {pick(locale, "Median", "Median")}: {nutritionNumber(metric.median, product)} g.</p></article>;
        })}
        <article>
          <span>{pick(locale, "Datenabdeckung", "Data coverage")}</span>
          <strong>{summary.dataCompleteness}%</strong>
          <p>{pick(locale, "Fehlende Werte bleiben sichtbar und werden nicht als Null interpretiert.", "Missing values remain visible and are never treated as zero.")}</p>
        </article>
      </div>
    </section>
  );
}
