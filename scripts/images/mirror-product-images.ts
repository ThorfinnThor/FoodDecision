#!/usr/bin/env node --experimental-strip-types
import { createHash } from "node:crypto";
import { appendFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { isLicensedProductImageUrl } from "../../lib/image-license.ts";
import type { MarketCode } from "../../lib/types.ts";

const BUCKET = "product-images";
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;
const FETCH_RETRIES = 2;

type ProductImageRow = {
  id: string;
  gtin: string;
  image_url: string | null;
  mirrored_image_path: string | null;
  market: MarketCode;
};

type MirrorResult = {
  product: ProductImageRow;
  status: "mirrored" | "skipped" | "failed";
  reason?: string;
  path?: string;
  bytes?: number;
};

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function adminKey() {
  return process.env.SUPABASE_SECRET_KEY?.trim() || requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function boundedMirrorLimit(value = process.env.IMAGE_MIRROR_LIMIT) {
  const parsed = Number.parseInt(value ?? String(DEFAULT_LIMIT), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
    throw new Error(`IMAGE_MIRROR_LIMIT must be an integer from 1 to ${MAX_LIMIT}.`);
  }
  return parsed;
}

export function imageExtension(contentType: string | null) {
  const normalized = contentType?.split(";", 1)[0]?.trim().toLowerCase();
  if (normalized === "image/jpeg" || normalized === "image/jpg") return "jpg";
  if (normalized === "image/png") return "png";
  if (normalized === "image/webp") return "webp";
  return null;
}

function hasExpectedImageSignature(bytes: Uint8Array, extension: string) {
  if (extension === "jpg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (extension === "png") {
    return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  }
  if (extension === "webp") {
    return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

export function productImageObjectPath({
  market,
  gtin,
  sourceUrl,
  extension,
}: {
  market: MarketCode;
  gtin: string;
  sourceUrl: string;
  extension: string;
}) {
  const safeGtin = gtin.replace(/[^a-z0-9]/gi, "").slice(0, 32);
  if (!safeGtin) throw new Error("A product image requires a valid GTIN.");
  const sourceHash = createHash("sha256").update(sourceUrl).digest("hex").slice(0, 16);
  return `${market.toLowerCase()}/${safeGtin}/${sourceHash}.${extension}`;
}

export function productImagePublicUrl(supabaseUrl: string, objectPath: string) {
  const base = new URL(supabaseUrl);
  if (base.protocol !== "https:" || !base.hostname.endsWith(".supabase.co")) {
    throw new Error("SUPABASE_URL must be an HTTPS Supabase project URL.");
  }
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
  return `${base.origin}/storage/v1/object/public/${BUCKET}/${encodedPath}`;
}

function supabaseHeaders(key: string, extra: Record<string, string> = {}) {
  return {
    apikey: key,
    ...(key.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${key}` }),
    ...extra,
  };
}

function clipped(value: unknown, maxLength = 240) {
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}... [truncated]` : text;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function supabaseRequest<T>(path: string, options: RequestInit = {}) {
  const url = requireEnv("SUPABASE_URL").replace(/\/$/, "");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: supabaseHeaders(adminKey(), {
      Accept: "application/json",
      ...options.headers as Record<string, string>,
    }),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Supabase request failed ${response.status}: ${clipped(body)}`);
  return (body.trim() ? JSON.parse(body) : null) as T;
}

async function pendingProducts(market: MarketCode, limit: number) {
  const query = [
    "select=id,gtin,image_url,mirrored_image_path,market",
    `market=eq.${market}`,
    "publishability=in.(published,ranking_eligible)",
    "image_url=not.is.null",
    "mirrored_image_path=is.null",
    "order=updated_at.desc",
    `limit=${limit}`,
  ].join("&");
  return supabaseRequest<ProductImageRow[]>(`products?${query}`);
}

async function fetchLicensedImage(sourceUrl: string) {
  if (!isLicensedProductImageUrl(sourceUrl)) {
    throw new Error("The source URL is not an approved Open Food Facts image host.");
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= FETCH_RETRIES; attempt += 1) {
    try {
      const response = await fetch(sourceUrl, {
        headers: { "User-Agent": requireEnv("OFF_USER_AGENT"), Accept: "image/webp,image/png,image/jpeg" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error(`Open Food Facts returned ${response.status}.`);
      if (!isLicensedProductImageUrl(response.url)) {
        throw new Error("Open Food Facts redirected the image to an unapproved host.");
      }
      const extension = imageExtension(response.headers.get("content-type"));
      if (!extension) throw new Error(`Unsupported image content type: ${response.headers.get("content-type") ?? "missing"}.`);
      const declaredBytes = Number(response.headers.get("content-length") ?? "0");
      if (declaredBytes > MAX_IMAGE_BYTES) throw new Error(`Image exceeds the ${MAX_IMAGE_BYTES} byte limit.`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error(`Image exceeds the ${MAX_IMAGE_BYTES} byte limit.`);
      if (!hasExpectedImageSignature(bytes, extension)) throw new Error("Image bytes do not match the declared content type.");
      return { bytes, extension, contentType: extension === "jpg" ? "image/jpeg" : `image/${extension}` };
    } catch (error) {
      lastError = error;
      if (attempt >= FETCH_RETRIES) break;
      await sleep(1_500 * 2 ** attempt);
    }
  }
  throw lastError;
}

async function uploadImage(objectPath: string, bytes: Uint8Array, contentType: string) {
  const base = requireEnv("SUPABASE_URL").replace(/\/$/, "");
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);
  const response = await fetch(`${base}/storage/v1/object/${BUCKET}/${encodedPath}`, {
    method: "POST",
    headers: supabaseHeaders(adminKey(), {
      "Content-Type": contentType,
      "cache-control": "31536000",
      "x-upsert": "true",
    }),
    body,
  });
  if (!response.ok) throw new Error(`Storage upload failed ${response.status}: ${clipped(await response.text())}`);
}

async function recordMirror(productId: string, objectPath: string) {
  await supabaseRequest(`products?id=eq.${encodeURIComponent(productId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ mirrored_image_path: objectPath, image_mirrored_at: new Date().toISOString() }),
  });
}

async function mirrorProduct(product: ProductImageRow): Promise<MirrorResult> {
  if (product.mirrored_image_path) return { product, status: "skipped", reason: "already mirrored" };
  if (!product.image_url) return { product, status: "skipped", reason: "missing source image" };
  try {
    const image = await fetchLicensedImage(product.image_url);
    const path = productImageObjectPath({
      market: product.market,
      gtin: product.gtin,
      sourceUrl: product.image_url,
      extension: image.extension,
    });
    await uploadImage(path, image.bytes, image.contentType);
    await recordMirror(product.id, path);
    return { product, status: "mirrored", path, bytes: image.bytes.length };
  } catch (error) {
    return { product, status: "failed", reason: clipped(error instanceof Error ? error.message : error) };
  }
}

async function writeSummary(market: MarketCode, results: MirrorResult[]) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  const mirrored = results.filter((result) => result.status === "mirrored");
  const failed = results.filter((result) => result.status === "failed");
  const skipped = results.filter((result) => result.status === "skipped");
  const lines = [
    "## Product image mirror",
    "",
    `- Market: ${market}`,
    `- Mirrored: ${mirrored.length}`,
    `- Skipped: ${skipped.length}`,
    `- Failed: ${failed.length}`,
    `- Stored bytes: ${mirrored.reduce((total, result) => total + (result.bytes ?? 0), 0)}`,
    "",
  ];
  if (failed.length) {
    lines.push("### Image failures", "", ...failed.slice(0, 20).map((result) => `- ${result.product.gtin}: ${result.reason}`), "");
  }
  await appendFile(summaryPath, `${lines.join("\n")}\n`, "utf8");
}

export async function main() {
  const market = String(process.env.CATALOG_MARKET ?? "DE").toUpperCase() as MarketCode;
  if (market !== "DE" && market !== "US") throw new Error(`Unsupported CATALOG_MARKET: ${market}`);
  const limit = boundedMirrorLimit();
  const products = await pendingProducts(market, limit);
  const results: MirrorResult[] = [];

  for (const product of products) {
    const result = await mirrorProduct(product);
    results.push(result);
    const detail = result.path ?? result.reason ?? "";
    console.log(`${product.gtin}: ${result.status}${detail ? ` (${detail})` : ""}`);
  }

  await writeSummary(market, results);
  const counts = Object.fromEntries(["mirrored", "skipped", "failed"].map((status) => [
    status,
    results.filter((result) => result.status === status).length,
  ]));
  console.log(JSON.stringify({ market, requested: limit, candidates: products.length, ...counts }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
