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

test("renders citable ranking answers and matching dataset provenance", async () => {
  const response = await render("/de/best/proteinreich/proteinriegel");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /Direkte Antwort/);
  assert.match(html, /Was zeigt dieses Ranking/);
  assert.match(html, /Katalogstand/);
  assert.match(html, /Vergleichsmenge/);
  assert.match(html, /Quellen und Redaktionsrichtlinie/);
  assert.match(html, /"@type":"Dataset"/);
  assert.match(html, /"@type":"Article"/);
  assert.match(html, /"wordCount":6\d{2}/);
  assert.match(html, /opendatacommons\.org\/licenses\/odbl/);
  assert.match(html, /Welcher Proteinriegel liefert besonders viel Protein/);
  assert.match(html, /Vier Kriterien für eine bessere Entscheidung/);
  assert.match(html, /Deutsche Gesellschaft für Ernährung/);
  assert.match(html, /Compare Your Food Redaktion/);
});

test("renders a bilingual editorial and source policy", async () => {
  const [deResponse, enResponse] = await Promise.all([
    render("/de/editorial-policy"),
    render("/en-us/editorial-policy"),
  ]);
  assert.equal(deResponse.status, 200);
  assert.equal(enResponse.status, 200);

  const [de, en] = await Promise.all([deResponse.text(), enResponse.text()]);
  assert.match(de, /So veröffentlichen wir verlässliche Vergleiche/);
  assert.match(de, /Zahlungen verändern keine Scores oder Platzierungen/);
  assert.match(de, /llms-full\.txt/);
  assert.match(de, /name="robots" content="noindex, follow"/);
  assert.match(en, /How we publish reliable comparisons/);
  assert.match(en, /Payments never change scores or positions/);
  assert.match(en, /Machine-readable access/);
});

test("server-renders the Compare Your Food experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Lebensmittel besser auswählen \| Compare Your Food<\/title>/i);
  assert.match(html, /Compare Your Food/);
  assert.doesNotMatch(html, /Food Decision Engine/);
  assert.match(html, /Finde Produkte/);
  assert.match(html, /Vergleiche Produkte im richtigen Kontext/);
  assert.match(html, /Hafermilch/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("uses the catalog for broad home searches and keeps the finder goal based", async () => {
  const finderSource = await readFile(new URL("../components/FinderExperience.tsx", import.meta.url), "utf8");
  const [homeResponse, finderResponse] = await Promise.all([
    render("/en-us"),
    render("/en-us/finder"),
  ]);
  assert.equal(homeResponse.status, 200);
  assert.equal(finderResponse.status, 200);

  const [home, finder] = await Promise.all([homeResponse.text(), finderResponse.text()]);
  assert.match(home, /Find products that fit your priorities/);
  assert.match(home, /<form[^>]+action="\/en-us\/products"/);
  assert.match(home, /name="q"/);
  assert.match(home, /Search catalog/);
  assert.match(home, /Choose brands, ingredients, or nutrition as your starting point/);
  assert.match(home, /Review brands/);
  assert.match(home, /Trace ingredients/);
  assert.match(home, /Understand nutrition/);
  assert.doesNotMatch(home, /<form[^>]+action="\/en-us\/finder"/);
  assert.match(finder, /full assessed catalog/);
  assert.match(finderSource, /Your matches/);
  assert.doesNotMatch(finderSource, /Your shortlist/);
});

test("renders bilingual privacy and legal notice routes", async () => {
  const [deLegalResponse, enLegalResponse, dePrivacyResponse] = await Promise.all([
    render("/de/legal-notice"),
    render("/en-us/legal-notice"),
    render("/de/privacy"),
  ]);
  assert.equal(deLegalResponse.status, 200);
  assert.equal(enLegalResponse.status, 200);
  assert.equal(dePrivacyResponse.status, 200);

  const [deLegal, enLegal, dePrivacy] = await Promise.all([
    deLegalResponse.text(),
    enLegalResponse.text(),
    dePrivacyResponse.text(),
  ]);
  assert.match(deLegal, /Impressum/);
  assert.match(deLegal, /Angaben gemäß § 5 DDG/);
  assert.match(enLegal, /Legal notice/);
  assert.match(enLegal, /Provider details/);
  assert.match(deLegal, /name="robots" content="noindex, follow"/);
  assert.match(dePrivacy, /Verantwortliche Stelle/);
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
  assert.match(nutrition, /Welche Kategorie möchtest du nach Zucker vergleichen/);
  assert.match(nutrition, /Noch keine Kategorie gewählt/);
  assert.doesNotMatch(nutrition, /Hafermilch: Zucker/);
});

test("keeps the selected nutrition category in the URL and finder links", async () => {
  const response = await render("/de/nutrition/zucker?category=proteinriegel");
  assert.equal(response.status, 200);
  const page = await response.text();

  assert.match(page, /Proteinriegel(?:<!-- -->)?: (?:<!-- -->)?Zucker/);
  assert.match(page, /href="\/de\/nutrition\/zucker\?category=proteinriegel#nutrition-results" aria-current="page"/);
  assert.match(page, /href="\/de\/finder\?category=proteinriegel&amp;goal=low_sugar"/);
  assert.doesNotMatch(page, /Noch keine Kategorie gewählt/);
});
