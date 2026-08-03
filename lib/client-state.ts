"use client";

export { FAVORITES_KEY, PREFERENCES_KEY, SAVED_STATE_EVENT, SHOPPING_LIST_KEY } from "./storage-keys";
import { SAVED_STATE_EVENT } from "./storage-keys";

export function readStoredIds(key: string) {
  if (typeof window === "undefined") return [] as string[];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function toggleStoredId(key: string, id: string) {
  const ids = new Set(readStoredIds(key));
  const selected = !ids.has(id);
  if (selected) ids.add(id);
  else ids.delete(id);
  window.localStorage.setItem(key, JSON.stringify([...ids]));
  window.dispatchEvent(new CustomEvent(SAVED_STATE_EVENT, { detail: { key, id, selected } }));
  return selected;
}

function sessionId() {
  const key = "food-decision:session";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const value = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.sessionStorage.setItem(key, value);
  return value;
}

export function trackEvent(
  eventName: string,
  details: { entityType?: string; entityId?: string; metadata?: Record<string, unknown> } = {},
) {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({
    eventName,
    sessionId: sessionId(),
    path: `${window.location.pathname}${window.location.search}`,
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
