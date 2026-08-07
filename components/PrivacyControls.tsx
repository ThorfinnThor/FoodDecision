"use client";

import { useState, useSyncExternalStore } from "react";
import { analyticsEnabled, setAnalyticsEnabled } from "@/lib/client-state";
import { pick } from "@/lib/i18n";
import { ANALYTICS_PREFERENCE_EVENT } from "@/lib/storage-keys";
import type { SiteLocale } from "@/lib/types";

const APP_STORAGE_PREFIX = "food-decision:";

function clearAppStorage(storage: Storage) {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => Boolean(key?.startsWith(APP_STORAGE_PREFIX)));
  keys.forEach((key) => storage.removeItem(key));
}

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
  const [cleared, setCleared] = useState(false);
  const analytics = useSyncExternalStore(subscribeToAnalytics, analyticsEnabled, () => false);
  const doNotTrack = useSyncExternalStore(subscribeToBrowserState, () => navigator.doNotTrack === "1", () => false);
  const c = (de: string, en: string) => pick(locale, de, en);

  function updateAnalytics(enabled: boolean) {
    setAnalyticsEnabled(enabled);
    setCleared(false);
  }

  function clearData() {
    clearAppStorage(window.localStorage);
    clearAppStorage(window.sessionStorage);
    window.dispatchEvent(new Event(ANALYTICS_PREFERENCE_EVENT));
    setCleared(true);
    window.dispatchEvent(new CustomEvent("food-decision:saved-state"));
  }

  return (
    <section className="privacy-controls" aria-labelledby="privacy-controls-title">
      <div>
        <p className="eyebrow">{c("Deine Kontrolle", "Your control")}</p>
        <h2 id="privacy-controls-title">{c("Datenschutzeinstellungen auf diesem Gerät", "Privacy settings on this device")}</h2>
        <p>{c(
          "Ohne deine Zustimmung senden wir keine optionalen Nutzungsereignisse. Favoriten, Einkaufsliste, Finder-Präferenzen und Scanverlauf bleiben lokal in diesem Browser.",
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
        {cleared ? <p role="status">{c("Lokale Daten wurden gelöscht. Die optionale Statistik ist aus.", "Local data was deleted. Optional analytics is off.")}</p> : null}
      </div>
    </section>
  );
}
