import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/de") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("makes ranking position clearer than a capped criterion score", async () => {
  const response = await render("/de/best/proteinreich/proteinriegel");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Platz 1 von/);
  assert.match(html, /class="rank-position"/);
  assert.match(html, /Den allgemeinen Produktscore findest du auf der Produktseite/);
  assert.doesNotMatch(html, /class="score-pill[^>]*"/);
});

test("uses the same plain ranking language in US English", async () => {
  const response = await render("/en-us/best/high-protein/protein-bars");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Rank 1 of/);
  assert.match(html, /The general product score remains on the product page/);
});

test("server-renders the Compare Your Food experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Lebensmittel besser auswählen \| Compare Your Food<\/title>/i);
  assert.match(html, /Compare Your Food/);
  assert.doesNotMatch(html, /Food Decision Engine/);
  assert.match(html, /Finde Lebensmittel/);
  assert.match(html, /Vergleiche Produkte im richtigen Kontext/);
  assert.match(html, /Hafermilch/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("removes starter metadata and preview dependencies", async () => {
  const [page, layout, packageJson, header, footer] = await Promise.all([
    readFile(new URL("../app/[locale]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/[locale]/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../components/SiteHeader.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/SiteFooter.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /generateMetadata/);
  assert.match(layout, /BRAND_NAME/);
  assert.match(packageJson, /"name": "compare-your-food"/);
  assert.doesNotMatch(`${page}\n${layout}\n${packageJson}\n${header}\n${footer}`, /Food Decision Engine|codex-preview|_sites-preview|react-loading-skeleton/);
  assert.doesNotMatch(page, /Eine Zahl reicht nicht|One number is not enough|NewsletterSignup/);
});

test("renders useful catalog discovery hubs without making unvalidated SEO claims", async () => {
  const [brandsResponse, ingredientsResponse, nutritionResponse] = await Promise.all([
    render("/de/brands"),
    render("/de/ingredients"),
    render("/de/nutrition"),
  ]);
  assert.equal(brandsResponse.status, 200);
  assert.equal(ingredientsResponse.status, 200);
  assert.equal(nutritionResponse.status, 200);

  const [brands, ingredients, nutrition] = await Promise.all([
    brandsResponse.text(),
    ingredientsResponse.text(),
    nutritionResponse.text(),
  ]);
  assert.match(brands, /Marken im aktuellen Katalog/);
  assert.match(ingredients, /Häufig genannte Zutaten/);
  assert.match(nutrition, /Nährwerte im richtigen Kontext/);
  assert.match(brands, /name="robots" content="noindex, follow"/);
  assert.match(ingredients, /name="robots" content="noindex, follow"/);
  assert.match(nutrition, /name="robots" content="noindex, follow"/);
});

test("connects product, brand, ingredient, and nutrition detail views", async () => {
  const [productResponse, brandResponse, ingredientResponse, nutritionResponse] = await Promise.all([
    render("/de/product/nordhafer-barista-ohne-zucker"),
    render("/de/brand/nordhafer"),
    render("/de/ingredient/wasser"),
    render("/de/nutrition/zucker"),
  ]);
  assert.equal(productResponse.status, 200);
  assert.equal(brandResponse.status, 200);
  assert.equal(ingredientResponse.status, 200);
  assert.equal(nutritionResponse.status, 200);

  const [product, brand, ingredient, nutrition] = await Promise.all([
    productResponse.text(),
    brandResponse.text(),
    ingredientResponse.text(),
    nutritionResponse.text(),
  ]);
  assert.match(product, /href="\/de\/brand\/nordhafer"/);
  assert.match(product, /href="\/de\/ingredient\/wasser"/);
  assert.match(brand, /Jedes Produkt zählt für sich/);
  assert.match(ingredient, /Was diese Seite aussagt/);
  assert.match(nutrition, /Niedrigere Werte zuerst/);
  assert.match(nutrition, /Dieser Einzelwert ersetzt keinen vollständigen Produktscore/);
});
