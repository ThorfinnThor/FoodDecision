import assert from "node:assert/strict";
import test from "node:test";
import {
  boundedMirrorLimit,
  imageExtension,
  productImageObjectPath,
  productImagePublicUrl,
} from "../scripts/images/mirror-product-images.ts";

test("bounds image mirror batches and accepts only supported image types", () => {
  assert.equal(boundedMirrorLimit("1"), 1);
  assert.equal(boundedMirrorLimit("500"), 500);
  assert.throws(() => boundedMirrorLimit("0"), /integer from 1 to 500/);
  assert.throws(() => boundedMirrorLimit("501"), /integer from 1 to 500/);
  assert.equal(imageExtension("image/jpeg; charset=binary"), "jpg");
  assert.equal(imageExtension("image/webp"), "webp");
  assert.equal(imageExtension("image/svg+xml"), null);
});

test("creates deterministic market scoped object paths and public URLs", () => {
  const input = {
    market: "DE",
    gtin: "4000-0000-00099",
    sourceUrl: "https://images.openfoodfacts.org/images/products/400/000/000/0099/front_de.400.jpg",
    extension: "jpg",
  };
  const path = productImageObjectPath(input);
  assert.match(path, /^de\/4000000000099\/[a-f0-9]{16}\.jpg$/);
  assert.equal(productImageObjectPath(input), path);
  assert.equal(
    productImagePublicUrl("https://example.supabase.co/", path),
    `https://example.supabase.co/storage/v1/object/public/product-images/${path}`,
  );
  assert.throws(() => productImagePublicUrl("http://example.supabase.co", path), /HTTPS Supabase/);
});
