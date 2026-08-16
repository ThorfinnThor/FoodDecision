import {
  comparisonCohort,
  comparisonProductLabel,
  hasDistinctComparisonIdentity,
  hasPlausibleComparisonCategory,
  meaningfulComparisonDifferenceCount,
} from "./comparison-quality.ts";
import type { Product } from "./types.ts";

export type ComparisonAuditIssue = {
  pair: string;
  code:
    | "invalid_pair_id"
    | "missing_product"
    | "self_comparison"
    | "category_mismatch"
    | "basis_mismatch"
    | "category_identity_conflict"
    | "cohort_mismatch"
    | "ambiguous_identity"
    | "insufficient_difference";
  detail: string;
};

export function auditComparisonPairs(products: Product[], pairs: string[]) {
  const issues: ComparisonAuditIssue[] = [];
  const bySlug = new Map(products.map((product) => [product.slug, product]));

  for (const pair of pairs) {
    const slugs = pair.split("-vs-");
    if (slugs.length !== 2) {
      issues.push({ pair, code: "invalid_pair_id", detail: "Pair ID must contain exactly two product slugs." });
      continue;
    }
    const first = bySlug.get(slugs[0]);
    const second = bySlug.get(slugs[1]);
    if (!first || !second) {
      issues.push({ pair, code: "missing_product", detail: "One or both products are missing from the locale catalog." });
      continue;
    }
    if (first.slug === second.slug) issues.push({ pair, code: "self_comparison", detail: "A product cannot be compared with itself." });
    if (first.category !== second.category) issues.push({ pair, code: "category_mismatch", detail: `${first.category} vs ${second.category}` });
    if (first.nutrition.basis !== second.nutrition.basis) issues.push({ pair, code: "basis_mismatch", detail: `${first.nutrition.basis} vs ${second.nutrition.basis}` });
    if (!hasPlausibleComparisonCategory(first) || !hasPlausibleComparisonCategory(second)) {
      issues.push({
        pair,
        code: "category_identity_conflict",
        detail: `${comparisonProductLabel(first)} or ${comparisonProductLabel(second)} does not plausibly match ${first.category}.`,
      });
    }
    if (comparisonCohort(first) !== comparisonCohort(second)) {
      issues.push({ pair, code: "cohort_mismatch", detail: `${comparisonCohort(first)} vs ${comparisonCohort(second)}` });
    }
    if (!hasDistinctComparisonIdentity(first, second)) {
      issues.push({ pair, code: "ambiguous_identity", detail: comparisonProductLabel(first) });
    }
    const differenceCount = meaningfulComparisonDifferenceCount(first, second);
    if (differenceCount < 2) {
      issues.push({ pair, code: "insufficient_difference", detail: `${differenceCount} meaningful differences` });
    }
  }

  return issues;
}
