import Link from "next/link";
import { scoreByType } from "@/lib/scoring";
import type { Product } from "@/lib/types";
import { ProductVisual } from "./ProductVisual";
import { ScorePill } from "./ScorePill";

export function ProductCard({ product }: { product: Product }) {
  const score = scoreByType(product, "overall_match") ?? product.scores[0];

  return (
    <article className="product-card">
      <ProductVisual product={product} compact />
      <div className="product-card-body">
        <div>
          <p className="eyebrow">{product.brand}</p>
          <h3>{product.name}</h3>
          <p>{product.description}</p>
        </div>
        <ScorePill score={score} />
        <div className="card-actions">
          <Link href={`/product/${product.slug}`}>Produkt ansehen</Link>
          <Link href={`/category/${product.category}`}>Kategorie</Link>
        </div>
      </div>
    </article>
  );
}
