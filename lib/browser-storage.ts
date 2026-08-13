"use client";

type StorageArea = "local" | "session";

const memory = new Map<string, string>();

function memoryKey(area: StorageArea, key: string) {
  return `${area}:${key}`;
}

function browserStorage(area: StorageArea) {
  if (typeof window === "undefined") return null;
  try {
    return area === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readBrowserValue(area: StorageArea, key: string) {
  const storage = browserStorage(area);
  if (storage) {
    try {
      const value = storage.getItem(key);
      if (value !== null) memory.set(memoryKey(area, key), value);
      return value ?? memory.get(memoryKey(area, key)) ?? null;
    } catch {
      // Fall through to the in-memory value when storage is restricted.
    }
  }
  return memory.get(memoryKey(area, key)) ?? null;
}

export function writeBrowserValue(area: StorageArea, key: string, value: string) {
  memory.set(memoryKey(area, key), value);
  const storage = browserStorage(area);
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeBrowserValue(area: StorageArea, key: string) {
  memory.delete(memoryKey(area, key));
  const storage = browserStorage(area);
  if (!storage) return false;
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function readBrowserJson<T>(area: StorageArea, key: string, fallback: T): T {
  const value = readBrowserValue(area, key);
  if (value === null) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function writeBrowserJson(area: StorageArea, key: string, value: unknown) {
  return writeBrowserValue(area, key, JSON.stringify(value));
}

export function clearBrowserValues(area: StorageArea, prefix: string) {
  for (const key of [...memory.keys()]) {
    if (key.startsWith(`${area}:${prefix}`)) memory.delete(key);
  }
  const storage = browserStorage(area);
  if (!storage) return false;
  try {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
      .filter((key): key is string => Boolean(key?.startsWith(prefix)));
    keys.forEach((key) => storage.removeItem(key));
    return true;
  } catch {
    return false;
  }
}
