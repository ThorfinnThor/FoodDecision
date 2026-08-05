import { gradeLabel, scoreLabel } from "@/lib/scoring";
import type { ProductScore, SiteLocale } from "@/lib/types";

export function ScorePill({ score, compact = false, locale = "de-DE" }: { score: ProductScore; compact?: boolean; locale?: SiteLocale }) {
  return (
    <div className={`score-pill grade-${score.grade} ${compact ? "score-pill-compact" : ""}`}>
      <span>{compact ? "Score" : score.label}</span>
      <strong>{scoreLabel(score, locale)}</strong>
      {compact ? null : <small>{gradeLabel(score.grade, locale)} · {locale === "de-DE" ? `${score.confidence === "high" ? "hohe" : score.confidence === "medium" ? "mittlere" : "niedrige"} Sicherheit` : `${score.confidence === "high" ? "high" : score.confidence === "medium" ? "medium" : "low"} confidence`}</small>}
    </div>
  );
}
