"use client";

import { useEffect, useState } from "react";
import { FAVORITES_KEY, readStoredIds, SAVED_STATE_EVENT, toggleStoredId, trackEvent } from "@/lib/client-state";
import type { SiteLocale } from "@/lib/types";

export function FavoriteButton({ locale = "de-DE", productName, productSlug }: { locale?: SiteLocale; productName: string; productSlug: string }) {
  const [selected, setSelected] = useState(false);
  const storageKey = `${FAVORITES_KEY}:${locale}`;

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
    trackEvent("favorite_toggled", { entityType: "product", entityId: productSlug, metadata: { selected: next } });
  }

  return (
    <button
      aria-label={`${productName} ${selected ? (locale === "de-DE" ? "aus Favoriten entfernen" : "remove from favorites") : (locale === "de-DE" ? "zu Favoriten hinzufügen" : "add to favorites")}`}
      aria-pressed={selected}
      className="favorite-button"
      onClick={toggle}
      title={selected ? (locale === "de-DE" ? "Aus Favoriten entfernen" : "Remove from favorites") : (locale === "de-DE" ? "Zu Favoriten hinzufügen" : "Add to favorites")}
      type="button"
    >
      <span aria-hidden="true">{selected ? "♥" : "♡"}</span>
    </button>
  );
}
