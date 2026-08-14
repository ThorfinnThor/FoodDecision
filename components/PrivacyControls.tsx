"use client";

import { useState, useSyncExternalStore } from "react";
import { analyticsEnabled, setAnalyticsEnabled } from "@/lib/client-state";
import { pick } from "@/lib/i18n";
import { ANALYTICS_PREFERENCE_EVENT } from "@/lib/storage-keys";
import type { SiteLocale } from "@/lib/types";
import { clearBrowserValues } from "@/lib/browser-storage";

const APP_STORAGE_PREFIX = "food-decision:";

function subscribeToAnalytics(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(ANALYTICS_PREFERENCE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(ANALYTICS_PREFERENCE_EVENT, callback);
  };
}

function subscribeToBrowserState() {
  return () => undefined;
}

export function PrivacyControls({ locale }: { locale: SiteLocale }) {
  const [clearStatus, setClearStatus] = useState<"idle" | "cleared" | "session-only">("idle");
  const analytics = useSyncExternalStore(subscribeToAnalytics, analyticsEnabled, () => false);
  const doNotTrack = useSyncExternalStore(subscribeToBrowserState, () => navigator.doNotTrack === "1", () => false);
  const c = (de: string, en: string) => pick(locale, de, en);

  function updateAnalytics(enabled: boolean) {
    setAnalyticsEnabled(enabled);
    setClearStatus("idle");
  }

  function clearData() {
    const localCleared = clearBrowserValues("local", APP_STORAGE_PREFIX);
    const sessionCleared = clearBrowserValues("session", APP_STORAGE_PREFIX);
    window.dispatchEvent(new Event(ANALYTICS_PREFERENCE_EVENT));
    setClearStatus(localCleared && sessionCleared ? "cleared" : "session-only");
    window.dispatchEvent(new CustomEvent("food-decision:saved-state"));
  }

  return (
    <section className="privacy-controls" aria-labelledby="privacy-controls-title">
      <div>
        <p className="eyebrow">{c("Deine Kontrolle", "Your control")}</p>
        <h2 id="privacy-controls-title">{c("Datenschutzeinstellungen auf diesem Gerät", "Privacy settings on this device")}</h2>
        <p>{c(
          "Ohne deine Zustimmung senden wir keine optionalen Nutzungsereignisse. Favoriten, Einkaufsliste, Einstellungen im Finder und Scanverlauf bleiben lokal in diesem Browser.",
          "Without your consent, we do not send optional usage events. Favorites, shopping lists, Finder preferences, and scan history stay locally in this browser.",
        )}</p>
      </div>
      <label className="privacy-toggle">
        <input
          checked={analytics}
          disabled={doNotTrack}
          onChange={(event) => updateAnalytics(event.target.checked)}
          role="switch"
          type="checkbox"
        />
        <span>
          <strong>{c("Anonyme Nutzungsstatistik erlauben", "Allow anonymous usage statistics")}</strong>
          <small>{doNotTrack
            ? c("Dein Browser sendet „Do Not Track“. Diese Einstellung bleibt deshalb aus.", "Your browser sends “Do Not Track,” so this setting remains off.")
            : c("Erfasst werden nur freigegebene Interaktionen, eine zufällige Sitzungskennung und der Seitenpfad ohne Suchparameter.", "Only approved interactions, a random session identifier, and the page path without query parameters are recorded.")}</small>
        </span>
      </label>
      <div className="privacy-clear-row">
        <button className="danger-command" onClick={clearData} type="button">{c("Alle lokalen Daten löschen", "Delete all local data")}</button>
        {clearStatus === "cleared" ? <p role="status">{c("Lokale Daten wurden gelöscht. Die optionale Statistik ist aus.", "Local data was deleted. Optional analytics is off.")}</p> : null}
        {clearStatus === "session-only" ? <p role="alert">{c("Die Daten dieser Sitzung wurden gelöscht. Der Browser hat den Zugriff auf den dauerhaften Speicher blockiert; prüfe deshalb zusätzlich die Website Daten in den Browser Einstellungen.", "This session's data was deleted. The browser blocked access to persistent storage, so also check this site's data in browser settings.")}</p> : null}
      </div>
    </section>
  );
}
