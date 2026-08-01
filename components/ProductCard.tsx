import Link from "next/link";
import { scoreByType } from "@/lib/scoring";
import type { Product } from "@/lib/types";
import { FavoriteButton } from "./FavoriteButton";
import { ProductVisual } from "./ProductVisual";
import { ScorePill } from "./ScorePill";

export function ProductCard({ product }: { product: Product }) {
  const score = scoreByType(product, "overall_match") ?? product.scores[0];
  const explainedBenefits = product.scores.filter((item) => item.type !== "overall_match").flatMap((item) => item.positives);
  const benefits = explainedBenefits.length
    ? [...new Set(explainedBenefits)].slice(0, 3)
    : [
        product.nutrition.sugar !== null ? `${product.nutrition.sugar} g Zucker pro ${product.nutrition.basis}` : null,
        product.nutrition.protein !== null ? `${product.nutrition.protein} g Protein pro ${product.nutrition.basis}` : null,
        product.labels[0] ?? null,
      ].filter((item): item is string => Boolean(item));

  return (
    <article className="product-card">
      <div className="product-card-media">
        <ProductVisual product={product} compact />
        <FavoriteButton productName={product.name} />
      </div>
      <div className="product-card-body">
        <div className="product-card-heading">
          <div>
            <p className="product-meta">{product.brand} · {product.categoryLabel}</p>
            <h3><Link href={`/product/${product.slug}`}>{product.name}</Link></h3>
          </div>
          {score ? <ScorePill score={score} compact /> : null}
        </div>
        <ul className="benefit-list">
          {benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
        </ul>
        <Link className="text-link" href={`/product/${product.slug}`}>Entscheidung ansehen <span aria-hidden="true">→</span></Link>
      </div>
    </article>
  );
}
