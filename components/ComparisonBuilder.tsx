"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { scoreByType } from "@/lib/scoring";
import type { Category, Product } from "@/lib/types";
import { ProductVisual } from "./ProductVisual";
import { trackEvent } from "@/lib/client-state";

function ProductChoice({ label, onChange, products, value }: { label: string; onChange: (value: string) => void; products: Product[]; value: string }) {
  const product = products.find((item) => item.slug === value);
  return (
    <div className="comparison-choice">
      <label><span>{label}</span><select onChange={(event) => onChange(event.target.value)} value={value}><option value="">Produkt wählen</option>{products.map((item) => <option key={item.slug} value={item.slug}>{item.brand} - {item.name}</option>)}</select></label>
      {product ? <div className="comparison-choice-preview"><ProductVisual compact product={product} /><div><small>{product.brand}</small><strong>{product.name}</strong><span>{scoreByType(product, "overall_match")?.score ?? "?"}/100 Gesamturteil</span></div></div> : <div className="comparison-choice-empty">Noch kein Produkt ausgewählt</div>}
    </div>
  );
}

export function ComparisonBuilder({ categories, initialFirst, products }: { categories: Category[]; initialFirst: string; products: Product[] }) {
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
    router.push(`/compare/${first}-vs-${second}`);
  }

  return (
    <section className="comparison-builder">
      <div className="comparison-builder-toolbar"><label><span>Produktgruppe eingrenzen</span><select onChange={(event) => changeCategory(event.target.value)} value={category}><option value="all">Alle Kategorien</option>{categories.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label><span>{choices.length} Produkte verfügbar</span></div>
      <div className="comparison-choice-grid">
        <ProductChoice label="Produkt A" onChange={setFirst} products={choices} value={first} />
        <div className="versus-mark" aria-hidden="true">vs.</div>
        <ProductChoice label="Produkt B" onChange={setSecond} products={choices} value={second} />
      </div>
      {first && second && first === second ? <p className="form-error" role="alert">Bitte wähle zwei unterschiedliche Produkte.</p> : null}
      <button className="primary-button comparison-submit" disabled={!canCompare} onClick={compare} type="button">Vergleich anzeigen</button>
    </section>
  );
}
