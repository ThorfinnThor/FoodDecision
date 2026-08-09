# UX and Catalog Remediation

## Product cards

- Removed technical tie-break panels from customer-facing catalog cards.
- Kept the deterministic ranking logic while explaining it once above the
  results in plain language.
- Limited long product names to three lines and anchored card actions to the
  bottom so a single long title no longer distorts the whole row.

## Score explanation

- Replaced the full-width green calculation band with compact formula blocks.
- Reserved green for the result instead of using it as the background for the
  entire explanation.
- Stacked all formula blocks at the full available width on small screens.

## German crackers

- Expanded the display category to "Cracker und Knäckebrot" because German
  Open Food Facts coverage for crackers alone is too small for useful ranking.
- Added `crispbread` as a weighted ingestion source alongside `crackers` and
  `wheat-crackers`.
- A one-page dry run accepted 40 products even though one of the three sources
  temporarily returned HTTP 503. Partial source failures therefore do not
  discard useful results.
- Replaced the generic cracker image with a public-domain crispbread photo by
  Cymydog Naakka from Wikimedia Commons. Attribution remains visible on the
  image credits page.

## Verification scope

- Desktop catalog at 1440 by 900 pixels.
- Mobile catalog and product score explanation at 390 by 844 pixels.
- No horizontal overflow or console errors in the checked flows.
- Automated unit, regression, ingestion, growth-plan, SEO, and production build
  gates remain required before publication.
