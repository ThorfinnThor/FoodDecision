#!/usr/bin/env node

import { lookup } from "node:dns/promises";
import { appendFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const DEFAULT_TIMEOUT_MS = 15_000;

function envBoolean(value, fallback = false) {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes"].includes(String(value).toLowerCase());
}

function normalizeUrl(value) {
  const url = new URL(String(value).trim());
  url.pathname = url.pathname.replace(/\/$/, "");
  url.search = "";
  url.hash = "";
  return url;
}

function sameHostReference(content, expectedOrigin) {
  return content.includes(expectedOrigin) && !content.includes("http://localhost");
}

function parseDate(value, label) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} is not a valid timestamp: ${value}`);
  return parsed;
}

export function readinessConfig(overrides = {}) {
  const target = normalizeUrl(overrides.targetUrl ?? process.env.READINESS_URL ?? process.env.PRODUCTION_URL ?? "https://www.compareyourfood.com");
  const publicOrigin = normalizeUrl(overrides.publicOrigin ?? process.env.EXPECTED_PUBLIC_ORIGIN ?? target.origin);
  return {
    target,
    publicOrigin,
    expectedCatalogTimestamp: String(overrides.expectedCatalogTimestamp ?? process.env.EXPECTED_CATALOG_TIMESTAMP ?? "").trim(),
    maxCatalogAgeHours: Number(overrides.maxCatalogAgeHours ?? process.env.PUBLIC_CATALOG_MAX_AGE_HOURS ?? "72"),
    requireLegalIdentity: overrides.requireLegalIdentity ?? envBoolean(process.env.REQUIRE_LEGAL_IDENTITY, true),
    skipDns: overrides.skipDns ?? envBoolean(process.env.SKIP_DNS_CHECK, false),
    allowHttp: overrides.allowHttp ?? envBoolean(process.env.ALLOW_HTTP_READINESS, false),
    timeoutMs: Number(overrides.timeoutMs ?? process.env.READINESS_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS),
    fetchImpl: overrides.fetchImpl ?? fetch,
    dnsLookup: overrides.dnsLookup ?? lookup,
  };
}

function reportMarkdown(report) {
  const rows = report.checks.map((check) => `| ${check.status === "pass" ? "PASS" : "FAIL"} | ${check.name} | ${check.detail.replace(/\|/g, "\\|")} |`);
  return [
    "## Public readiness",
    "",
    `**Result:** ${report.ready ? "READY" : "NOT READY"}`,
    `**Checked target:** ${report.target}`,
    `**Expected public origin:** ${report.publicOrigin}`,
    `**Catalog generated:** ${report.catalogGeneratedAt ?? "not verified"}`,
    "",
    "| Status | Check | Detail |",
    "| --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

export async function runPublicReadiness(overrides = {}) {
  const config = readinessConfig(overrides);
  const checks = [];
  let catalogGeneratedAt = null;

  async function check(name, operation) {
    try {
      const detail = await operation();
      checks.push({ name, status: "pass", detail: detail || "Verified" });
    } catch (error) {
      checks.push({ name, status: "fail", detail: error instanceof Error ? error.message : String(error) });
    }
  }

  async function request(path, options = {}) {
    const separator = path.includes("?") ? "&" : "?";
    const response = await config.fetchImpl(`${config.target.origin}${path}${separator}readiness_check=${Date.now()}`, {
      redirect: options.redirect ?? "follow",
      signal: AbortSignal.timeout(config.timeoutMs),
      ...options,
      headers: { "Cache-Control": "no-cache", ...options.headers },
    });
    return response;
  }

  async function text(path, options = {}) {
    const { acceptedStatuses = [200], ...requestOptions } = options;
    const response = await request(path, requestOptions);
    const accepted = acceptedStatuses;
    if (!accepted.includes(response.status)) throw new Error(`${path} returned ${response.status}`);
    return { response, body: await response.text() };
  }

  async function json(path) {
    const { body } = await text(path);
    try {
      return JSON.parse(body);
    } catch {
      throw new Error(`${path} did not return valid JSON`);
    }
  }

  await check("HTTPS", async () => {
    const local = ["localhost", "127.0.0.1", "::1"].includes(config.target.hostname);
    if (config.target.protocol !== "https:" && !(config.allowHttp && local)) throw new Error("The readiness target must use HTTPS");
    if (config.publicOrigin.protocol !== "https:" && !(config.allowHttp && local)) throw new Error("The public origin must use HTTPS");
    return `${config.target.origin} uses an accepted protocol`;
  });

  await check("DNS resolution", async () => {
    if (config.skipDns) return "Skipped by explicit local test configuration";
    const hosts = [...new Set([config.target.hostname, config.publicOrigin.hostname])];
    const resolutions = [];
    for (const host of hosts) {
      const addresses = await config.dnsLookup(host, { all: true });
      if (!addresses.length) throw new Error(`${host} did not resolve`);
      resolutions.push(`${host}: ${addresses.map((entry) => entry.address).join(", ")}`);
    }
    return resolutions.join("; ");
  });

  await check("Root locale redirect", async () => {
    const response = await request("/", { redirect: "manual" });
    if (![301, 302, 307, 308].includes(response.status)) throw new Error(`/ returned ${response.status}; expected a redirect to /de`);
    const location = response.headers.get("location");
    if (!location || !["/de", "/de/"].includes(new URL(location, config.target.origin).pathname)) throw new Error(`Root redirect points to ${location ?? "no location"}`);
    return `/ redirects to ${location}`;
  });

  await check("Supabase catalog", async () => {
    const rootManifest = await json("/data/manifest.json");
    if (rootManifest.source !== "supabase") throw new Error(`Catalog source is ${rootManifest.source}; expected supabase`);
    catalogGeneratedAt = rootManifest.generatedAt;
    const generated = parseDate(rootManifest.generatedAt, "Catalog generatedAt");
    if (generated > Date.now() + 10 * 60 * 1000) throw new Error("Catalog timestamp is in the future");
    if (Number.isFinite(config.maxCatalogAgeHours) && config.maxCatalogAgeHours > 0 && Date.now() - generated > config.maxCatalogAgeHours * 3_600_000) {
      throw new Error(`Catalog is older than ${config.maxCatalogAgeHours} hours`);
    }
    if (config.expectedCatalogTimestamp && generated < parseDate(config.expectedCatalogTimestamp, "Expected catalog timestamp")) {
      throw new Error(`Catalog ${rootManifest.generatedAt} predates ${config.expectedCatalogTimestamp}`);
    }
    if (!Array.isArray(rootManifest.locales) || !["DE", "US"].every((market) => rootManifest.locales.some((entry) => entry.market === market && entry.counts?.products > 0))) {
      throw new Error("Both DE and US need published products");
    }
    return `Supabase catalog ${rootManifest.generatedAt} contains DE and US products`;
  });

  const localeDetails = [];
  for (const segment of ["de", "en-us"]) {
    await check(`${segment} public journey`, async () => {
      const manifest = await json(`/data/${segment}/manifest.json`);
      if (!manifest.productSlugs?.length || !manifest.categorySlugs?.length || !manifest.rankingPages?.length) {
        throw new Error(`${segment} catalog lacks products, categories, or rankings`);
      }
      const category = segment === "de" ? "/de/category/hafermilch" : "/en-us/category/oat-milk";
      const ranking = segment === "de" ? "/de/best/wenig-zucker/hafermilch" : "/en-us/best/low-sugar/oat-milk";
      const routes = [
        `/${segment}`,
        `/${segment}/products`,
        `/${segment}/finder`,
        `/${segment}/compare`,
        `/${segment}/data-quality`,
        `/${segment}/methodology`,
        `/${segment}/privacy`,
        `/${segment}/legal-notice`,
        category,
        ranking,
        `/${segment}/product/${manifest.productSlugs[0]}`,
      ];
      if (manifest.comparisonPairs?.[0]) routes.push(`/${segment}/compare/${manifest.comparisonPairs[0]}`);
      for (const route of routes) {
        const response = await request(route);
        if (response.status !== 200) throw new Error(`${route} returned ${response.status}`);
      }
      const home = await text(`/${segment}`);
      if (!home.body.includes("Compare Your Food")) throw new Error(`${segment} home does not identify the product`);
      if (!sameHostReference(home.body, config.publicOrigin.origin)) throw new Error(`${segment} home does not reference ${config.publicOrigin.origin}`);
      localeDetails.push(`${segment}: ${routes.length} routes`);
      return `${routes.length} routes and canonical origin verified`;
    });
  }

  await check("Public discovery files", async () => {
    for (const path of ["/robots.txt", "/sitemap.xml", "/llms.txt", "/llms-full.txt"]) {
      const result = await text(path);
      if (!sameHostReference(result.body, config.publicOrigin.origin)) throw new Error(`${path} does not reference ${config.publicOrigin.origin}`);
    }
    return "robots, sitemap, llms.txt, and llms-full.txt use the public origin";
  });

  await check("Legal identity", async () => {
    if (!config.requireLegalIdentity) return "Not required for this internal release check";
    const incompleteSignals = [
      "Vor dem öffentlichen Launch",
      "Before public launch",
      "Betreiberangaben und Datenschutzadresse sind noch nicht vollständig konfiguriert",
      "The operator details and privacy contact are not fully configured yet",
      "Pflichtangaben noch nicht vollständig",
      "Required details are not complete yet",
    ];
    for (const segment of ["de", "en-us"]) {
      for (const route of ["privacy", "legal-notice"]) {
        const { body } = await text(`/${segment}/${route}`);
        if (incompleteSignals.some((signal) => body.includes(signal))) {
          throw new Error(`${segment} ${route} page still contains an incomplete legal identity warning`);
        }
        if (!/mailto:[^\"'<\s]+@[^\"'<\s]+/.test(body)) throw new Error(`${segment} ${route} page lacks a working contact email link`);
      }
    }
    return "Operator identity, legal contact, and privacy contact are published in both locales";
  });

  await check("Security headers", async () => {
    const response = await request("/de", { method: "HEAD" });
    const required = [
      "content-security-policy",
      "permissions-policy",
      "referrer-policy",
      "strict-transport-security",
      "x-content-type-options",
      "x-frame-options",
    ];
    const missing = required.filter((name) => !response.headers.get(name));
    if (missing.length) throw new Error(`Missing headers: ${missing.join(", ")}`);
    const permissions = response.headers.get("permissions-policy") ?? "";
    if (!permissions.includes("camera=()") || !permissions.includes("microphone=()")) throw new Error("Camera or microphone is not explicitly disabled");
    return "Required headers are present and camera and microphone are disabled";
  });

  await check("Not found behavior", async () => {
    const response = await request("/de/product/__public-readiness-missing__");
    if (response.status !== 404) throw new Error(`Missing product returned ${response.status}`);
    return "Unknown product returns 404";
  });

  const report = {
    ready: checks.every((entry) => entry.status === "pass"),
    checkedAt: new Date().toISOString(),
    target: config.target.origin,
    publicOrigin: config.publicOrigin.origin,
    catalogGeneratedAt,
    localeDetails,
    checks,
  };
  return { ...report, markdown: reportMarkdown(report) };
}

async function main() {
  const report = await runPublicReadiness();
  const reportPath = process.env.READINESS_REPORT_PATH?.trim();
  if (reportPath) await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, report.markdown);
  console.log(report.markdown);
  if (!report.ready) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
