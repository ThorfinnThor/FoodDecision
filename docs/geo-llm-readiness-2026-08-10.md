# GEO and LLM readiness

Date: 2026-08-10

## Objective

Make Compare Your Food easy to discover, interpret, and cite in search and answer engines without weakening editorial controls or publishing unvalidated SEO pages.

## Implemented

- Search and user-directed retrieval crawlers are explicitly allowed.
- Model training crawlers are handled separately and are blocked by default.
- `/llms.txt` provides a concise public directory of the site's purpose, primary pages, sources, and limitations.
- `/llms-full.txt` provides a bilingual directory of all ranking pages that meet the catalog threshold at build time.
- Every ranking page now contains a visible direct answer, source, catalog date, comparison set, and rule summary.
- Ranking pages expose matching `Dataset`, `ItemList`, `BreadcrumbList`, and visible FAQ data.
- A bilingual editorial policy documents sources, calculations, updates, independence, corrections, and limitations.
- The site-wide `WebSite` entity links to the applicable publishing principles.

## Crawler policy

Allowed for search or user-directed retrieval:

- `OAI-SearchBot`
- `ChatGPT-User`
- `Claude-SearchBot`
- `Claude-User`
- `PerplexityBot`
- `Perplexity-User`

Blocked from model training or non-search grounding:

- `GPTBot`
- `ClaudeBot`
- `Google-Extended`

This separation keeps search and citation access available while avoiding an unnecessary assumption that model training improves discoverability.

## Guardrails

- GEO content must remain visible to people and must not exist only in structured data.
- Structured data must match the visible page content.
- Missing product values must not be estimated or presented as zero.
- Rankings must remain category specific and disclose the deciding metric.
- Pages remain `noindex, follow` until keyword evidence, editorial approval, the production domain, and canonical URLs are complete.
- `llms.txt` is a convenience directory, not a ranking factor or replacement for crawlable pages.

## Sources checked

- OpenAI Publishers and Developers FAQ: OAI SearchBot access, `noindex`, referral tracking, GPTBot separation, and ARIA guidance.
- Google Search Central, AI features and your website: standard SEO requirements, visible text, internal links, page experience, and matching structured data.
- Anthropic crawler guidance: separate ClaudeBot, Claude User, and Claude SearchBot controls.
- Perplexity crawler documentation: separate PerplexityBot and Perplexity User behavior.

## Domain launch checklist

1. Set `NEXT_PUBLIC_SITE_URL=https://compareyourfood.com` in production.
2. Confirm that `robots.txt`, `sitemap.xml`, `llms.txt`, and `llms-full.txt` use the final domain.
3. Recheck canonicals and `hreflang` for both locales.
4. Validate structured data against the rendered production pages.
5. Approve only keyword-backed pages for indexation.
6. Submit the sitemap in Google Search Console and monitor ChatGPT referral parameters in Vercel Analytics.
