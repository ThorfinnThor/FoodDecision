"use client";

import { useState } from "react";
import { pick } from "@/lib/i18n";
import type { Product, SiteLocale } from "@/lib/types";
import { ProductCard } from "./ProductCard";

export function RankingList({ locale, products }: { locale: SiteLocale; products: Product[] }) {
  const [visible, setVisible] = useState(25);
  return <><div className="ranking-list">{products.slice(0, visible).map((product, index) => <div className="ranking-row" key={product.id}><span className="rank-number">{index + 1}</span><ProductCard product={product} /></div>)}</div>{visible < products.length ? <button className="load-more-button" onClick={() => setVisible((count) => count + 25)} type="button">{pick(locale, "Weitere Platzierungen laden", "Load more rankings")}</button> : null}</>;
}
