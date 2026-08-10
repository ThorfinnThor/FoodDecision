import Link from "next/link";
import { scoreByType } from "@/lib/scoring";
import type { SeoEditorialContent } from "@/lib/seo-editorial";
import type { Product, ScoreType, SiteLocale } from "@/lib/types";
import { pick } from "@/lib/i18n";

type Props = {
  content: SeoEditorialContent;
  locale: SiteLocale;
  products: Product[];
  scoreType: ScoreType;
};

type MetricKey = "sugar" | "protein" | "fiber" | "salt" | "overall";

const metricSets: Record<ScoreType, MetricKey[]> = {
  low_sugar: ["sugar", "protein", "overall"],
  protein: ["protein", "sugar", "overall"],
  overall_match: ["overall", "sugar", "fiber"],
  nutrition: ["overall", "sugar", "protein"],
  ingredient_quality: ["overall", "sugar", "fiber"],
  family: ["overall", "sugar", "protein"],
  vegan: ["overall", "protein", "sugar"],
};

function localizedNumber(value: number, locale: SiteLocale) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
}

function metricLabel(metric: MetricKey, locale: SiteLocale) {
  const labels: Record<MetricKey, [string, string]> = {
    sugar: ["Zucker", "Sugar"],
    protein: ["Protein", "Protein"],
    fiber: ["Ballaststoffe", "Fiber"],
    salt: ["Salz", "Salt"],
    overall: ["Gesamturteil", "Overall assessment"],
  };
  return pick(locale, ...labels[metric]);
}

function metricValue(product: Product, metric: MetricKey, locale: SiteLocale) {
  if (metric === "overall") {
    const score = scoreByType(product, "overall_match")?.score;
    return score === null || score === undefined ? pick(locale, "Keine Angabe", "Not available") : `${score}/100`;
  }
  const value = product.nutrition[metric];
  return value === null
    ? pick(locale, "Keine Angabe", "Not available")
    : `${localizedNumber(value, locale)} g / ${product.nutrition.basis}`;
}

export function EditorialRankingGuide({ content, locale, products, scoreType }: Props) {
  const metrics = metricSets[scoreType];
  const leaders = products.slice(0, 3);
  const comparisonTitle = leaders.length === 1
    ? pick(locale, "Das führende Produkt mit relevanten Werten", "The leading product and its relevant values")
    : leaders.length === 2
      ? pick(locale, "Die ersten beiden Plätze direkt verglichen", "The top two positions compared")
      : pick(locale, "Die ersten drei Plätze direkt verglichen", "The top three positions compared");
  const reviewedAt = new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(`${content.reviewedAt}T12:00:00Z`));

  return <article className="ranking-editorial" aria-labelledby="ranking-editorial-title">
    <header className="ranking-editorial-header">
      <div>
        <p className="eyebrow">{pick(locale, "Redaktionelle Kaufberatung", "Editorial buying guide")}</p>
        <h2 id="ranking-editorial-title">{content.answerTitle}</h2>
        <p className="ranking-editorial-answer">{content.answer}</p>
      </div>
      <dl className="ranking-editorial-byline">
        <div><dt>{pick(locale, "Verantwortlich", "Prepared by")}</dt><dd>{content.author.name}</dd></div>
        <div><dt>{pick(locale, "Rolle", "Role")}</dt><dd>{content.author.role}</dd></div>
        <div><dt>{pick(locale, "Geprüft", "Reviewed")}</dt><dd><time dateTime={content.reviewedAt}>{reviewedAt}</time></dd></div>
      </dl>
    </header>

    <section className="ranking-editorial-intro" aria-label={pick(locale, "Einordnung", "Context") }>
      {content.introduction.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
    </section>

    <section className="ranking-leader-comparison" aria-labelledby="leader-comparison-title">
      <div className="section-heading">
        <p className="eyebrow">{pick(locale, "Daten statt Vermutungen", "Data before assumptions")}</p>
        <h3 id="leader-comparison-title">{comparisonTitle}</h3>
        <p>{pick(
          locale,
          "Die Tabelle zeigt die Messwerte, die für diese Entscheidung besonders nützlich sind. Keine Angabe bedeutet, dass im aktuellen Katalog kein belastbarer Wert vorliegt.",
          "The table shows the measurements that are most useful for this decision. Not available means the current catalog does not contain a reliable value.",
        )}</p>
      </div>
      <div className="ranking-comparison-scroll" tabIndex={0}>
        <table>
          <thead><tr>
            <th scope="col">{pick(locale, "Platz", "Position")}</th>
            <th scope="col">{pick(locale, "Produkt", "Product")}</th>
            {metrics.map((metric) => <th scope="col" key={metric}>{metricLabel(metric, locale)}</th>)}
          </tr></thead>
          <tbody>{leaders.map((product, index) => <tr key={product.slug}>
            <td><strong>{index + 1}</strong></td>
            <th scope="row"><Link href={`/${locale === "de-DE" ? "de" : "en-us"}/product/${product.slug}`}>{product.name}</Link><span>{product.brand}</span></th>
            {metrics.map((metric) => <td key={metric}>{metricValue(product, metric, locale)}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </section>

    <section className="ranking-buying-guide" aria-labelledby="buying-guide-title">
      <div className="section-heading">
        <p className="eyebrow">{pick(locale, "Vor dem Kauf prüfen", "What to check")}</p>
        <h3 id="buying-guide-title">{pick(locale, "Vier Kriterien für eine bessere Entscheidung", "Four criteria for a better decision")}</h3>
      </div>
      <div className="ranking-buying-guide-grid">
        {content.criteria.map((criterion, index) => <section key={criterion.title}>
          <span aria-hidden="true">0{index + 1}</span>
          <div><h4>{criterion.title}</h4><p>{criterion.body}</p></div>
        </section>)}
      </div>
    </section>

    <section className="ranking-limitations" aria-labelledby="ranking-limitations-title">
      <div>
        <p className="eyebrow">{pick(locale, "Grenzen der Aussage", "Limits of the result")}</p>
        <h3 id="ranking-limitations-title">{pick(locale, "Was dieses Ranking nicht entscheidet", "What this ranking does not decide")}</h3>
      </div>
      <ul>{content.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
    </section>

    <section className="ranking-editorial-faq" aria-labelledby="editorial-faq-title">
      <div className="section-heading">
        <p className="eyebrow">{pick(locale, "Häufige Fragen", "Common questions")}</p>
        <h3 id="editorial-faq-title">{pick(locale, "Die wichtigsten Antworten zum Vergleich", "Key answers about this comparison")}</h3>
      </div>
      <div className="faq-list">
        {content.faq.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}
      </div>
    </section>

    <footer className="ranking-sources" aria-labelledby="ranking-sources-title">
      <div>
        <p className="eyebrow">{pick(locale, "Quellen", "Sources")}</p>
        <h3 id="ranking-sources-title">{pick(locale, "Worauf die Einordnung beruht", "Evidence used for this guide")}</h3>
        <p>{pick(
          locale,
          "Externe Quellen erklären die fachliche Einordnung. Produktwerte und Bilder stammen aus Open Food Facts. Die Quellen bestimmen keine bezahlte Platzierung.",
          "External sources support the editorial context. Product values and images come from Open Food Facts. Sources do not determine paid placement.",
        )}</p>
      </div>
      <ol>{content.sources.map((source) => <li key={source.url}>
        <a href={source.url} rel="noreferrer" target="_blank">{source.title}</a>
        <span>{source.publisher}</span>
        <p>{source.note}</p>
      </li>)}</ol>
    </footer>
  </article>;
}
