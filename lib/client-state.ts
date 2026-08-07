"use client";

export { ANALYTICS_PREFERENCE_KEY, FAVORITES_KEY, PREFERENCES_KEY, SAVED_STATE_EVENT, SHOPPING_CHECKED_KEY, SHOPPING_LIST_KEY } from "./storage-keys";
import { ANALYTICS_PREFERENCE_EVENT, ANALYTICS_PREFERENCE_KEY, ANALYTICS_SESSION_KEY, SAVED_STATE_EVENT } from "./storage-keys";
import { cleanStoredIds, mergeStoredIds, toggleStoredIds, withoutStoredIds } from "./saved-state";

export function readStoredIds(key: string) {
  if (typeof window === "undefined") return [] as string[];
  try {
    return cleanStoredIds(JSON.parse(window.localStorage.getItem(key) ?? "[]"));
  } catch {
    return [];
  }
}

export function writeStoredIds(key: string, ids: string[]) {
  const next = cleanStoredIds(ids);
  window.localStorage.setItem(key, JSON.stringify(next));
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
  const existing = window.sessionStorage.getItem(ANALYTICS_SESSION_KEY);
  if (existing) return existing;
  const value = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.sessionStorage.setItem(ANALYTICS_SESSION_KEY, value);
  return value;
}

export function analyticsEnabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ANALYTICS_PREFERENCE_KEY) === "enabled" && navigator.doNotTrack !== "1";
}

export function setAnalyticsEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ANALYTICS_PREFERENCE_KEY, enabled ? "enabled" : "disabled");
  if (!enabled) window.sessionStorage.removeItem(ANALYTICS_SESSION_KEY);
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
    navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
}
