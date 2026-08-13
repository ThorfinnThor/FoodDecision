"use client";

import { useState } from "react";
import { pick } from "@/lib/i18n";
import { rankingMetric, rankingTieExplanation } from "@/lib/ranking-insights";
import type { Product, ScoreType, SiteLocale } from "@/lib/types";
import { ProductCard } from "./ProductCard";

export function RankingList({ locale, products, scoreType }: { locale: SiteLocale; products: Product[]; scoreType: ScoreType }) {
  const [visible, setVisible] = useState(25);
  return <><div className="ranking-list">{products.slice(0, visible).map((product, index) => {
    const metric = rankingMetric(product, scoreType);
    const tieExplanation = rankingTieExplanation(product, index > 0 ? products[index - 1] : null, scoreType);
    return <div className="ranking-row" key={product.id}>
      <div className="rank-position" aria-label={pick(locale, `Platz ${index + 1} von ${products.length}`, `Rank ${index + 1} of ${products.length}`)}>
        <span>{pick(locale, "Platz", "Rank")}</span>
        <strong>{index + 1}</strong>
        <small>{pick(locale, `von ${products.length}`, `of ${products.length}`)}</small>
      </div>
      <div className="ranking-product-cell">
        <ProductCard product={product} scoreType={scoreType} contextMetric={metric} showScore={false} />
        {tieExplanation ? <p className="ranking-tie-note">{tieExplanation}</p> : null}
      </div>
    </div>;
  })}</div>{visible < products.length ? <button className="load-more-button" onClick={() => setVisible((count) => count + 25)} type="button">{pick(locale, "Weitere Platzierungen laden", "Load more rankings")}</button> : null}</>;
}
