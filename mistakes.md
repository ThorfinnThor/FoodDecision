# Comparison mistakes and prevention rules

## 1. Stored categories were treated as proof

The comparison generator trusted the category attached by an ingestion job. Open Food Facts categories can be broad or overlapping, so cottage cheese entered bread spreads, oats entered pasta sauces, canola spray entered soft drinks, and natto entered plant based yogurt.

**Prevention:** Prepared comparisons now require a plausible product identity for the assigned category. Broad categories are divided into narrower comparison cohorts. Export and CI fail when a generated pair violates either rule.

## 2. Product names were used without enough identity

Table headers and winner labels showed only the product name. Products such as two different brands of cottage cheese therefore appeared to be the same item.

**Prevention:** Comparison titles, answers, cards, table labels, structured data, and recommendations use a brand qualified product label. Pairs with identical visible brand and product labels are rejected.

## 3. Any numerical difference was presented as an advantage

The interface called even tiny value differences a winner. This implied more precision than the source data and scoring model support.

**Prevention:** Sugar, protein, saturated fat, salt, and overall score now have explicit minimum differences. Smaller gaps are labeled as too small, not as a win.

## 4. Broad category peers were assumed to be useful peers

Products could share a category while answering very different shopping questions, such as fish sticks versus dry pasta or crackers versus cereal bars.

**Prevention:** Prepared pairs must share a comparison cohort such as fish meals, pasta meals, crispbread, cereal bars, cola, or broth.

## 5. Tied overall scores hid useful tradeoffs

The page said there was no clear advantage without explaining that one product could lead on protein while the other led on sugar or salt.

**Prevention:** The short answer now distinguishes the overall score from nutrient specific advantages and names both products with their brands.

## 6. Pair volume was optimized before pair relevance was audited

The generator produced a fixed set of combinations from the highest scoring products, but there was no full catalog integrity gate.

**Prevention:** Pair generation is relevance first. Every generated pair is checked during export and again by the comparison integrity audit in CI. Search indexing uses the same shared rules.
