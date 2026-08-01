import { gradeLabel, scoreLabel } from "@/lib/scoring";
import type { ProductScore } from "@/lib/types";

export function ScorePill({ score, compact = false }: { score: ProductScore; compact?: boolean }) {
  return (
    <div className={`score-pill grade-${score.grade} ${compact ? "score-pill-compact" : ""}`}>
      <span>{compact ? "Score" : score.label}</span>
      <strong>{scoreLabel(score)}</strong>
      {compact ? null : <small>{gradeLabel(score.grade)} · {score.confidence === "high" ? "hohe" : score.confidence === "medium" ? "mittlere" : "niedrige"} Sicherheit</small>}
    </div>
  );
}
