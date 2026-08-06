import Link from "next/link";
import { scoreByType } from "@/lib/scoring";
import type { Product, ScoreType } from "@/lib/types";
import { localizedPath, pick } from "@/lib/i18n";
import { FavoriteButton } from "./FavoriteButton";
import { ProductVisual } from "./ProductVisual";
import { ScorePill } from "./ScorePill";

export function ProductCard({
  product,
  matchScore,
  matchReasons,
  scoreType = "overall_match",
  contextMetric,
}: {
  product: Product;
  matchScore?: number;
  matchReasons?: string[];
  scoreType?: ScoreType;
  contextMetric?: { label: string; value: string };
}) {
  const path = (value: string) => localizedPath(product.locale, value);
  const score = scoreByType(product, scoreType) ?? scoreByType(product, "overall_match") ?? product.scores[0];
  const selectedBenefits = score?.positives ?? [];
  const explainedBenefits = [
    ...selectedBenefits,
    ...product.scores.filter((item) => item.type !== scoreType && item.type !== "overall_match").flatMap((item) => item.positives),
  ];
  const benefits = explainedBenefits.length
    ? [...new Set(explainedBenefits)].slice(0, 3)
    : [
        product.nutrition.sugar !== null ? `${product.nutrition.sugar} g ${pick(product.locale, "Zucker", "sugar")} ${pick(product.locale, "pro", "per")} ${product.nutrition.basis}` : null,
        product.nutrition.protein !== null ? `${product.nutrition.protein} g ${pick(product.locale, "Protein", "protein")} ${pick(product.locale, "pro", "per")} ${product.nutrition.basis}` : null,
        product.labels[0] ?? null,
      ].filter((item): item is string => Boolean(item));

  return (
    <article className="product-card">
      <div className="product-card-media">
        <ProductVisual product={product} compact />
        <FavoriteButton locale={product.locale} productName={product.name} productSlug={product.slug} />
      </div>
      <div className="product-card-body">
        <div className="product-card-heading">
          <div>
            <p className="product-meta">{product.brand} · {product.categoryLabel}</p>
            <h3><Link href={path(`/product/${product.slug}`)}>{product.name}</Link></h3>
          </div>
          {matchScore !== undefined ? <span className="match-score"><small>Match</small><strong>{matchScore}%</strong></span> : score ? <ScorePill score={score} compact locale={product.locale} /> : null}
        </div>
        {contextMetric ? <div className="product-context-metric"><span>{contextMetric.label}</span><strong>{contextMetric.value}</strong></div> : null}
        <ul className="benefit-list">
          {(matchReasons?.length ? matchReasons : benefits).map((benefit) => <li key={benefit}>{benefit}</li>)}
        </ul>
        <div className="product-card-actions">
          <Link className="text-link" href={path(`/product/${product.slug}`)}>{pick(product.locale, "Entscheidung ansehen", "View decision")} <span aria-hidden="true">→</span></Link>
          <Link className="quiet-link" href={`${path("/compare")}?first=${encodeURIComponent(product.slug)}`}>{pick(product.locale, "Vergleichen", "Compare")}</Link>
        </div>
      </div>
    </article>
  );
}
