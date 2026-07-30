import { gradeLabel, scoreLabel } from "@/lib/scoring";
import type { ProductScore } from "@/lib/types";

export function ScorePill({ score }: { score: ProductScore }) {
  return (
    <div className={`score-pill grade-${score.grade}`}>
      <span>{score.label}</span>
      <strong>{scoreLabel(score)}</strong>
      <small>{gradeLabel(score.grade)} · {score.confidence} confidence</small>
    </div>
  );
}
