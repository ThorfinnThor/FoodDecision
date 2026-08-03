"use client";

import { useEffect, useState } from "react";
import { PREFERENCES_KEY } from "@/lib/storage-keys";
import type { FinderCriteria } from "@/lib/product-insights";
import type { ScoreType } from "@/lib/types";

const defaultPreferences: Partial<FinderCriteria> = { goal: "overall_match", veganOnly: false, additiveFree: false, sweetenerFree: false, palmOilFree: false, excludedAllergens: [] };
const goals: Array<{ value: ScoreType; label: string }> = [{ value: "overall_match", label: "Beste Gesamtwahl" }, { value: "protein", label: "Proteinreich" }, { value: "low_sugar", label: "Wenig Zucker" }, { value: "ingredient_quality", label: "Gute Zutaten" }, { value: "family", label: "Für Familien" }, { value: "vegan", label: "Vegan" }];
const allergens = ["Milch", "Gluten", "Soja", "Eier", "Erdnüsse", "Mandeln", "Haselnüsse"];

export function PreferencesForm() {
  const [preferences, setPreferences] = useState<Partial<FinderCriteria>>(defaultPreferences);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setPreferences({ ...defaultPreferences, ...JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? "{}") }); } catch { setPreferences(defaultPreferences); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const update = <K extends keyof FinderCriteria>(key: K, value: FinderCriteria[K]) => { setSaved(false); setPreferences((current) => ({ ...current, [key]: value })); };
  const excluded = preferences.excludedAllergens ?? [];
  function save() { window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences)); setSaved(true); }

  return <section className="preferences-form"><fieldset><legend>Standard-Priorität</legend><div className="segmented-options">{goals.map((goal) => <button aria-pressed={preferences.goal === goal.value} key={goal.value} onClick={() => update("goal", goal.value)} type="button">{goal.label}</button>)}</div></fieldset><fieldset><legend>Dauerhafte Ausschlüsse</legend><div className="preferences-toggle-grid"><label><input checked={Boolean(preferences.veganOnly)} onChange={(event) => update("veganOnly", event.target.checked)} type="checkbox" />Nur vegan</label><label><input checked={Boolean(preferences.additiveFree)} onChange={(event) => update("additiveFree", event.target.checked)} type="checkbox" />Ohne typische Zusatzstoffe</label><label><input checked={Boolean(preferences.sweetenerFree)} onChange={(event) => update("sweetenerFree", event.target.checked)} type="checkbox" />Ohne Süßungsmittel</label><label><input checked={Boolean(preferences.palmOilFree)} onChange={(event) => update("palmOilFree", event.target.checked)} type="checkbox" />Ohne Palmöl</label></div></fieldset><fieldset><legend>Allergene standardmäßig ausschließen</legend><div className="check-chip-grid">{allergens.map((allergen) => <label key={allergen}><input checked={excluded.includes(allergen)} onChange={() => update("excludedAllergens", excluded.includes(allergen) ? excluded.filter((item) => item !== allergen) : [...excluded, allergen])} type="checkbox" /><span>{allergen}</span></label>)}</div><p className="filter-disclaimer">Die Einstellung ist eine Hilfe, keine Allergiegarantie. Verpackung immer prüfen.</p></fieldset><div className="preferences-actions"><button className="primary-button" onClick={save} type="button">Einstellungen speichern</button>{saved ? <span role="status">Lokal gespeichert</span> : null}</div></section>;
}
