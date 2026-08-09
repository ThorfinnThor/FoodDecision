"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { scoreByType } from "@/lib/scoring";
import type { Category, Product } from "@/lib/types";
import { ProductVisual } from "./ProductVisual";
import { trackEvent } from "@/lib/client-state";
import { localizedPath, pick } from "@/lib/i18n";
import { normalizeText } from "@/lib/product-insights";
import type { SiteLocale } from "@/lib/types";

function ProductChoice({ excludeSlug, label, locale, onChange, products, value }: { excludeSlug: string; label: string; locale: SiteLocale; onChange: (value: string) => void; products: Product[]; value: string }) {
  const product = products.find((item) => item.slug === value);
  const [query, setQuery] = useState(product ? `${product.brand} · ${product.name}` : "");
  const [open, setOpen] = useState(false);
  const listId = useId();
  const results = useMemo(() => {
    const needle = normalizeText(query.trim());
    if (needle.length < 2) return [];
    return products
      .filter((item) => item.slug !== excludeSlug)
      .filter((item) => normalizeText(`${item.brand} ${item.name}`).includes(needle))
      .slice(0, 12);
  }, [excludeSlug, products, query]);

  function selectProduct(item: Product) {
    onChange(item.slug);
    setQuery(`${item.brand} · ${item.name}`);
    setOpen(false);
  }

  return (
    <div className="comparison-choice">
      <label className="comparison-product-search"><span>{label}</span><input aria-autocomplete="list" aria-controls={listId} aria-expanded={open && query.trim().length >= 2} autoComplete="off" onBlur={() => window.setTimeout(() => setOpen(false), 120)} onChange={(event) => { setQuery(event.target.value); setOpen(true); if (value) onChange(""); }} onFocus={() => setOpen(true)} placeholder={pick(locale, "Marke oder Produkt suchen", "Search brand or product")} role="combobox" type="search" value={query} /></label>
      {open ? <div className="comparison-choice-results" id={listId} role="listbox">
        {query.trim().length < 2 ? <p>{pick(locale, "Gib mindestens zwei Zeichen ein.", "Enter at least two characters.")}</p>
          : results.length ? results.map((item) => <button aria-selected={item.slug === value} key={item.slug} onMouseDown={(event) => event.preventDefault()} onClick={() => selectProduct(item)} role="option" type="button"><strong>{item.name}</strong><span>{item.brand} · {scoreByType(item, "overall_match")?.score ?? "?"}/100</span></button>)
            : <p>{pick(locale, "Kein passendes Produkt gefunden.", "No matching product found.")}</p>}
      </div> : null}
      {product ? <div className="comparison-choice-preview"><ProductVisual compact product={product} /><div><small>{product.brand}</small><strong>{product.name}</strong><span>{scoreByType(product, "overall_match")?.score ?? "?"}/100 {pick(locale, "Gesamturteil", "overall")}</span></div></div> : <div className="comparison-choice-empty">{pick(locale, "Noch kein Produkt ausgewählt", "No product selected")}</div>}
    </div>
  );
}

export function ComparisonBuilder({ categories, initialFirst, locale, products }: { categories: Category[]; initialFirst: string; locale: SiteLocale; products: Product[] }) {
  const router = useRouter();
  const initialProduct = products.find((product) => product.slug === initialFirst);
  const [category, setCategory] = useState(initialProduct?.category ?? "all");
  const [first, setFirst] = useState(initialProduct?.slug ?? "");
  const [second, setSecond] = useState("");
  const choices = useMemo(() => products.filter((product) => category === "all" || product.category === category), [category, products]);
  const canCompare = Boolean(first && second && first !== second);

  function changeCategory(value: string) {
    setCategory(value);
    const allowed = new Set(products.filter((product) => value === "all" || product.category === value).map((product) => product.slug));
    if (!allowed.has(first)) setFirst("");
    if (!allowed.has(second)) setSecond("");
  }

  function compare() {
    if (!canCompare) return;
    trackEvent("comparison_opened", { entityType: "comparison", entityId: `${first}-vs-${second}` });
    router.push(localizedPath(locale, `/compare/${first}-vs-${second}`));
  }

  return (
    <section className="comparison-builder">
      <div className="comparison-builder-toolbar"><label><span>{pick(locale, "Produktgruppe eingrenzen", "Limit product category")}</span><select onChange={(event) => changeCategory(event.target.value)} value={category}><option value="all">{pick(locale, "Alle Kategorien", "All categories")}</option>{categories.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label><span>{choices.length} {pick(locale, "Produkte verfügbar", "products available")}</span></div>
      <div className="comparison-choice-grid">
        <ProductChoice excludeSlug={second} key={`first-${category}`} label={pick(locale, "Produkt A", "Product A")} locale={locale} onChange={setFirst} products={choices} value={first} />
        <div className="versus-mark" aria-hidden="true">vs.</div>
        <ProductChoice excludeSlug={first} key={`second-${category}`} label={pick(locale, "Produkt B", "Product B")} locale={locale} onChange={setSecond} products={choices} value={second} />
      </div>
      {first && second && first === second ? <p className="form-error" role="alert">{pick(locale, "Bitte wähle zwei unterschiedliche Produkte.", "Choose two different products.")}</p> : null}
      <button className="primary-button comparison-submit" disabled={!canCompare} onClick={compare} type="button">{pick(locale, "Vergleich anzeigen", "Show comparison")}</button>
    </section>
  );
}
