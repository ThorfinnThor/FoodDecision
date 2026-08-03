"use client";

import { useEffect, useState } from "react";
import { FAVORITES_KEY, readStoredIds, SAVED_STATE_EVENT, toggleStoredId, trackEvent } from "@/lib/client-state";

export function FavoriteButton({ productName, productSlug }: { productName: string; productSlug: string }) {
  const [selected, setSelected] = useState(false);

  useEffect(() => {
    const sync = () => setSelected(readStoredIds(FAVORITES_KEY).includes(productSlug));
    sync();
    window.addEventListener(SAVED_STATE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SAVED_STATE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [productSlug]);

  function toggle() {
    const next = toggleStoredId(FAVORITES_KEY, productSlug);
    setSelected(next);
    trackEvent("favorite_toggled", { entityType: "product", entityId: productSlug, metadata: { selected: next } });
  }

  return (
    <button
      aria-label={`${productName} ${selected ? "aus Favoriten entfernen" : "zu Favoriten hinzufügen"}`}
      aria-pressed={selected}
      className="favorite-button"
      onClick={toggle}
      title={selected ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
      type="button"
    >
      <span aria-hidden="true">{selected ? "♥" : "♡"}</span>
    </button>
  );
}
