# Search content quality standard

This standard governs the first six bilingual ranking launch pages. It is a publication gate, not a promise of search rankings.

## Google aligned principles

Google states that it has no preferred word count. Content should instead be useful, original, substantial, trustworthy, and written for people. Reviews and comparisons should explain what was assessed, how the result was produced, and what evidence supports the conclusion.

The implementation follows these principles:

1. Every curated page answers one identifiable shopping question.
2. The ranking rule and its comparison basis are visible before the full list.
3. Product values come from the current static Open Food Facts export and are not invented.
4. Each page contains category specific buying criteria rather than interchangeable filler.
5. Limits, missing data, source date, authorship, and external sources are visible.
6. Structured data describes the article, dataset, ranking list, questions, and breadcrumbs.
7. German pages serve the German market in German. United States pages use US English and US labeling context.

Official references:

* https://developers.google.com/search/docs/fundamentals/creating-helpful-content
* https://developers.google.com/search/docs/essentials
* https://developers.google.com/search/docs/fundamentals/ai-optimization-guide

## Internal completeness gate

The internal gate requires at least 600 words of page specific editorial material, two introductory paragraphs, four decision criteria, three explicit limitations, four individual questions, three supporting sources, an authoring organization, and a review date.

The 600 word threshold is an editorial completeness check. It is not described as a Google requirement. Together with the data driven answer, method, ranking explanation, and source information already rendered by the template, each launch page provides substantially more than 800 words of useful non product card content.

## Search intent findings

### Oat milk with less sugar

Users need a distinction between total sugar, added sugar, and an unsweetened claim. Protein and nutrient fortification matter when the product regularly replaces dairy. The ranking therefore uses one sugar basis while the guide explains protein, calcium, vitamins, ingredients, and intended use.

### Protein bars with more protein

Users need protein density and protein per bar kept separate. The guide explains serving conversion, sugar and sweeteners, protein sources, allergens, and the fact that a higher protein value is not a personal intake recommendation.

### Muesli overall choice

Users need more than a sugar sort. Whole grains, fiber, protein, sodium, saturated fat, ingredients, and portions all affect the decision. The guide explains where catalog coverage is not yet strong enough for a complete fiber or whole grain score.

## Launch blockers

All ranking candidates remain `noindex, follow` until the following decisions are complete:

1. `compareyourfood.com` is connected and configured as the production site URL.
2. Search demand is validated independently for each market and keyword.
3. The final brand mark and organization information are available.
4. Production data passes result count, completeness, and insight thresholds.
5. Canonicals, language alternatives, sitemap output, structured data, and mobile rendering are verified on the final domain.

Indexation must be enabled page by page. A page is not published merely because another page in the cluster is ready.
