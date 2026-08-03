"use client";

import { useEffect, useMemo, useState } from "react";
import { readStoredIds, SAVED_STATE_EVENT } from "@/lib/client-state";
import type { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";

export function SavedProducts({ emptyCopy, products, storageKey }: { emptyCopy: string; products: Product[]; storageKey: string }) {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => setIds(readStoredIds(storageKey));
    sync();
    window.addEventListener(SAVED_STATE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SAVED_STATE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [storageKey]);
  const saved = useMemo(() => ids.flatMap((id) => products.find((product) => product.slug === id) ?? []), [ids, products]);

  if (!saved.length) return <div className="empty-state"><h2>Noch nichts gespeichert</h2><p>{emptyCopy}</p></div>;
  return <div className="product-grid">{saved.map((product) => <ProductCard key={product.id} product={product} />)}</div>;
}
