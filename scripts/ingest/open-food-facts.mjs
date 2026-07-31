#!/usr/bin/env node
import crypto from "node:crypto";

const OFF_SEARCH_URL = "https://world.openfoodfacts.org/api/v2/search";
const SOURCE_ID = "open-food-facts";
const SOURCE_NAME = "Open Food Facts";
const SOURCE_URL = "https://world.openfoodfacts.org";
const SOURCE_LICENSE = "ODbL database; DbCL contents; CC BY-SA product images";

const categoryJobs = [
  {
    slug: "hafermilch",
    offCategory: "oat-milks",
    extraParams: {},
  },
  {
    slug: "proteinriegel",
    offCategory: "protein-bars",
    extraParams: {},
  },
  {
    slug: "muesli",
    offCategory: "mueslis",
    extraParams: {},
  },
  {
    slug: "joghurt-skyr",
    offCategory: "yogurts",
    extraParams: {},
  },
  {
    slug: "vegane-snacks",
    offCategory: "snacks",
    extraParams: {
      labels_tags: "en:vegan",
    },
  },
];

const fields = [
  "code",
  "product_name",
  "product_name_de",
  "brands",
  "categories_tags",
  "labels_tags",
  "countries_tags",
  "ingredients_text",
  "ingredients_text_de",
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
const requestDelayMs = Number(process.env.OFF_REQUEST_DELAY_MS ?? "7000");
const fetchRetries = Number(process.env.OFF_FETCH_RETRIES ?? "4");
const fetchRetryBaseMs = Number(process.env.OFF_FETCH_RETRY_BASE_MS ?? "10000");
const allowEmptyDryRun = process.env.OFF_ALLOW_EMPTY_DRY_RUN !== "false";
const continueOnCategoryError =
  process.env.OFF_CONTINUE_ON_CATEGORY_ERROR === "true" ||
  (dryRun && process.env.OFF_CONTINUE_ON_CATEGORY_ERROR !== "false");
const country = process.env.OFF_COUNTRY ?? "Germany";
const userAgent =
  process.env.OFF_USER_AGENT ??
  "food-decision-engine/0.1 (configure OFF_USER_AGENT with a contact URL or email)";

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
    product_name: product.product_name_de || product.product_name || null,
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
  };
}

async function fetchOffPage(job, page) {
  const url = new URL(OFF_SEARCH_URL);
  url.searchParams.set("json", "1");
  url.searchParams.set("page", String(page));
  url.searchParams.set("page_size", String(pageSize));
  url.searchParams.set("fields", fields);
  url.searchParams.set("countries_tags_en", country);
  url.searchParams.set("categories_tags_en", job.offCategory);

  for (const [key, value] of Object.entries(job.extraParams)) {
    url.searchParams.set(key, value);
  }

  for (let attempt = 1; attempt <= fetchRetries; attempt += 1) {
    try {
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
        `Open Food Facts returned ${response.status} for ${job.slug} page ${page}; retrying in ${Math.round(
          delayMs / 1000,
        )}s (${attempt}/${fetchRetries})`,
      );
      await sleep(delayMs);
    } catch (error) {
      if (error && error.retriable === false) throw error;
      if (attempt === fetchRetries) throw error;

      const delayMs = fetchRetryBaseMs * 2 ** (attempt - 1);
      console.warn(
        `Open Food Facts fetch failed for ${job.slug} page ${page}: ${clippedMessage(
          error instanceof Error ? error.message : error,
          240,
        )}; retrying in ${Math.round(delayMs / 1000)}s (${attempt}/${fetchRetries})`,
      );
      await sleep(delayMs);
    }
  }
}

function supabaseHeaders(extra = {}) {
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
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
  await supabaseRequest(`${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
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

  for (const job of categoryJobs) {
    try {
      for (let page = 1; page <= maxPages; page += 1) {
        const data = await fetchOffPage(job, page);
        const products = Array.isArray(data.products) ? data.products : [];
        for (const product of products) {
          const row = mapProduct(product, job.slug, importRunId);
          if (row) rows.push(row);
        }
        console.log(`${job.slug}: page ${page}, ${products.length} products`);

        if (products.length < pageSize) break;
        if (requestDelayMs > 0) await sleep(requestDelayMs);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ category: job.slug, message });
      console.warn(`Skipping ${job.slug} after repeated Open Food Facts errors: ${message}`);

      if (!continueOnCategoryError) throw error;
    }
  }

  if (failures.length && rows.length === 0 && !(dryRun && allowEmptyDryRun)) {
    throw new Error(`Open Food Facts returned no usable products. Failures: ${JSON.stringify(failures)}`);
  }

  return { rows, failures };
}

async function main() {
  const importRunId = dryRun ? crypto.randomUUID() : await createImportRun();
  const counts = { imported: 0, updated: 0, blocked: 0 };

  try {
    const { rows, failures } = await collectProducts(importRunId);
    counts.imported = rows.length;

    if (dryRun) {
      console.log(
        JSON.stringify({ dryRun: true, collected: rows.length, failures, sample: rows.slice(0, 3) }, null, 2),
      );
      return;
    }

    await upsertRows("raw_open_food_facts_products", rows, "external_id,category_slug");
    await finishImportRun(importRunId, "success", counts);
    console.log(`Imported ${rows.length} raw Open Food Facts products.`);
  } catch (error) {
    if (!dryRun) {
      await finishImportRun(importRunId, "failed", counts, error instanceof Error ? error.message : String(error));
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
