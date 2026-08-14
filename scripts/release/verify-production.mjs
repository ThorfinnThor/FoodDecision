#!/usr/bin/env node

const productionUrl = String(process.env.PRODUCTION_URL ?? "https://compareyourfood.com").replace(/\/$/, "");
const expectedTimestamp = String(process.env.EXPECTED_CATALOG_TIMESTAMP ?? "").trim();
const attempts = Number(process.env.RELEASE_VERIFY_ATTEMPTS ?? "60");
const delayMs = Number(process.env.RELEASE_VERIFY_DELAY_MS ?? "15000");

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function request(path, options = {}) {
  const separator = path.includes("?") ? "&" : "?";
  return fetch(`${productionUrl}${path}${separator}release_check=${Date.now()}`, {
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
    ...options,
    headers: { "Cache-Control": "no-cache", ...options.headers },
  });
}

async function json(path) {
  const response = await request(path);
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
}

function catalogIsCurrent(manifest) {
  if (manifest.source !== "supabase") return false;
  if (!expectedTimestamp) return true;
  const actual = Date.parse(manifest.generatedAt);
  const expected = Date.parse(expectedTimestamp);
  return Number.isFinite(actual) && Number.isFinite(expected) && actual >= expected;
}

async function waitForCatalog() {
  let lastError = "production manifest did not become current";
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const manifest = await json("/data/manifest.json");
      if (catalogIsCurrent(manifest)) return manifest;
      lastError = `catalog source/timestamp is stale (${manifest.source}, ${manifest.generatedAt})`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    console.log(`Production not ready: ${lastError}. Attempt ${attempt}/${attempts}.`);
    if (attempt < attempts) await sleep(delayMs);
  }
  throw new Error(lastError);
}

async function expectStatus(path, expectedStatus = 200) {
  const response = await request(path);
  if (response.status !== expectedStatus) {
    throw new Error(`${path} returned ${response.status}; expected ${expectedStatus}`);
  }
}

async function verifyLocale(segment) {
  const manifest = await json(`/data/${segment}/manifest.json`);
  const localizedCatalogPaths = segment === "de"
    ? ["/de/category/hafermilch", "/de/best/wenig-zucker/hafermilch"]
    : ["/en-us/category/oat-milk", "/en-us/best/low-sugar/oat-milk"];
  const paths = [
    `/${segment}`,
    `/${segment}/products`,
    `/${segment}/finder`,
    `/${segment}/scan`,
    `/${segment}/best`,
    `/${segment}/compare`,
    `/${segment}/data-quality`,
    ...localizedCatalogPaths,
  ];
  const product = manifest.productSlugs?.[0];
  const comparison = manifest.comparisonPairs?.[0];
  if (product) paths.push(`/${segment}/product/${product}`);
  if (comparison) paths.push(`/${segment}/compare/${comparison}`);
  for (const path of paths) await expectStatus(path);
}

async function verifySecurityHeaders() {
  const response = await request("/de", { method: "HEAD" });
  const required = [
    "content-security-policy",
    "permissions-policy",
    "strict-transport-security",
    "x-content-type-options",
    "x-frame-options",
  ];
  const missing = required.filter((name) => !response.headers.get(name));
  if (missing.length) throw new Error(`Missing production security headers: ${missing.join(", ")}`);
}

await waitForCatalog();
await verifyLocale("de");
await verifyLocale("en-us");
await expectStatus("/de/product/__release-check-missing__", 404);
await verifySecurityHeaders();
console.log(`Verified production catalog, routes, 404 behavior, and security headers at ${productionUrl}.`);
