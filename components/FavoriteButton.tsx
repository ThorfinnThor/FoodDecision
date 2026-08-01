"use client";

import { useState } from "react";

export function FavoriteButton({ productName }: { productName: string }) {
  const [selected, setSelected] = useState(false);

  return (
    <button
      aria-label={`${productName} ${selected ? "aus Favoriten entfernen" : "zu Favoriten hinzufügen"}`}
      aria-pressed={selected}
      className="favorite-button"
      onClick={() => setSelected((value) => !value)}
      title={selected ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
      type="button"
    >
      <span aria-hidden="true">{selected ? "♥" : "♡"}</span>
    </button>
  );
}
