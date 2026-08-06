"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  addStoredIds,
  readStoredIds,
  removeStoredIds,
  SAVED_STATE_EVENT,
  SHOPPING_CHECKED_KEY,
  SHOPPING_LIST_KEY,
  trackEvent,
  writeStoredIds,
} from "@/lib/client-state";
import { localizedPath, pick } from "@/lib/i18n";
import { scoreByType } from "@/lib/scoring";
import type { Product, SiteLocale } from "@/lib/types";
import { FavoriteButton } from "./FavoriteButton";
import { ProductVisual } from "./ProductVisual";
import { ShoppingListButton } from "./ShoppingListButton";

type SavedMode = "favorites" | "shopping";
type ActionStatus = "idle" | "added" | "copied" | "copy-failed";

export function SavedProducts({
  emptyCopy,
  locale,
  mode,
  products,
  storageKey,
}: {
  emptyCopy: string;
  locale: SiteLocale;
  mode: SavedMode;
  products: Product[];
  storageKey: string;
}) {
  const [ids, setIds] = useState<string[]>([]);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [status, setStatus] = useState<ActionStatus>("idle");
  const checkedKey = `${SHOPPING_CHECKED_KEY}:${locale}`;
  const shoppingKey = `${SHOPPING_LIST_KEY}:${locale}`;
  const path = (value: string) => localizedPath(locale, value);

  useEffect(() => {
    const sync = () => {
      const nextIds = readStoredIds(storageKey);
      setIds(nextIds);
      setSelectedIds((current) => current.filter((id) => nextIds.includes(id)));
      if (mode === "shopping") setCheckedIds(readStoredIds(checkedKey).filter((id) => nextIds.includes(id)));
    };
    sync();
    window.addEventListener(SAVED_STATE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SAVED_STATE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [checkedKey, mode, storageKey]);

  const saved = useMemo(() => {
    const bySlug = new Map(products.map((product) => [product.slug, product]));
    return ids.flatMap((id) => bySlug.get(id) ?? []);
  }, [ids, products]);
  const selectedProducts = selectedIds.flatMap((id) => saved.find((product) => product.slug === id) ?? []);
  const compareHref = selectedProducts.length === 2
    ? path(`/compare/${selectedProducts[0].slug}-vs-${selectedProducts[1].slug}`)
    : path("/compare");

  function selectForComparison(id: string) {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : current.length < 2 ? [...current, id] : [current[1], id]);
  }

  function addAllToShoppingList() {
    addStoredIds(shoppingKey, saved.map((product) => product.slug));
    setStatus("added");
    trackEvent("favorites_added_to_shopping_list", { entityType: "collection", metadata: { count: saved.length } });
  }

  function toggleChecked(id: string) {
    const next = checkedIds.includes(id) ? checkedIds.filter((item) => item !== id) : [...checkedIds, id];
    setCheckedIds(writeStoredIds(checkedKey, next));
  }

  function removeCompleted() {
    removeStoredIds(storageKey, checkedIds);
    writeStoredIds(checkedKey, []);
    setCheckedIds([]);
    trackEvent("shopping_completed_removed", { entityType: "collection", metadata: { count: checkedIds.length } });
  }

  function clearAll() {
    writeStoredIds(storageKey, []);
    if (mode === "shopping") writeStoredIds(checkedKey, []);
    setSelectedIds([]);
    setCheckedIds([]);
    trackEvent("saved_collection_cleared", { entityType: mode, metadata: { count: saved.length } });
  }

  async function copyShoppingList() {
    const text = saved.map((product, index) => `${checkedIds.includes(product.slug) ? "[x]" : "[ ]"} ${index + 1}. ${product.name} - ${product.brand} (${product.categoryLabel})`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
      trackEvent("shopping_list_copied", { entityType: "collection", metadata: { count: saved.length } });
    } catch {
      setStatus("copy-failed");
    }
  }

  if (!saved.length) {
    return (
      <div className="empty-state saved-empty-state">
        <h2>{pick(locale, "Noch nichts gespeichert", "Nothing saved yet")}</h2>
        <p>{emptyCopy}</p>
        <Link className="button-link" href={path("/products")}>{pick(locale, "Produkte entdecken", "Browse products")}</Link>
      </div>
    );
  }

  return (
    <div className="saved-workspace">
      <div className="saved-toolbar">
        <div>
          <strong>{saved.length} {pick(locale, saved.length === 1 ? "Produkt" : "Produkte", saved.length === 1 ? "product" : "products")}</strong>
          <span>{mode === "favorites"
            ? pick(locale, `${selectedIds.length} von 2 für den Vergleich ausgewählt`, `${selectedIds.length} of 2 selected for comparison`)
            : pick(locale, `${checkedIds.length} erledigt`, `${checkedIds.length} completed`)}</span>
        </div>
        <div className="saved-toolbar-actions">
          {mode === "favorites" ? (
            <>
              <button className="secondary-command" onClick={addAllToShoppingList} type="button">{pick(locale, "Alle auf die Einkaufsliste", "Add all to shopping list")}</button>
              {selectedProducts.length === 2
                ? <Link className="button-link" href={compareHref}>{pick(locale, "Auswahl vergleichen", "Compare selection")}</Link>
                : <span aria-disabled="true" className="button-link is-disabled">{pick(locale, "Auswahl vergleichen", "Compare selection")}</span>}
            </>
          ) : (
            <>
              <button className="secondary-command" onClick={copyShoppingList} type="button">{pick(locale, "Liste kopieren", "Copy list")}</button>
              <button className="secondary-command" disabled={!checkedIds.length} onClick={removeCompleted} type="button">{pick(locale, "Erledigte entfernen", "Remove completed")}</button>
            </>
          )}
          <button className="danger-command" onClick={clearAll} type="button">{pick(locale, "Alle entfernen", "Remove all")}</button>
        </div>
      </div>

      {status !== "idle" ? (
        <p className={`saved-status${status === "copy-failed" ? " is-error" : ""}`} role="status">
          {status === "added" ? pick(locale, "Alle Favoriten wurden zur Einkaufsliste hinzugefügt.", "All favorites were added to the shopping list.") : null}
          {status === "copied" ? pick(locale, "Einkaufsliste wurde kopiert.", "Shopping list copied.") : null}
          {status === "copy-failed" ? pick(locale, "Kopieren war nicht möglich. Bitte Browser-Berechtigung prüfen.", "Could not copy. Check your browser permission.") : null}
        </p>
      ) : null}

      <div className="saved-product-list">
        {saved.map((product) => {
          const selected = selectedIds.includes(product.slug);
          const checked = checkedIds.includes(product.slug);
          const overall = scoreByType(product, "overall_match");
          return (
            <article className={`saved-product-row${checked ? " is-complete" : ""}`} key={product.id}>
              <label className="saved-product-check">
                <input
                  checked={mode === "favorites" ? selected : checked}
                  onChange={() => mode === "favorites" ? selectForComparison(product.slug) : toggleChecked(product.slug)}
                  type="checkbox"
                />
                <span>{mode === "favorites" ? pick(locale, "Für Vergleich auswählen", "Select for comparison") : pick(locale, "Als erledigt markieren", "Mark as completed")}</span>
              </label>
              <Link className="saved-product-media" href={path(`/product/${product.slug}`)}><ProductVisual compact product={product} /></Link>
              <div className="saved-product-copy">
                <p className="product-meta">{product.brand} · {product.categoryLabel}</p>
                <h2><Link href={path(`/product/${product.slug}`)}>{product.name}</Link></h2>
                <div className="saved-product-facts">
                  <span><small>{pick(locale, "Gesamt", "Overall")}</small><strong>{overall ? `${overall.score}/100` : "-"}</strong></span>
                  <span><small>{pick(locale, "Zucker", "Sugar")}</small><strong>{product.nutrition.sugar !== null ? `${product.nutrition.sugar} g` : "-"}</strong></span>
                  <span><small>{pick(locale, "Protein", "Protein")}</small><strong>{product.nutrition.protein !== null ? `${product.nutrition.protein} g` : "-"}</strong></span>
                </div>
              </div>
              <div className="saved-product-actions">
                <Link className="quiet-link" href={`${path("/compare")}?first=${encodeURIComponent(product.slug)}`}>{pick(locale, "Mit anderem Produkt vergleichen", "Compare with another product")}</Link>
                <div>
                  <FavoriteButton locale={locale} productName={product.name} productSlug={product.slug} />
                  <ShoppingListButton locale={locale} productName={product.name} productSlug={product.slug} />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
