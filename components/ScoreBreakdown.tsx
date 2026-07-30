import { scoreLabel } from "@/lib/scoring";
import type { Product } from "@/lib/types";

export function ScoreBreakdown({ product }: { product: Product }) {
  return (
    <section className="section">
      <div className="section-heading">
        <p className="eyebrow">Erklaerbare Scores</p>
        <h2>Warum dieses Produkt so bewertet wird</h2>
      </div>
      <div className="score-grid">
        {product.scores.map((score) => (
          <article className="score-detail" key={score.type}>
            <div className="score-detail-head">
              <h3>{score.label}</h3>
              <strong>{scoreLabel(score)}</strong>
            </div>
            <p>Regelversion {score.ruleVersion} · {score.confidence} confidence</p>
            <ul>
              {[...score.positives, ...score.negatives].slice(0, 3).map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
              {score.missingData.map((item) => (
                <li key={item}>Fehlendes Feld: {item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
