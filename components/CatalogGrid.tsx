"use client";

import { useMemo, useState } from "react";
import { normalizeText } from "@/lib/product-insights";
import { scoreByType } from "@/lib/scoring";
import { pick } from "@/lib/i18n";
import type { Category, Product, SiteLocale } from "@/lib/types";
import { ProductCard } from "./ProductCard";

type SortMode = "overall" | "low_sugar" | "protein" | "name";

export function CatalogGrid({ categories = [], locale = "de-DE", products }: { categories?: Category[]; locale?: SiteLocale; products: Product[] }) {
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
        if (sort === "name") return a.name.localeCompare(b.name, locale);
        const scoreType = sort === "overall" ? "overall_match" : sort;
        return (scoreByType(b, scoreType)?.score ?? -1) - (scoreByType(a, scoreType)?.score ?? -1);
      });
  }, [category, locale, onlyComplete, products, query, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const resetPage = (action: () => void) => { action(); setPage(1); };

  return (
    <div className="catalog-browser">
      <div className="catalog-toolbar">
        <label className="catalog-search"><span>{pick(locale, "Produkte durchsuchen", "Search products")}</span><input onChange={(event) => resetPage(() => setQuery(event.target.value))} placeholder={pick(locale, "Produkt, Marke oder Zutat", "Product, brand, or ingredient")} type="search" value={query} /></label>
        {categories.length ? <label><span>{pick(locale, "Kategorie", "Category")}</span><select onChange={(event) => resetPage(() => setCategory(event.target.value))} value={category}><option value="all">{pick(locale, "Alle Kategorien", "All categories")}</option>{categories.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label> : null}
        <label><span>{pick(locale, "Sortierung", "Sort")}</span><select onChange={(event) => resetPage(() => setSort(event.target.value as SortMode))} value={sort}><option value="overall">{pick(locale, "Bestes Gesamturteil", "Best overall")}</option><option value="low_sugar">{pick(locale, "Wenig Zucker", "Lower sugar")}</option><option value="protein">{pick(locale, "Viel Protein", "Higher protein")}</option><option value="name">{pick(locale, "Name von A bis Z", "Name from A to Z")}</option></select></label>
        <label className="toolbar-check"><input checked={onlyComplete} onChange={(event) => resetPage(() => setOnlyComplete(event.target.checked))} type="checkbox" /><span>{pick(locale, "Ohne Qualitätshinweis", "No quality warnings")}</span></label>
      </div>

      <div className="catalog-result-line"><strong>{filtered.length} {pick(locale, "Produkte", "products")}</strong><span>{pick(locale, "Seite", "Page")} {currentPage} {pick(locale, "von", "of")} {pageCount}</span></div>
      {visible.length ? <div className="product-grid">{visible.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-state"><h3>{pick(locale, "Keine Produkte gefunden", "No products found")}</h3><p>{pick(locale, "Versuche einen kürzeren Suchbegriff oder entferne einen Filter.", "Try a shorter search or remove a filter.")}</p></div>}

      {pageCount > 1 ? <nav className="pagination" aria-label="Produktseiten">
        <button disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">{pick(locale, "Zurück", "Previous")}</button>
        <span>{currentPage} / {pageCount}</span>
        <button disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} type="button">{pick(locale, "Weiter", "Next")}</button>
      </nav> : null}
    </div>
  );
}
