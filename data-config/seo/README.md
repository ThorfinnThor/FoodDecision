# Food Decision Engine SEO Registry

These files control programmatic SEO publication. Page templates may render without being indexable.

## Source Of Truth

- `keywords.json` stores demand hypotheses and human approval.
- `page-definitions.json` stores approved URLs, intent, thresholds, canonicals and internal links.
- `project-seo-config.json` stores project-wide limits and prohibited claims.

## Publication Workflow

1. Validate demand with Search Console, product search queries, a keyword tool or a documented SERP review.
2. Record the evidence in `keywords.json`, then set `validated` to `true` and `status` to `approved`.
3. Review the page intent, canonical and internal links in `page-definitions.json`.
4. Set `status` to `published` and `indexable` to `true` only after human review.
5. Run `npm run seo:validate`.
6. Inspect `generated/seo/build-report.json` locally. It is intentionally not committed.

A page enters the sitemap only when registry approval and every automated quality threshold pass. Unknown pages and finder query combinations default to `noindex,follow`.
