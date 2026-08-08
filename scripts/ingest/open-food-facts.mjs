#!/usr/bin/env node
import crypto from "node:crypto";
import { appendFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const OFF_SEARCH_URL = "https://world.openfoodfacts.org/api/v2/search";
const SOURCE_ID = "open-food-facts";
const SOURCE_NAME = "Open Food Facts";
const SOURCE_URL = "https://world.openfoodfacts.org";
const SOURCE_LICENSE = "ODbL database; DbCL contents; CC BY-SA product images";

export const categoryJobs = [
  {
    slug: "hafermilch",
    sources: [{ id: "oat-milks", offCategory: "oat-milks" }],
  },
  {
    slug: "proteinriegel",
    sources: [{ id: "protein-bars", offCategory: "protein-bars" }],
  },
  {
    slug: "muesli",
    sources: [{ id: "mueslis", offCategory: "mueslis" }],
  },
  {
    slug: "joghurt-skyr",
    sources: [{ id: "yogurts", offCategory: "yogurts" }],
  },
  {
    slug: "vegane-snacks",
    sources: [
      {
        id: "vegan-snacks",
        offCategory: "snacks",
        extraParams: { labels_tags_en: "Vegan" },
      },
    ],
  },
  {
    slug: "fruehstueckscerealien",
    sources: [{ id: "breakfast-cereals", offCategory: "breakfast-cereals" }],
  },
  {
    slug: "pflanzliche-joghurts",
    sources: [
      { id: "non-dairy-yogurts", offCategory: "non-dairy-yogurts", weight: 3 },
      { id: "soy-yogurts", offCategory: "soy-yogurts" },
      { id: "coconut-yogurts", offCategory: "coconut-yogurts" },
    ],
  },
  {
    slug: "brotaufstriche",
    sources: [{ id: "spreads", offCategory: "spreads" }],
  },
  {
    slug: "nussmuse",
    sources: [
      { id: "nut-butters", offCategory: "nut-butters", weight: 2 },
      { id: "peanut-butters", offCategory: "peanut-butters", weight: 2 },
      { id: "almond-butters", offCategory: "almond-butters" },
    ],
  },
  {
    slug: "fertiggerichte",
    sources: [{ id: "prepared-meals", offCategory: "prepared-meals" }],
  },
  {
    slug: "erfrischungsgetraenke",
    sources: [{ id: "soft-drinks", offCategory: "soft-drinks" }],
  },
  {
    slug: "kinder-snacks",
    sources: [
      { id: "cereal-bars", offCategory: "cereal-bars", weight: 3 },
      { id: "fruit-snacks", offCategory: "fruit-snacks" },
      { id: "applesauces", offCategory: "applesauces" },
      { id: "wheat-crackers", offCategory: "wheat-crackers" },
    ],
  },
];

const fields = [
  "code",
  "product_name",
  "product_name_de",
  "product_name_en",
  "brands",
  "categories_tags",
  "labels_tags",
  "countries_tags",
  "ingredients_text",
  "ingredients_text_de",
  "ingredients_text_en",
  "ingredients",
  "allergens_tags",
  "nutriments",
  "image_front_url",
  "image_url",
  "quantity",
  "serving_size",
  "last_modified_t",
  "completeness",
].join(",");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const pageSize = Number(process.env.OFF_PAGE_SIZE ?? "50");
const maxPages = Number(process.env.OFF_MAX_PAGES ?? "1");
const startPage = Number(process.env.OFF_START_PAGE ?? "1");
const requestDelayMs = Number(process.env.OFF_REQUEST_DELAY_MS ?? "7000");
const fetchRetries = Number(process.env.OFF_FETCH_RETRIES ?? "4");
const fetchRetryBaseMs = Number(process.env.OFF_FETCH_RETRY_BASE_MS ?? "10000");
const allowEmptyDryRun = process.env.OFF_ALLOW_EMPTY_DRY_RUN === "true";
if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
  throw new Error("OFF_PAGE_SIZE must be an integer between 1 and 100.");
}
if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 10) {
  throw new Error("OFF_MAX_PAGES must be an integer between 1 and 10.");
}
if (!Number.isInteger(startPage) || startPage < 1 || startPage > 50 || startPage + maxPages - 1 > 50) {
  throw new Error("OFF_START_PAGE must select a page window between 1 and 50.");
}
if (!Number.isFinite(requestDelayMs) || requestDelayMs < 0) {
  throw new Error("OFF_REQUEST_DELAY_MS must be a non-negative number.");
}
if (!Number.isInteger(fetchRetries) || fetchRetries < 1 || fetchRetries > 10) {
  throw new Error("OFF_FETCH_RETRIES must be an integer between 1 and 10.");
}
export function shouldContinueOnCategoryError(value = process.env.OFF_CONTINUE_ON_CATEGORY_ERROR) {
  return value !== "false";
}
export function shouldRejectEmptyImport(rowCount, isDryRun = dryRun, emptyDryRunAllowed = allowEmptyDryRun) {
  return rowCount === 0 && !(isDryRun && emptyDryRunAllowed);
}
const continueOnCategoryError = shouldContinueOnCategoryError();
const upsertBatchSize = Number(process.env.OFF_UPSERT_BATCH_SIZE ?? "100");
const marketConfigs = {
  DE: { locale: "de-DE", country: "Germany" },
  US: { locale: "en-US", country: "United States" },
};
const market = String(process.env.OFF_MARKET ?? "DE").toUpperCase();
if (!(market in marketConfigs)) throw new Error(`Unsupported OFF_MARKET: ${market}`);
const marketConfig = marketConfigs[market];
const locale = process.env.OFF_LOCALE ?? marketConfig.locale;
if (locale !== marketConfig.locale) {
  throw new Error(`OFF_LOCALE ${locale} does not match market ${market}. Expected ${marketConfig.locale}.`);
}
const country = process.env.OFF_COUNTRY ?? marketConfig.country;
const categorySelection = String(process.env.OFF_CATEGORY_SLUGS ?? "all")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const selectedCategoryJobs = categorySelection.includes("all")
  ? categoryJobs
  : categoryJobs.filter((job) => categorySelection.includes(job.slug));
const unknownCategories = categorySelection.filter(
  (slug) => slug !== "all" && !categoryJobs.some((job) => job.slug === slug),
);
if (unknownCategories.length) throw new Error(`Unknown OFF_CATEGORY_SLUGS: ${unknownCategories.join(", ")}`);
if (!selectedCategoryJobs.length) throw new Error("OFF_CATEGORY_SLUGS selected no categories.");
const userAgent =
  process.env.OFF_USER_AGENT ??
  "food-decision-engine/0.1 (configure OFF_USER_AGENT with a contact URL or email)";
let lastOffRequestAt = 0;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function minimumRequestWaitMs(lastRequestTimestamp, nowTimestamp, minimumDelayMs) {
  if (!lastRequestTimestamp) return 0;
  return Math.max(0, minimumDelayMs - (nowTimestamp - lastRequestTimestamp));
}

async function waitForOffRequestSlot() {
  const waitMs = minimumRequestWaitMs(lastOffRequestAt, Date.now(), requestDelayMs);
  if (waitMs > 0) await sleep(waitMs);
  lastOffRequestAt = Date.now();
}

function hashPayload(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function isRetriableStatus(status) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function retryDelayMs(response, attempt) {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return seconds * 1000;

    const retryAt = Date.parse(retryAfter);
    if (Number.isFinite(retryAt)) {
      return Math.max(0, retryAt - Date.now());
    }
  }

  return fetchRetryBaseMs * 2 ** (attempt - 1);
}

function clippedMessage(value, maxLength = 1000) {
  const text = String(value);
  return text.length > maxLength ? `${text.slice(0, maxLength)}... [truncated]` : text;
}

export function summaryFailureMessage(value) {
  return clippedMessage(value, 180).replace(/\s+/g, " ").trim();
}

export function sourceCoverageTable(sourceStats) {
  return [
    "| Category | OFF source | Page window | Products/page | Completed pages | Fetched | Unique accepted |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: |",
    ...sourceStats.map(
      (source) =>
        `| ${source.category} | ${source.source} | ${source.startPage}-${source.endPage} | ${source.pageSize} | ${source.completedPages} | ${source.fetchedProducts} | ${source.acceptedProducts} |`,
    ),
  ];
}

function modifiedAt(product) {
  if (!product.last_modified_t) return null;
  return new Date(Number(product.last_modified_t) * 1000).toISOString();
}

function mapProduct(product, categorySlug, importRunId) {
  const externalId = String(product.code ?? "").trim();
  if (!externalId) return null;

  return {
    external_id: externalId,
    gtin: externalId,
    category_slug: categorySlug,
    product_name:
      locale === "de-DE"
        ? product.product_name_de || product.product_name || null
        : product.product_name_en || product.product_name || null,
    brand_names: product.brands || null,
    countries_tags: product.countries_tags ?? [],
    categories_tags: product.categories_tags ?? [],
    labels_tags: product.labels_tags ?? [],
    image_url: product.image_front_url || product.image_url || null,
    last_modified_at: modifiedAt(product),
    payload_hash: hashPayload(product),
    payload: product,
    last_seen_at: new Date().toISOString(),
    import_run_id: importRunId,
    market,
    locale,
  };
}

export function allocateSourcePageSizes(totalPageSize, sources) {
  if (!Number.isInteger(totalPageSize) || totalPageSize < 1) {
    throw new Error("OFF_PAGE_SIZE must be a positive integer.");
  }
  if (!Array.isArray(sources) || !sources.length) {
    throw new Error("Every ingestion category must define at least one source.");
  }

  const weightedSources = sources.map((source, index) => ({
    index,
    weight: Number.isFinite(source.weight) && source.weight > 0 ? source.weight : 1,
  }));
  const totalWeight = weightedSources.reduce((sum, source) => sum + source.weight, 0);
  const allocations = weightedSources.map((source) => {
    const exact = (totalPageSize * source.weight) / totalWeight;
    return { ...source, size: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let remaining = totalPageSize - allocations.reduce((sum, source) => sum + source.size, 0);
  allocations.sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let index = 0; index < remaining; index += 1) allocations[index].size += 1;
  allocations.sort((a, b) => a.index - b.index);
  return allocations.map((source) => source.size);
}

async function fetchOffPage(job, source, page, sourcePageSize) {
  const url = new URL(OFF_SEARCH_URL);
  url.searchParams.set("json", "1");
  url.searchParams.set("page", String(page));
  url.searchParams.set("page_size", String(sourcePageSize));
  url.searchParams.set("fields", fields);
  url.searchParams.set("countries_tags_en", country);
  url.searchParams.set("categories_tags_en", source.offCategory);

  for (const [key, value] of Object.entries(source.extraParams ?? {})) {
    url.searchParams.set(key, value);
  }

  for (let attempt = 1; attempt <= fetchRetries; attempt += 1) {
    try {
      await waitForOffRequestSlot();
      const response = await fetch(url, {
        headers: {
          "User-Agent": userAgent,
          Accept: "application/json",
        },
      });

      if (response.ok) return response.json();

      const body = clippedMessage(await response.text());
      const error = new Error(`Open Food Facts request failed ${response.status}: ${body}`);
      if (!isRetriableStatus(response.status)) {
        error.retriable = false;
        throw error;
      }

      if (attempt === fetchRetries) {
        throw error;
      }

      const delayMs = retryDelayMs(response, attempt);
      console.warn(
        `Open Food Facts returned ${response.status} for ${job.slug}/${source.id} page ${page}; retrying in ${Math.round(
          delayMs / 1000,
        )}s (${attempt}/${fetchRetries})`,
      );
      await sleep(delayMs);
    } catch (error) {
      if (error && error.retriable === false) throw error;
      if (attempt === fetchRetries) throw error;

      const delayMs = fetchRetryBaseMs * 2 ** (attempt - 1);
      console.warn(
        `Open Food Facts fetch failed for ${job.slug}/${source.id} page ${page}: ${clippedMessage(
          error instanceof Error ? error.message : error,
          240,
        )}; retrying in ${Math.round(delayMs / 1000)}s (${attempt}/${fetchRetries})`,
      );
      await sleep(delayMs);
    }
  }
}

function supabaseHeaders(extra = {}) {
  const adminKey = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!adminKey) throw new Error("Missing required environment variable: SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");
  return {
    apikey: adminKey,
    ...(adminKey.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${adminKey}` }),
    "Content-Type": "application/json",
    ...extra,
  };
}

async function supabaseRequest(path, options = {}) {
  const supabaseUrl = requireEnv("SUPABASE_URL").replace(/\/$/, "");
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...supabaseHeaders(options.headers),
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed ${response.status}: ${await response.text()}`);
  }

  const body = await response.text();
  if (!body.trim()) return null;

  try {
    return JSON.parse(body);
  } catch (error) {
    throw new Error(
      `Supabase returned invalid JSON for ${path}: ${clippedMessage(
        error instanceof Error ? error.message : error,
        240,
      )}`,
    );
  }
}

async function upsertRows(table, rows, onConflict) {
  if (!rows.length) return;
  for (let offset = 0; offset < rows.length; offset += upsertBatchSize) {
    const batch = rows.slice(offset, offset + upsertBatchSize);
    await supabaseRequest(`${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(batch),
    });
  }
}

async function createImportRun() {
  await upsertRows(
    "data_sources",
    [
      {
        id: SOURCE_ID,
        name: SOURCE_NAME,
        url: SOURCE_URL,
        license: SOURCE_LICENSE,
        attribution_required: true,
      },
    ],
    "id",
  );

  const id = crypto.randomUUID();
  await supabaseRequest("import_runs", {
    method: "POST",
    headers: {
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      id,
      source_id: SOURCE_ID,
      market,
      locale,
      started_at: new Date().toISOString(),
      status: "running",
    }),
  });
  return id;
}

async function finishImportRun(id, status, counts, errorMessage = null) {
  await supabaseRequest(`import_runs?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      finished_at: new Date().toISOString(),
      imported_count: counts.imported,
      updated_count: counts.updated,
      blocked_count: counts.blocked,
      status,
      error_message: errorMessage,
    }),
  });
}

async function collectProducts(importRunId) {
  const rows = [];
  const failures = [];
  const sourceWarnings = [];
  const sourceStats = [];

  for (const job of selectedCategoryJobs) {
    const initialRowCount = rows.length;
    const seenExternalIds = new Set();
    const allocations = allocateSourcePageSizes(pageSize, job.sources);

    for (const [sourceIndex, source] of job.sources.entries()) {
      const sourcePageSize = allocations[sourceIndex];
      if (sourcePageSize === 0) continue;
      let completedPages = 0;
      let fetchedProducts = 0;
      let acceptedProducts = 0;

      try {
        const endPage = startPage + maxPages - 1;
        for (let page = startPage; page <= endPage; page += 1) {
          const data = await fetchOffPage(job, source, page, sourcePageSize);
          const products = Array.isArray(data.products) ? data.products : [];
          fetchedProducts += products.length;
          for (const product of products) {
            const row = mapProduct(product, job.slug, importRunId);
            if (!row || seenExternalIds.has(row.external_id)) continue;
            seenExternalIds.add(row.external_id);
            rows.push(row);
            acceptedProducts += 1;
          }
          console.log(
            `${job.slug}/${source.id}: page ${page}, ${products.length} fetched, ${acceptedProducts} unique accepted`,
          );
          completedPages += 1;

          if (products.length < sourcePageSize) break;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        sourceWarnings.push({
          category: job.slug,
          source: source.id,
          completedPages,
          message: clippedMessage(message),
        });
        console.warn(
          `Stopping ${job.slug}/${source.id} after ${completedPages} successful page(s) because Open Food Facts remained unavailable: ${clippedMessage(message)}`,
        );

        if (!continueOnCategoryError) throw error;
      }

      sourceStats.push({
        category: job.slug,
        source: source.id,
        startPage,
        endPage: startPage + maxPages - 1,
        pageSize: sourcePageSize,
        completedPages,
        fetchedProducts,
        acceptedProducts,
      });
    }

    if (rows.length === initialRowCount) {
      const message = "Open Food Facts returned no usable products from any configured source.";
      failures.push({ category: job.slug, completedPages: 0, message });
      console.warn(`Stopping ${job.slug}: ${message}`);
    }
  }

  if (shouldRejectEmptyImport(rows.length)) {
    throw new Error(`Open Food Facts returned no usable products. Failures: ${JSON.stringify(failures)}`);
  }

  return { rows, failures, sourceWarnings, sourceStats };
}

async function writeStepSummary({ counts, failures, sourceWarnings, sourceStats }) {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (!path) return;
  const status = failures.length
    ? `Partial (${failures.length} category failures)`
    : sourceWarnings.length
      ? `Partial (${sourceWarnings.length} source warnings)`
      : "Complete";
  const lines = [
    "## Open Food Facts ingestion",
    "",
    `- Market: ${market} (${locale})`,
    `- Country filter: ${country}`,
    `- Categories: ${selectedCategoryJobs.map((job) => job.slug).join(", ")}`,
    `- Page window: ${startPage}-${startPage + maxPages - 1}`,
    `- Pages per category: ${maxPages}`,
    `- Products per page: ${pageSize}`,
    `- Collected rows: ${counts.imported}`,
    `- Result: ${status}`,
    "",
    "### Source coverage",
    "",
    ...sourceCoverageTable(sourceStats),
    "",
  ];
  if (failures.length) {
    lines.push(
      "### Category failures",
      "",
      ...failures.map(
        (failure) =>
          `- ${failure.category}: ${failure.completedPages} successful page(s) - ${summaryFailureMessage(failure.message)}`,
      ),
      "",
    );
  }
  if (sourceWarnings.length) {
    lines.push(
      "### Source warnings",
      "",
      ...sourceWarnings.map(
        (warning) =>
          `- ${warning.category}/${warning.source}: ${warning.completedPages} successful page(s) - ${summaryFailureMessage(warning.message)}`,
      ),
      "",
    );
  }
  await appendFile(path, `${lines.join("\n")}\n`, "utf8");
}

async function main() {
  const importRunId = dryRun ? crypto.randomUUID() : await createImportRun();
  const counts = { imported: 0, updated: 0, blocked: 0 };

  try {
    const { rows, failures, sourceWarnings, sourceStats } = await collectProducts(importRunId);
    counts.imported = rows.length;

    if (dryRun) {
      console.log(
        JSON.stringify(
          { dryRun: true, collected: rows.length, failures, sourceWarnings, sourceStats, sample: rows.slice(0, 3) },
          null,
          2,
        ),
      );
      await writeStepSummary({ counts, failures, sourceWarnings, sourceStats });
      return;
    }

    await upsertRows("raw_open_food_facts_products", rows, "external_id,category_slug,market");
    const partialFailureMessage = failures.length || sourceWarnings.length
      ? clippedMessage(`Partial Open Food Facts import: ${JSON.stringify({ failures, sourceWarnings })}`, 4000)
      : null;
    await finishImportRun(importRunId, "success", counts, partialFailureMessage);
    console.log(`Imported ${rows.length} raw Open Food Facts products.`);
    if (failures.length || sourceWarnings.length) {
      console.warn(
        `Import completed with ${failures.length} category failure(s) and ${sourceWarnings.length} source warning(s).`,
      );
    }
    await writeStepSummary({ counts, failures, sourceWarnings, sourceStats });
  } catch (error) {
    if (!dryRun) {
      await finishImportRun(importRunId, "failed", counts, error instanceof Error ? error.message : String(error));
    }
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
