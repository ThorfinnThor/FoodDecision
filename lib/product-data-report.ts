import type { SiteLocale } from "./types";

export const productDataIssueTypes = [
  "package_changed",
  "nutrition_incorrect",
  "ingredients_allergens_incorrect",
  "image_incorrect",
  "product_unavailable",
  "other",
] as const;

export type ProductDataIssueType = typeof productDataIssueTypes[number];

const issueTypeSet = new Set<string>(productDataIssueTypes);

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, maxLength);
}

export function parseProductDataReport(input: Record<string, unknown>) {
  if (input.locale !== "de-DE" && input.locale !== "en-US") return null;
  const locale = input.locale as SiteLocale;
  const productSlug = cleanText(input.productSlug, 160);
  const issueType = cleanText(input.issueType, 80);
  const details = cleanText(input.details, 500);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(productSlug) || !issueTypeSet.has(issueType)) return null;
  return { details, issueType: issueType as ProductDataIssueType, locale, productSlug };
}
