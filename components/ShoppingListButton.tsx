"use client";

import { useEffect, useState } from "react";
import { readStoredIds, SAVED_STATE_EVENT, SHOPPING_LIST_KEY, toggleStoredId, trackEvent } from "@/lib/client-state";

export function ShoppingListButton({ productName, productSlug }: { productName: string; productSlug: string }) {
  const [selected, setSelected] = useState(false);

  useEffect(() => {
    const sync = () => setSelected(readStoredIds(SHOPPING_LIST_KEY).includes(productSlug));
    sync();
    window.addEventListener(SAVED_STATE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SAVED_STATE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [productSlug]);

  function toggle() {
    const next = toggleStoredId(SHOPPING_LIST_KEY, productSlug);
    setSelected(next);
    trackEvent("shopping_list_toggled", { entityType: "product", entityId: productSlug, metadata: { selected: next } });
  }

  return (
    <button
      aria-pressed={selected}
      className="save-command"
      onClick={toggle}
      title={selected ? "Von der Einkaufsliste entfernen" : "Auf die Einkaufsliste"}
      type="button"
    >
      <span aria-hidden="true">{selected ? "✓" : "+"}</span>
      {selected ? "Auf der Liste" : "Einkaufsliste"}
      <span className="sr-only">: {productName}</span>
    </button>
  );
}
