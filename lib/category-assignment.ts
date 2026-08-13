import { categoryCatalog } from "./catalog.ts";
import type { CategorySlug } from "./types.ts";

const categoryPriority = new Map(
  categoryCatalog.map((category, index) => [category.slug, index]),
);

export function primaryCategory(values: Iterable<string | null | undefined>): CategorySlug | null {
  const candidates = [...new Set(values)]
    .filter((value): value is CategorySlug => Boolean(value && categoryPriority.has(value as CategorySlug)))
    .sort((left, right) => {
      const priorityDifference = (categoryPriority.get(left) ?? Number.MAX_SAFE_INTEGER)
        - (categoryPriority.get(right) ?? Number.MAX_SAFE_INTEGER);
      return priorityDifference || left.localeCompare(right);
    });

  return candidates[0] ?? null;
}

export function isPrimaryCategory(
  category: string,
  values: Iterable<string | null | undefined>,
) {
  return primaryCategory(values) === category;
}
