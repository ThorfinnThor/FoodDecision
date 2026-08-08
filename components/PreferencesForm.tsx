"use client";

import { useEffect, useState } from "react";
import { PREFERENCES_KEY } from "@/lib/storage-keys";
import { finderCriteriaFromStored, type FinderCriteria } from "@/lib/product-insights";
import type { ScoreType, SiteLocale } from "@/lib/types";

const defaultPreferences: Partial<FinderCriteria> = { goal: "overall_match", veganOnly: false, additiveFree: false, sweetenerFree: false, palmOilFree: false, excludedAllergens: [] };
const goals: Array<{ value: ScoreType; label: string }> = [{ value: "overall_match", label: "Beste Gesamtwahl" }, { value: "protein", label: "Proteinreich" }, { value: "low_sugar", label: "Wenig Zucker" }, { value: "ingredient_quality", label: "Gute Zutaten" }, { value: "family", label: "Für Familien" }, { value: "vegan", label: "Vegan" }];
const allergens = { "de-DE": ["Milch", "Gluten", "Soja", "Eier", "Erdnüsse", "Mandeln", "Haselnüsse"], "en-US": ["milk", "gluten", "soy", "eggs", "peanuts", "almonds", "hazelnuts"] } as const;

export function PreferencesForm({ locale }: { locale: SiteLocale }) {
  const storageKey = `${PREFERENCES_KEY}:${locale}`;
  const en = locale === "en-US";
  const [preferences, setPreferences] = useState<Partial<FinderCriteria>>(defaultPreferences);
  const [saved, setSaved] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (hasInteracted) return;
      try {
        const stored = window.localStorage.getItem(storageKey);
        setPreferences(stored ? finderCriteriaFromStored(JSON.parse(stored), []) : defaultPreferences);
      } catch {
        setPreferences(defaultPreferences);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hasInteracted, storageKey]);
  const update = <K extends keyof FinderCriteria>(key: K, value: FinderCriteria[K]) => {
    setHasInteracted(true);
    setSaved(false);
    setPreferences((current) => ({ ...current, [key]: value }));
  };
  const excluded = preferences.excludedAllergens ?? [];
  function save() { window.localStorage.setItem(storageKey, JSON.stringify(preferences)); setSaved(true); }

  const goalLabels = en ? ["Best overall", "Higher protein", "Lower sugar", "Simpler ingredients", "Suitable for families", "Vegan"] : goals.map((goal) => goal.label);
  return <section className="preferences-form"><fieldset><legend>{en ? "Default priority" : "Standard-Priorität"}</legend><div className="segmented-options">{goals.map((goal,index) => <button aria-pressed={preferences.goal === goal.value} key={goal.value} onClick={() => update("goal", goal.value)} type="button">{goalLabels[index]}</button>)}</div></fieldset><fieldset><legend>{en ? "Persistent exclusions" : "Dauerhafte Ausschlüsse"}</legend><div className="preferences-toggle-grid"><label><input checked={Boolean(preferences.veganOnly)} onChange={(event) => update("veganOnly", event.target.checked)} type="checkbox" />{en ? "Vegan only" : "Nur vegan"}</label><label><input checked={Boolean(preferences.additiveFree)} onChange={(event) => update("additiveFree", event.target.checked)} type="checkbox" />{en ? "No common additives" : "Ohne typische Zusatzstoffe"}</label><label><input checked={Boolean(preferences.sweetenerFree)} onChange={(event) => update("sweetenerFree", event.target.checked)} type="checkbox" />{en ? "No sweeteners" : "Ohne Süßungsmittel"}</label><label><input checked={Boolean(preferences.palmOilFree)} onChange={(event) => update("palmOilFree", event.target.checked)} type="checkbox" />{en ? "No palm oil" : "Ohne Palmöl"}</label></div></fieldset><fieldset><legend>{en ? "Exclude allergens by default" : "Allergene standardmäßig ausschließen"}</legend><div className="check-chip-grid">{allergens[locale].map((allergen) => <label key={allergen}><input checked={excluded.includes(allergen)} onChange={() => update("excludedAllergens", excluded.includes(allergen) ? excluded.filter((item) => item !== allergen) : [...excluded, allergen])} type="checkbox" /><span>{allergen}</span></label>)}</div><p className="filter-disclaimer">{en ? "This is a convenience filter, not an allergy guarantee. Always check the package." : "Die Einstellung ist eine Hilfe, keine Allergiegarantie. Verpackung immer prüfen."}</p></fieldset><div className="preferences-actions"><button className="primary-button" onClick={save} type="button">{en ? "Save preferences" : "Einstellungen speichern"}</button>{saved ? <span role="status">{en ? "Saved locally" : "Lokal gespeichert"}</span> : null}</div></section>;
}
