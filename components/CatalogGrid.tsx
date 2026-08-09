"use client";

import { Suspense, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { normalizeText } from "@/lib/product-insights";
import { compareRankedProducts } from "@/lib/ranking-order";
import { pick } from "@/lib/i18n";
import type { Category, Product, SiteLocale } from "@/lib/types";
import { ProductCard } from "./ProductCard";

type SortMode = "overall" | "low_sugar" | "protein" | "name";

export function CatalogGrid({ categories = [], locale = "de-DE", products }: { categories?: Category[]; locale?: SiteLocale; products: Product[] }) {
  return <Suspense fallback={<div className="catalog-browser" aria-busy="true" />}>
    <CatalogGridContent categories={categories} locale={locale} products={products} />
  </Suspense>;
}

function CatalogGridContent({ categories = [], locale = "de-DE", products }: { categories?: Category[]; locale?: SiteLocale; products: Product[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const categoryValue = searchParams.get("category") ?? "all";
  const category = categories.some((item) => item.slug === categoryValue) ? categoryValue : "all";
  const sortValue = searchParams.get("sort");
  const sort: SortMode = sortValue === "low_sugar" || sortValue === "protein" || sortValue === "name" ? sortValue : "overall";
  const onlyComplete = searchParams.get("complete") === "1";
  const pageValue = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
  const pageSize = 24;

  const updateUrl = (updates: Record<string, string | null>, history: "push" | "replace" = "replace") => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) next.delete(key);
      else next.set(key, value);
    });
    const href = `${pathname}${next.size ? `?${next.toString()}` : ""}`;
    router[history](href, { scroll: false });
  };

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
        return compareRankedProducts(a, b, scoreType);
      });
  }, [category, locale, onlyComplete, products, query, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const resetPage = (updates: Record<string, string | null>) => updateUrl({ ...updates, page: null });

  return (
    <div className="catalog-browser">
      <div className="catalog-toolbar">
        <label className="catalog-search"><span>{pick(locale, "Produkte durchsuchen", "Search products")}</span><input onChange={(event) => resetPage({ q: event.target.value.trim() ? event.target.value : null })} placeholder={pick(locale, "Produkt, Marke oder Zutat", "Product, brand, or ingredient")} type="search" value={query} /></label>
        {categories.length ? <label><span>{pick(locale, "Kategorie", "Category")}</span><select onChange={(event) => resetPage({ category: event.target.value === "all" ? null : event.target.value })} value={category}><option value="all">{pick(locale, "Alle Kategorien", "All categories")}</option>{categories.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label> : null}
        <label><span>{pick(locale, "Sortierung", "Sort")}</span><select onChange={(event) => resetPage({ sort: event.target.value === "overall" ? null : event.target.value })} value={sort}><option value="overall">{pick(locale, "Bestes Gesamturteil", "Best overall")}</option><option value="low_sugar">{pick(locale, "Wenig Zucker", "Lower sugar")}</option><option value="protein">{pick(locale, "Viel Protein", "Higher protein")}</option><option value="name">{pick(locale, "Name von A bis Z", "Name from A to Z")}</option></select></label>
        <label className="toolbar-check"><input checked={onlyComplete} onChange={(event) => resetPage({ complete: event.target.checked ? "1" : null })} type="checkbox" /><span>{pick(locale, "Ohne Qualitätshinweis", "No quality warnings")}</span></label>
      </div>

      <div className="catalog-result-line"><strong>{filtered.length} {pick(locale, "Produkte", "products")}</strong><span>{pick(locale, "Seite", "Page")} {currentPage} {pick(locale, "von", "of")} {pageCount}</span></div>
      {visible.length ? <div className="product-grid">{visible.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-state"><h3>{pick(locale, "Keine Produkte gefunden", "No products found")}</h3><p>{pick(locale, "Versuche einen kürzeren Suchbegriff oder entferne einen Filter.", "Try a shorter search or remove a filter.")}</p></div>}

      {pageCount > 1 ? <nav className="pagination" aria-label="Produktseiten">
        <button disabled={currentPage === 1} onClick={() => updateUrl({ page: currentPage - 1 > 1 ? String(currentPage - 1) : null }, "push")} type="button">{pick(locale, "Zurück", "Previous")}</button>
        <span>{currentPage} / {pageCount}</span>
        <button disabled={currentPage === pageCount} onClick={() => updateUrl({ page: String(Math.min(pageCount, currentPage + 1)) }, "push")} type="button">{pick(locale, "Weiter", "Next")}</button>
      </nav> : null}
    </div>
  );
}
