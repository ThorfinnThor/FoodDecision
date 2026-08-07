import assert from "node:assert/strict";
import test from "node:test";
import {
  barcodeCheckDigitIsValid,
  barcodeFormatLabel,
  barcodeVariants,
  findBarcodeItem,
  normalizeBarcode,
} from "../lib/barcode.ts";

test("normalizes and validates standard retail barcodes", () => {
  assert.equal(normalizeBarcode("4006 3813 3393 1"), "4006381333931");
  assert.equal(barcodeCheckDigitIsValid("4006381333931"), true);
  assert.equal(barcodeCheckDigitIsValid("4006381333932"), false);
  assert.equal(barcodeCheckDigitIsValid("036000291452"), true);
  assert.equal(barcodeCheckDigitIsValid("123"), false);
  assert.equal(barcodeFormatLabel("4006381333931"), "EAN-13");
});

test("matches equivalent UPC-A and EAN-13 representations", () => {
  const products = [{ gtin: "0036000291452", slug: "oat-a" }, { gtin: "4006381333931", slug: "oat-b" }];
  assert.deepEqual(barcodeVariants("036000291452"), ["036000291452", "0036000291452"]);
  assert.equal(findBarcodeItem(products, "036000291452")?.slug, "oat-a");
  assert.equal(findBarcodeItem(products, "4006381333931")?.slug, "oat-b");
  assert.equal(findBarcodeItem(products, "5012345678900"), null);
});
