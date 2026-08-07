import type { ProductScore } from "./types";

export type DataFreshnessStatus = "recent" | "established" | "stale" | "unknown";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function assessDataFreshness(sourceUpdatedAt: string, importedAt: string) {
  const sourceTimestamp = Date.parse(sourceUpdatedAt);
  const importTimestamp = Date.parse(importedAt);
  if (!Number.isFinite(sourceTimestamp) || !Number.isFinite(importTimestamp)) {
    return { ageAtImportDays: null, status: "unknown" as const };
  }

  const ageAtImportDays = Math.max(0, Math.floor((importTimestamp - sourceTimestamp) / DAY_IN_MS));
  const status: DataFreshnessStatus = ageAtImportDays <= 30
    ? "recent"
    : ageAtImportDays <= 180
      ? "established"
      : "stale";
  return { ageAtImportDays, status };
}

export function scoreRuleVersions(scores: ProductScore[]) {
  return [...new Set(scores.map((score) => score.ruleVersion).filter(Boolean))].sort();
}
