import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { categoryImages } from "../lib/category-images.ts";
import { categoryFromRouteSlug, categoryRouteSlug, localizedPath, rankingFromRouteSlug, rankingRouteSlug } from "../lib/i18n.ts";
import { isLicensedProductImageUrl, licensedProductImage } from "../lib/image-license.ts";

test("localizes public category and ranking paths without changing internal identifiers", () => {
  assert.equal(categoryRouteSlug("hafermilch", "en-US"), "oat-milk");
  assert.equal(categoryFromRouteSlug("oat-milk", "en-US"), "hafermilch");
  assert.equal(rankingRouteSlug("wenig-zucker", "en-US"), "low-sugar");
  assert.equal(rankingFromRouteSlug("low-sugar", "en-US"), "wenig-zucker");
  assert.equal(localizedPath("de-DE", "/products"), "/de/products");
});

test("allows only HTTPS Open Food Facts image hosts and records attribution", () => {
  assert.equal(isLicensedProductImageUrl("https://images.openfoodfacts.org/images/products/1.jpg"), true);
  assert.equal(isLicensedProductImageUrl("http://images.openfoodfacts.org/images/products/1.jpg"), false);
  assert.equal(isLicensedProductImageUrl("https://example.com/openfoodfacts.jpg"), false);
  assert.deepEqual(licensedProductImage("https://static.openfoodfacts.org/images/1.jpg", "123"), {
    imageUrl: "https://static.openfoodfacts.org/images/1.jpg",
    imageLicense: "CC BY-SA",
    imageSourceUrl: "https://world.openfoodfacts.org/product/123",
  });
});

test("every category photo is local, commercially reusable, and attributed", () => {
  const entries = Object.entries(categoryImages);
  assert.equal(entries.length, 12);
  for (const [slug, image] of entries) {
    assert.equal(existsSync(join(process.cwd(), "public", image.src)), true, `${slug} image is missing`);
    assert.match(image.sourceUrl, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    assert.match(image.license, /^(CC0|CC BY|Public domain)/);
    assert.match(image.licenseUrl, /^https:\/\//);
    assert.ok(image.creator.length > 1);
    assert.ok(image.alt["de-DE"].length > 8);
    assert.ok(image.alt["en-US"].length > 8);
  }
});
