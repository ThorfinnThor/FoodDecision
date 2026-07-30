import type { Product } from "@/lib/types";

export function ProductVisual({ product, compact = false }: { product: Product; compact?: boolean }) {
  return (
    <div className={`product-visual tone-${product.imageTone} ${compact ? "product-visual-compact" : ""}`}>
      <div className="packshot">
        <span>{product.brand}</span>
        <strong>{product.name}</strong>
        <small>{product.categoryLabel}</small>
      </div>
    </div>
  );
}
