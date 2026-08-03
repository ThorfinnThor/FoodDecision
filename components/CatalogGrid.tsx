"use client";

import { useMemo, useState } from "react";
import { normalizeText } from "@/lib/product-insights";
import { scoreByType } from "@/lib/scoring";
import type { Category, Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";

type SortMode = "overall" | "low_sugar" | "protein" | "name";

export function CatalogGrid({ categories = [], products }: { categories?: Category[]; products: Product[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<SortMode>("overall");
  const [onlyComplete, setOnlyComplete] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 24;

  const filtered = useMemo(() => {
    const needle = normalizeText(query.trim());
    return products
      .filter((product) => category === "all" || product.category === category)
      .filter((product) => !needle || normalizeText([product.name, product.brand, ...product.ingredients].join(" ")).includes(needle))
      .filter((product) => !onlyComplete || !product.qualityFlags.length)
      .slice()
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name, "de");
        const scoreType = sort === "overall" ? "overall_match" : sort;
        return (scoreByType(b, scoreType)?.score ?? -1) - (scoreByType(a, scoreType)?.score ?? -1);
      });
  }, [category, onlyComplete, products, query, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const resetPage = (action: () => void) => { action(); setPage(1); };

  return (
    <div className="catalog-browser">
      <div className="catalog-toolbar">
        <label className="catalog-search"><span>Produkte durchsuchen</span><input onChange={(event) => resetPage(() => setQuery(event.target.value))} placeholder="Produkt, Marke oder Zutat" type="search" value={query} /></label>
        {categories.length ? <label><span>Kategorie</span><select onChange={(event) => resetPage(() => setCategory(event.target.value))} value={category}><option value="all">Alle Kategorien</option>{categories.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label> : null}
        <label><span>Sortierung</span><select onChange={(event) => resetPage(() => setSort(event.target.value as SortMode))} value={sort}><option value="overall">Bestes Gesamturteil</option><option value="low_sugar">Wenig Zucker</option><option value="protein">Viel Protein</option><option value="name">Name A-Z</option></select></label>
        <label className="toolbar-check"><input checked={onlyComplete} onChange={(event) => resetPage(() => setOnlyComplete(event.target.checked))} type="checkbox" /><span>Ohne Qualitätshinweis</span></label>
      </div>

      <div className="catalog-result-line"><strong>{filtered.length} Produkte</strong><span>Seite {currentPage} von {pageCount}</span></div>
      {visible.length ? <div className="product-grid">{visible.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-state"><h3>Keine Produkte gefunden</h3><p>Versuche einen kürzeren Suchbegriff oder entferne einen Filter.</p></div>}

      {pageCount > 1 ? <nav className="pagination" aria-label="Produktseiten">
        <button disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">Zurück</button>
        <span>{currentPage} / {pageCount}</span>
        <button disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} type="button">Weiter</button>
      </nav> : null}
    </div>
  );
}
