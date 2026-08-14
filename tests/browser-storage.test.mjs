import assert from "node:assert/strict";
import test from "node:test";

function storage() {
  const values = new Map();
  return {
    get length() { return values.size; },
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  };
}

test("does not resurrect a value after authoritative browser storage deletion", async () => {
  const localStorage = storage();
  const sessionStorage = storage();
  globalThis.window = {
    localStorage,
    sessionStorage,
    dispatchEvent: () => true,
  };
  const { readBrowserValue, writeBrowserValue } = await import(`../lib/browser-storage.ts?test=${Date.now()}`);
  assert.equal(writeBrowserValue("local", "food-decision:test", "saved"), true);
  assert.equal(readBrowserValue("local", "food-decision:test"), "saved");
  localStorage.removeItem("food-decision:test");
  assert.equal(readBrowserValue("local", "food-decision:test"), null);
  delete globalThis.window;
});
