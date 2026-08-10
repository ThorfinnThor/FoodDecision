import Link from "next/link";
import { localizedPath, pick } from "@/lib/i18n";
import { rankingMetric, type RankingInsights } from "@/lib/ranking-insights";
import type { RankingPage, SiteLocale } from "@/lib/types";
import { ProductVisual } from "./ProductVisual";

export function RankingDecision({
  locale,
  ranking,
  insights,
}: {
  locale: SiteLocale;
  ranking: RankingPage;
  insights: RankingInsights;
}) {
  const path = (value: string) => localizedPath(locale, value);
  const product = insights.topPick;
  const metric = rankingMetric(product, ranking.sortScore);

  return <>
    <section className="ranking-answer-band" aria-labelledby="ranking-answer-title">
      <div className="ranking-answer-copy">
        <p className="eyebrow">{insights.stats.eligibleProducts === 1
          ? pick(locale, "Aktuell einziges geeignetes Produkt", "Only eligible product")
          : pick(locale, "Aktuell stärkste Wahl", "Current top match")}</p>
        <h2 id="ranking-answer-title"><Link href={path(`/product/${product.slug}`)}>{product.name}</Link></h2>
        <p className="ranking-answer-lead">{insights.answer}</p>
        <div className="ranking-answer-signals">
          <div className="ranking-position-summary">
            <span>{pick(locale, "Platzierung", "Position")}</span>
            <strong>{pick(locale, `Platz 1 von ${insights.stats.eligibleProducts}`, `Rank 1 of ${insights.stats.eligibleProducts}`)}</strong>
            <small>{pick(locale, "in diesem Ranking", "in this ranking")}</small>
          </div>
          <div className="ranking-primary-metric"><span>{metric.label}</span><strong>{metric.value}</strong></div>
        </div>
        <ul className="ranking-reason-list">
          {insights.topReasons.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
        <div className="hero-actions">
          <Link className="button-link" href={path(`/product/${product.slug}`)}>{pick(locale, "Entscheidung im Detail", "View detailed decision")}</Link>
          <Link className="secondary-button-link" href={`${path("/compare")}?first=${encodeURIComponent(product.slug)}`}>{pick(locale, "Mit einem Produkt vergleichen", "Compare with another product")}</Link>
        </div>
      </div>
      <div className="ranking-answer-visual">
        <ProductVisual priority product={product} />
      </div>
    </section>
    <section className="ranking-tradeoff-band" aria-labelledby="ranking-tradeoff-title">
      <div>
        <p className="eyebrow">{pick(locale, "Vor der Entscheidung", "Before you decide")}</p>
        <h2 id="ranking-tradeoff-title">{pick(locale, "Was du bei Platz 1 prüfen solltest", "What to check about the top result")}</h2>
      </div>
      <ul>
        {insights.tradeoffs.map((tradeoff) => <li key={tradeoff}>{tradeoff}</li>)}
      </ul>
    </section>
  </>;
}
