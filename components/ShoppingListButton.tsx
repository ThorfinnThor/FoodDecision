"use client";

import { useEffect, useState } from "react";
import { readStoredIds, SAVED_STATE_EVENT, SHOPPING_LIST_KEY, toggleStoredId, trackEvent } from "@/lib/client-state";
import type { SiteLocale } from "@/lib/types";

export function ShoppingListButton({ locale = "de-DE", productName, productSlug }: { locale?: SiteLocale; productName: string; productSlug: string }) {
  const [selected, setSelected] = useState(false);
  const storageKey = `${SHOPPING_LIST_KEY}:${locale}`;

  useEffect(() => {
    const sync = (event?: Event) => {
      if (event instanceof CustomEvent && event.detail?.key !== storageKey) return;
      if (event instanceof StorageEvent && event.key !== storageKey) return;
      setSelected(readStoredIds(storageKey).includes(productSlug));
    };
    sync();
    window.addEventListener(SAVED_STATE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SAVED_STATE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [productSlug, storageKey]);

  function toggle() {
    const next = toggleStoredId(storageKey, productSlug);
    setSelected(next);
    trackEvent("shopping_list_toggled", { entityType: "product", entityId: productSlug, metadata: { selected: next } });
  }

  return (
    <button
      aria-pressed={selected}
      className="save-command"
      onClick={toggle}
      title={selected ? (locale === "de-DE" ? "Von der Einkaufsliste entfernen" : "Remove from shopping list") : (locale === "de-DE" ? "Auf die Einkaufsliste" : "Add to shopping list")}
      type="button"
    >
      <span aria-hidden="true">{selected ? "✓" : "+"}</span>
      {selected ? (locale === "de-DE" ? "Auf der Liste" : "On the list") : (locale === "de-DE" ? "Einkaufsliste" : "Shopping list")}
      <span className="sr-only">: {productName}</span>
    </button>
  );
}
