"use client";

import { useEffect, useState } from "react";
import { pick } from "@/lib/i18n";
import { STORAGE_PERSISTENCE_EVENT } from "@/lib/storage-keys";
import type { SiteLocale } from "@/lib/types";

type PersistenceDetail = { area?: "local" | "session"; persisted?: boolean };

export function StoragePersistenceNotice({ locale }: { locale: SiteLocale }) {
  const [failedAreas, setFailedAreas] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<PersistenceDetail>).detail;
      if (!detail?.area) return;
      const area = detail.area;
      setFailedAreas((current) => {
        const next = new Set(current);
        if (detail.persisted) next.delete(area);
        else next.add(area);
        return next;
      });
    };
    window.addEventListener(STORAGE_PERSISTENCE_EVENT, update);
    return () => window.removeEventListener(STORAGE_PERSISTENCE_EVENT, update);
  }, []);

  if (!failedAreas.size) return null;
  return (
    <div className="storage-persistence-notice" role="status">
      {pick(
        locale,
        "Dein Browser speichert diese Auswahl gerade nur für die aktuelle Sitzung. Prüfe die Browser Einstellungen, wenn sie nach dem Schließen erhalten bleiben soll.",
        "Your browser is keeping this choice for the current session only. Check browser settings if you want it to remain after closing the tab.",
      )}
    </div>
  );
}
