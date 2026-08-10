"use client";

import Image from "next/image";
import { useState } from "react";
import type { Product } from "@/lib/types";

export function ProductVisual({
  product,
  compact = false,
  priority = false,
}: {
  product: Product;
  compact?: boolean;
  priority?: boolean;
}) {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const imageUrl = product.imageUrl ?? null;
  const showImage = Boolean(imageUrl && failedUrl !== imageUrl);
  const imageLoaded = Boolean(imageUrl && loadedUrl === imageUrl);

  const packshot = (
    <div className="packshot">
      <span>{product.brand}</span>
      <strong>{product.name}</strong>
      <small>{product.categoryLabel}</small>
    </div>
  );

  return (
    <div className={`product-visual tone-${product.imageTone} ${compact ? "product-visual-compact" : ""}`}>
      {showImage && imageUrl ? (
        <div className={`product-image ${imageLoaded ? "is-loaded" : "is-loading"}`}>
          <div aria-hidden={imageLoaded} className="product-image-placeholder">{packshot}</div>
          <Image
            alt={`${product.name} ${product.locale === "de-DE" ? "von" : "by"} ${product.brand}`}
            className="product-image-content"
            fill
            onError={() => setFailedUrl(imageUrl)}
            onLoad={() => setLoadedUrl(imageUrl)}
            priority={priority}
            sizes={compact
              ? "(max-width: 600px) calc(100vw - 32px), (max-width: 1080px) 50vw, 25vw"
              : "(max-width: 860px) calc(100vw - 32px), 42vw"}
            src={imageUrl}
          />
        </div>
      ) : (
        packshot
      )}
    </div>
  );
}
