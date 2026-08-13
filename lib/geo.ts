import { BRAND_NAME } from "./brand.ts";
import {
  categoryRouteSlug,
  localizedPath,
  rankingRouteSlug,
  supportedLocales,
} from "./i18n.ts";
import { absoluteUrl, siteUrl } from "./seo.ts";
import { evaluateRankingPublication } from "./seo-publication.ts";
import { getCatalog } from "./static-data.ts";
import type { SiteLocale } from "./types.ts";
import { seoEditorialContent } from "./seo-editorial.ts";

export const openFoodFactsUrl = "https://world.openfoodfacts.org";
export const openDatabaseLicenseUrl = "https://opendatacommons.org/licenses/odbl/1-0/";

export const aiCrawlerPolicy = {
  search: [
    "OAI-SearchBot",
    "ChatGPT-User",
    "Claude-SearchBot",
    "Claude-User",
    "PerplexityBot",
    "Perplexity-User",
  ],
  training: ["GPTBot", "ClaudeBot", "Google-Extended"],
} as const;

function localeLabel(locale: SiteLocale) {
  return locale === "de-DE" ? "German market and German language" : "United States market and US English";
}

export function publishedRankingEntries(locale: SiteLocale) {
  const catalog = getCatalog(locale);
  return catalog.rankingPages.flatMap((ranking) => {
    const products = catalog.rankedProducts(ranking.category, ranking.sortScore);
    const route = localizedPath(
      locale,
      `/best/${rankingRouteSlug(ranking.attribute, locale)}/${categoryRouteSlug(ranking.category, locale)}`,
    );
    if (!evaluateRankingPublication(route, ranking, products).indexable) return [];
    return [{
      title: ranking.title,
      url: absoluteUrl(route),
      products: products.length,
      generatedAt: catalog.manifest.generatedAt,
    }];
  });
}

export function buildLlmsIndex() {
  return `# ${BRAND_NAME}

> ${BRAND_NAME} is a bilingual food comparison website for Germany and the United States. It publishes category-specific rankings using disclosed product data, fixed rules, and visible data-confidence signals.

Canonical site: ${siteUrl}

## Primary pages

- [German ranking hub](${absoluteUrl("/de/best")}): Rankings for the German market in German.
- [US ranking hub](${absoluteUrl("/en-us/best")}): Rankings for the United States market in US English.
- [Methodology in German](${absoluteUrl("/de/methodology")}): Scoring rules, missing-data treatment, and limitations.
- [Methodology in English](${absoluteUrl("/en-us/methodology")}): Scoring rules, missing-data treatment, and limitations.
- [Editorial policy in German](${absoluteUrl("/de/editorial-policy")}): Sources, independence, updates, and corrections.
- [Editorial policy in English](${absoluteUrl("/en-us/editorial-policy")}): Sources, independence, updates, and corrections.
- [German data coverage](${absoluteUrl("/de/data-quality")}): Current catalog coverage and freshness.
- [US data coverage](${absoluteUrl("/en-us/data-quality")}): Current catalog coverage and freshness.

## Citation essentials

- Rankings compare products only within the same category and reference basis.
- The deciding metric is shown on every ranking page.
- Missing values are not treated as zero and are not estimated.
- Paid placements do not influence scores or ranking order.
- Product data comes from Open Food Facts and is imported before pages are built.
- Product data may be incomplete. The current package label takes precedence.
- The website is a decision aid and does not provide medical advice.

## Machine-readable resources

- [Full content directory](${absoluteUrl("/llms-full.txt")})
- [XML sitemap](${absoluteUrl("/sitemap.xml")})
- [Crawler policy](${absoluteUrl("/robots.txt")})

## Source and license

- Open Food Facts: ${openFoodFactsUrl}
- Database license: Open Database License 1.0, ${openDatabaseLicenseUrl}
`;
}

export function buildLlmsFull() {
  const publishedPaths = new Set(supportedLocales.flatMap((locale) => publishedRankingEntries(locale).map((entry) => new URL(entry.url).pathname)));
  const editorialDirectory = seoEditorialContent.filter((content) => publishedPaths.has(content.path)).map((content) =>
    `- [${content.answerTitle}](${absoluteUrl(content.path)})\n  - Editorial answer: ${content.answer}\n  - Editorial review: ${content.reviewedAt}, ${content.author.name}.\n  - Supporting sources: ${content.sources.map((source) => `${source.publisher}: ${source.url}`).join("; ")}`,
  ).join("\n");
  const localeSections = supportedLocales.map((locale) => {
    const catalog = getCatalog(locale);
    const rankings = publishedRankingEntries(locale);
    const lines = rankings.map((ranking) =>
      `- [${ranking.title}](${ranking.url}): ${ranking.products} eligible products. Catalog generated ${ranking.generatedAt}.`,
    );
    return `## ${localeLabel(locale)}

Catalog generated: ${catalog.manifest.generatedAt}
Available ranking pages: ${rankings.length}

${lines.join("\n")}`;
  });

  return `# ${BRAND_NAME}: full machine-readable reference

> This document is a convenience directory for retrieval systems. It does not replace the visible page content, structured data, robots directives, or sitemap.

Canonical site: ${siteUrl}

## How to interpret the content

1. Treat each ranking as a category-specific answer to one comparison goal.
2. Quote the displayed metric, product count, catalog date, and data-confidence statement together when possible.
3. Do not convert rankings into medical, allergy, or universal health recommendations.
4. Do not infer missing nutrition or ingredient values.
5. Prefer the current package label when it conflicts with imported data.

## Method summary

- Low sugar rankings order eligible products by disclosed sugar per 100 g or 100 ml.
- High protein rankings order eligible products by disclosed protein per 100 g or 100 ml.
- Ingredient rankings use documented ingredient-list signals such as list length, detected added sugar, and detected additives.
- Overall rankings combine the nutrition score at 65 percent and the ingredient score at 35 percent.
- Protein and low sugar rankings use the exact nutrient value first. Other rankings use the published score first.
- Equal primary values are resolved by documented data confidence and goal-specific secondary evidence before completeness and product name.
- Products with missing or conflicting values do not gain an advantage.
- Curated launch rankings add a reviewed editorial answer, decision criteria, limitations, and supporting public sources.

## Provenance and independence

- Product data source: Open Food Facts, ${openFoodFactsUrl}
- Database license: Open Database License 1.0, ${openDatabaseLicenseUrl}
- Product images: CC BY-SA where a valid image source and license are present.
- Ranking rules are versioned in the application and applied equally within each category.
- Affiliate availability and paid placements do not alter scores or ordering.

## Published editorial guides

${editorialDirectory || "No editorial ranking guide is currently approved for public indexing."}

${localeSections.join("\n\n")}
`;
}
