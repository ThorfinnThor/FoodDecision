import Image from "next/image";
import type { Product } from "@/lib/types";

export function ProductVisual({ product, compact = false }: { product: Product; compact?: boolean }) {
  return (
    <div className={`product-visual tone-${product.imageTone} ${compact ? "product-visual-compact" : ""}`}>
      {product.imageUrl ? (
        <div className="product-image">
          <Image
            alt={`${product.name} ${product.locale === "de-DE" ? "von" : "by"} ${product.brand}`}
            fill
            sizes={compact ? "(max-width: 860px) 100vw, 160px" : "(max-width: 860px) 100vw, 42vw"}
            src={product.imageUrl}
            unoptimized
          />
        </div>
      ) : (
        <div className="packshot">
          <span>{product.brand}</span>
          <strong>{product.name}</strong>
          <small>{product.categoryLabel}</small>
        </div>
      )}
    </div>
  );
}
