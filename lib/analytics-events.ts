export const analyticsEventNames = [
  "finder_completed",
  "product_opened",
  "comparison_opened",
  "favorite_toggled",
  "shopping_list_toggled",
  "affiliate_clicked",
  "alternative_compared",
  "favorites_added_to_shopping_list",
  "shopping_completed_removed",
  "saved_collection_cleared",
  "shopping_list_copied",
] as const;

export type AnalyticsEventName = (typeof analyticsEventNames)[number];

export function isAnalyticsEventName(value: string): value is AnalyticsEventName {
  return (analyticsEventNames as readonly string[]).includes(value);
}

export function sanitizedAnalyticsMetadata(eventName: AnalyticsEventName, value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const allowed: Partial<Record<AnalyticsEventName, Array<[string, "boolean" | "count" | "text"]>>> = {
    finder_completed: [["goal", "text"], ["category", "text"], ["resultCount", "count"]],
    favorite_toggled: [["selected", "boolean"]],
    shopping_list_toggled: [["selected", "boolean"]],
    affiliate_clicked: [["offerId", "text"], ["merchant", "text"]],
    alternative_compared: [["goal", "text"], ["alternativeId", "text"], ["scoreDelta", "count"]],
    favorites_added_to_shopping_list: [["count", "count"]],
    shopping_completed_removed: [["count", "count"]],
    saved_collection_cleared: [["count", "count"]],
    shopping_list_copied: [["count", "count"]],
  };
  const metadata: Record<string, boolean | number | string> = {};
  for (const [key, type] of allowed[eventName] ?? []) {
    const candidate = source[key];
    if (type === "boolean" && typeof candidate === "boolean") metadata[key] = candidate;
    if (type === "count" && typeof candidate === "number" && Number.isFinite(candidate)) metadata[key] = Math.max(0, Math.min(100_000, Math.round(candidate)));
    if (type === "text" && typeof candidate === "string") metadata[key] = candidate.slice(0, 100);
  }
  return metadata;
}
