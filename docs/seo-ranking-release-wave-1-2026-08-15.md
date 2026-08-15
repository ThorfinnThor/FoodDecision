# Controlled ranking release: wave 1

Date: 2026-08-15

## Scope

The first ranking release contains one bilingual topic pair:

- `/de/best/beste-wahl/muesli`
- `/en-us/best/best-overall/muesli`

Both pages may be indexed only when the build-time publication gate also confirms the required result count, average data completeness, unique insights, editorial depth, valid sources, canonical URL, and internal links. Approval in the registry does not bypass these runtime checks.

## Why these pages are released

- The search result review confirmed comparison and commercial investigation intent for muesli selection.
- The page wording describes a data-based overall assessment. It does not claim a taste test, laboratory test, medical recommendation, or universal healthiest product.
- The German catalog contained 148 eligible products during the live review.
- The US catalog contained 117 eligible products during the live review.
- Both pages showed high data confidence and strong ingredient coverage.
- Each page contains more than 600 words of page-specific editorial guidance, limitations, FAQs, source attribution, authorship, and a visible review date.
- The two locale variants are released together so their reciprocal language alternates remain coherent.

## Pages deliberately kept out of the index

### Oat milk with low sugar

- `/de/best/wenig-zucker/hafermilch`
- `/en-us/best/low-sugar/oat-milk`

The intent and editorial content are suitable, but the live top results still expose questionable source naming or market relevance. Release requires a product-name and market-assignment review of the leading results in both locales.

### Protein-rich protein bars

- `/de/best/proteinreich/proteinriegel`
- `/en-us/best/high-protein/protein-bars`

The US ranking currently includes a whey protein powder as the leading protein bar. Both locale variants stay `noindex` until category assignment is corrected and the first result set is reviewed again. Keeping the bilingual pair together avoids pointing an indexed language alternate at a blocked counterpart.

## Deployment behavior

After a production build with the current Supabase catalog:

1. The two approved pages receive `index, follow` only if every quality threshold passes.
2. The two approved URLs are added to `/sitemap.xml` automatically.
3. All other ranking pages retain `noindex, follow` and remain absent from the sitemap.
4. If catalog quality falls below a threshold in a later build, the affected page automatically returns to `noindex` and drops out of the sitemap.

## Rollback

Set `indexable` to `false` and `status` to `review` for the affected page definition. Set the matching keyword to `validated: false` and `status: candidate`. The next production build removes the URL from the sitemap and restores `noindex, follow`.

## Next release criteria

Before wave 2:

- correct the US protein-bar category contamination;
- review the first ten products of every proposed ranking in both locales;
- confirm product naming and market relevance for the oat-milk rankings;
- inspect Search Console indexing, impressions, queries, and enhancement reports for the two wave-1 URLs after discovery;
- approve additional ranking pairs only when both locale variants meet the same standard.
