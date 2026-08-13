"use client";

export { ANALYTICS_PREFERENCE_KEY, FAVORITES_KEY, FINDER_STATE_KEY, PREFERENCES_KEY, SAVED_STATE_EVENT, SHOPPING_CHECKED_KEY, SHOPPING_LIST_KEY } from "./storage-keys";
import { ANALYTICS_PREFERENCE_EVENT, ANALYTICS_PREFERENCE_KEY, ANALYTICS_SESSION_KEY, SAVED_STATE_EVENT } from "./storage-keys";
import { cleanStoredIds, mergeStoredIds, toggleStoredIds, withoutStoredIds } from "./saved-state";
import { readBrowserJson, readBrowserValue, removeBrowserValue, writeBrowserJson, writeBrowserValue } from "./browser-storage";

export function readStoredIds(key: string) {
  if (typeof window === "undefined") return [] as string[];
  try {
    return cleanStoredIds(readBrowserJson("local", key, []));
  } catch {
    return [];
  }
}

export function writeStoredIds(key: string, ids: string[]) {
  const next = cleanStoredIds(ids);
  writeBrowserJson("local", key, next);
  window.dispatchEvent(new CustomEvent(SAVED_STATE_EVENT, { detail: { key, ids: next } }));
  return next;
}

export function addStoredIds(key: string, ids: string[]) {
  return writeStoredIds(key, mergeStoredIds(readStoredIds(key), ids));
}

export function removeStoredIds(key: string, ids: string[]) {
  return writeStoredIds(key, withoutStoredIds(readStoredIds(key), ids));
}

export function toggleStoredId(key: string, id: string) {
  const { ids, selected } = toggleStoredIds(readStoredIds(key), id);
  writeStoredIds(key, ids);
  return selected;
}

function sessionId() {
  const existing = readBrowserValue("session", ANALYTICS_SESSION_KEY);
  if (existing) return existing;
  const value = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  writeBrowserValue("session", ANALYTICS_SESSION_KEY, value);
  return value;
}

export function analyticsEnabled() {
  if (typeof window === "undefined") return false;
  return readBrowserValue("local", ANALYTICS_PREFERENCE_KEY) === "enabled" && navigator.doNotTrack !== "1";
}

export function setAnalyticsEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  writeBrowserValue("local", ANALYTICS_PREFERENCE_KEY, enabled ? "enabled" : "disabled");
  if (!enabled) removeBrowserValue("session", ANALYTICS_SESSION_KEY);
  window.dispatchEvent(new Event(ANALYTICS_PREFERENCE_EVENT));
}

export function trackEvent(
  eventName: string,
  details: { entityType?: string; entityId?: string; metadata?: Record<string, unknown> } = {},
) {
  if (typeof window === "undefined" || !analyticsEnabled()) return;
  const body = JSON.stringify({
    eventName,
    sessionId: sessionId(),
    path: window.location.pathname,
    entityType: details.entityType,
    entityId: details.entityId,
    metadata: details.metadata ?? {},
  });
  if (navigator.sendBeacon) {
    if (navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }))) return;
  }
  void fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
}
