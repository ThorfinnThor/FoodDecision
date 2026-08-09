import { categoryInsights } from "./category-insights.ts";
import { pick } from "./i18n.ts";
import { scoreByType } from "./scoring.ts";
import type { Product, RankingPage, ScoreConfidence, ScoreType, SiteLocale } from "./types.ts";

type MetricDirection = "higher" | "lower";

export type RankingMetric = {
  label: string;
  value: string;
  rawValue: number | null;
};

export type RankingQuestion = {
  question: string;
  answer: string;
};

export type RankingInsights = {
  topPick: Product;
  runnerUp: Product | null;
  answer: string;
  benchmark: string;
  topReasons: string[];
  tradeoffs: string[];
  method: Array<{ title: string; body: string }>;
  questions: RankingQuestion[];
  stats: {
    eligibleProducts: number;
    benchmarkLabel: string;
    benchmarkValue: string;
    highConfidenceCoverage: number;
    ingredientCoverage: number;
  };
};

type MetricSpec = {
  direction: MetricDirection;
  value: (product: Product) => number | null;
  label: (product: Product) => string;
  format: (value: number, product: Product, locale: SiteLocale) => string;
};

function localizedNumber(value: number, locale: SiteLocale) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
}

function scoreMetric(scoreType: ScoreType): MetricSpec {
  return {
    direction: "higher",
    value: (product) => scoreByType(product, scoreType)?.score ?? null,
    label: (product) => scoreByType(product, scoreType)?.label ?? pick(product.locale, "Bewertung nach Kriterium", "Criteria score"),
    format: (value) => `${Math.round(value)}/100`,
  };
}

function metricSpec(scoreType: ScoreType): MetricSpec {
  if (scoreType === "low_sugar") {
    return {
      direction: "lower",
      value: (product) => product.nutrition.sugar,
      label: (product) => pick(product.locale, "Zucker", "Sugar"),
      format: (value, product, locale) => `${localizedNumber(value, locale)} g / ${product.nutrition.basis}`,
    };
  }
  if (scoreType === "protein") {
    return {
      direction: "higher",
      value: (product) => product.nutrition.protein,
      label: (product) => pick(product.locale, "Protein", "Protein"),
      format: (value, product, locale) => `${localizedNumber(value, locale)} g / ${product.nutrition.basis}`,
    };
  }
  return scoreMetric(scoreType);
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function confidenceLabel(confidence: ScoreConfidence, locale: SiteLocale) {
  const labels: Record<ScoreConfidence, [string, string]> = {
    high: ["hoch", "high"],
    medium: ["mittel", "medium"],
    low: ["niedrig", "low"],
  };
  return pick(locale, ...labels[confidence]);
}

export function rankingMetric(product: Product, scoreType: ScoreType): RankingMetric {
  const spec = metricSpec(scoreType);
  const value = spec.value(product);
  return {
    label: spec.label(product),
    rawValue: value,
    value: value === null ? pick(product.locale, "Keine Daten", "No data") : spec.format(value, product, product.locale),
  };
}

function benchmarkSentence(
  locale: SiteLocale,
  topPick: Product,
  scoreType: ScoreType,
  benchmarkValue: number | null,
) {
  const spec = metricSpec(scoreType);
  const topValue = spec.value(topPick);
  if (topValue === null || benchmarkValue === null) {
    return pick(
      locale,
      "Für dieses Kriterium ist noch kein belastbarer Kategorienvergleich möglich.",
      "A reliable category benchmark is not yet available for this criterion.",
    );
  }
  const top = spec.format(topValue, topPick, locale);
  const benchmark = spec.format(benchmarkValue, topPick, locale);
  if (scoreType === "low_sugar") {
    return pick(locale, `${top} gegenüber ${benchmark} im Kategorie-Median.`, `${top} versus a category median of ${benchmark}.`);
  }
  if (scoreType === "protein") {
    return pick(locale, `${top} gegenüber ${benchmark} im Kategorie-Median.`, `${top} versus a category median of ${benchmark}.`);
  }
  return pick(locale, `${top} gegenüber ${benchmark} im Median dieses Rankings.`, `${top} versus a median of ${benchmark} in this ranking.`);
}

function runnerUpSentence(locale: SiteLocale, ranking: RankingPage, topPick: Product, runnerUp: Product | null) {
  if (!runnerUp) return "";
  const topMetric = rankingMetric(topPick, ranking.sortScore);
  const secondMetric = rankingMetric(runnerUp, ranking.sortScore);
  if (topMetric.rawValue !== null && secondMetric.rawValue !== null && topMetric.rawValue !== secondMetric.rawValue) {
    return pick(
      locale,
      `${topPick.name} liegt mit ${topMetric.value} vor ${runnerUp.name} mit ${secondMetric.value}.`,
      `${topPick.name} ranks ahead of ${runnerUp.name} with ${topMetric.value} versus ${secondMetric.value}.`,
    );
  }
  const topScore = scoreByType(topPick, ranking.sortScore)?.score;
  const secondScore = scoreByType(runnerUp, ranking.sortScore)?.score;
  if (topScore === null || topScore === undefined || secondScore === null || secondScore === undefined) return "";
  if (topScore === secondScore) {
    return pick(
      locale,
      `${topPick.name} und ${runnerUp.name} haben denselben Vergleichswert. Datensicherheit, Datenvollständigkeit und danach der Produktname bestimmen die stabile Reihenfolge.`,
      `${topPick.name} and ${runnerUp.name} have the same comparison value. Data confidence, data completeness, and then product name keep the order stable.`,
    );
  }
  return pick(
    locale,
    `${topPick.name} liegt beim Rankingwert ${topScore - secondScore} Punkte vor ${runnerUp.name}.`,
    `${topPick.name} leads ${runnerUp.name} by ${topScore - secondScore} points on the ranking score.`,
  );
}

function methodCopy(locale: SiteLocale, ranking: RankingPage) {
  const scoreSpecific: Record<ScoreType, [string, string]> = {
    low_sugar: [
      "Die Produkte stehen nach ihrem Zuckerwert pro 100 g oder 100 ml. Innerhalb derselben Bewertungsstufe steht der niedrigere exakte Wert weiter oben.",
      "Products are ordered by sugar per 100 g or 100 ml. Within the same rating level, the lower exact value ranks higher.",
    ],
    protein: [
      "Die Produkte stehen nach ihrem Proteingehalt pro 100 g oder 100 ml. Innerhalb derselben Bewertungsstufe steht der höhere exakte Wert weiter oben.",
      "Products are ordered by protein per 100 g or 100 ml. Within the same rating level, the higher exact value ranks higher.",
    ],
    ingredient_quality: [
      "Zutatenlänge, erkannter zugesetzter Zucker und erkannte Zusatzstoffe fließen in die Zutatenbewertung ein.",
      "Ingredient list length, detected added sugar, and detected additives contribute to the ingredient score.",
    ],
    family: [
      "Die Bewertung für Familien kombiniert Zucker, Zutatenqualität und Salz konservativ. Sie ersetzt keine individuelle Allergenprüfung.",
      "The family score conservatively combines sugar, ingredient quality, and sodium. It does not replace an individual allergen check.",
    ],
    vegan: [
      "Vegane oder pflanzliche Kennzeichnungen und deklarierte Milchallergene bestimmen die Veganbewertung. Die Verpackung bleibt maßgeblich.",
      "Vegan or plant based labels and disclosed milk allergens determine the vegan score. The package label remains authoritative.",
    ],
    overall_match: [
      "Das Gesamturteil besteht aus 65 Prozent Nährwertbewertung und 35 Prozent Zutatenbewertung. Zucker und Protein fließen nur über die Nährwertbewertung ein und werden nicht doppelt gezählt.",
      "The overall score consists of 65 percent nutrition and 35 percent ingredients. Sugar and protein contribute through nutrition only and are not counted twice.",
    ],
    nutrition: [
      "Die Nährwertbewertung kombiniert Zucker, Protein, Salz und gesättigte Fettsäuren im Kontext der Produktgruppe.",
      "The nutrition score combines sugar, protein, sodium, and saturated fat in the context of the product category.",
    ],
  };
  return [
    {
      title: pick(locale, "Gleiche Vergleichsbasis", "Same comparison basis"),
      body: scoreSpecific[ranking.sortScore][locale === "de-DE" ? 0 : 1],
    },
    {
      title: pick(locale, "Nur geeignete Produkte", "Eligible products only"),
      body: pick(
        locale,
        "Im Ranking erscheinen nur Produkte, die für Rankings freigegeben sind und für das Kriterium einen berechenbaren Score haben.",
        "The ranking includes only products that are eligible for rankings and have a calculable score for the criterion.",
      ),
    },
    {
      title: pick(locale, "Datenlücken bleiben sichtbar", "Data gaps remain visible"),
      body: pick(
        locale,
        "Fehlende Nährwerte oder Zutaten werden nicht geschätzt. Die Datensicherheit steht direkt am Ergebnis.",
        "Missing nutrition or ingredient values are not estimated. Data confidence is shown directly with the result.",
      ),
    },
  ];
}

function decisionQuestions(locale: SiteLocale, ranking: RankingPage, productCount: number, updatedAt: string) {
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(updatedAt));
  const productCountAnswer = productCount === 1
    ? pick(locale, "Aktuell ist ein Produkt für die Rangliste geeignet und wird nach dem veröffentlichten Kriterium eingeordnet.", "One product is currently eligible for the ranking and assessed using the published criterion.")
    : pick(
        locale,
        `${productCount} rankingfähige Produkte werden aktuell nach demselben Kriterium verglichen.`,
        `${productCount} ranking-eligible products are currently compared using the same criterion.`,
      );
  return [
    {
      question: pick(locale, "Wie viele Produkte werden berücksichtigt?", "How many products are included?"),
      answer: productCountAnswer,
    },
    {
      question: pick(locale, "Wie aktuell ist das Ranking?", "How current is this ranking?"),
      answer: pick(
        locale,
        `Die verwendete Katalogversion wurde am ${date} erzeugt. Produktangaben auf der Verpackung haben Vorrang.`,
        `The catalog version used here was generated on ${date}. Product information on the package takes precedence.`,
      ),
    },
    {
      question: pick(locale, "Ist Platz 1 automatisch die beste Wahl für alle?", "Is the #1 product automatically best for everyone?"),
      answer: pick(
        locale,
        `Nein. Platz 1 führt beim Kriterium „${ranking.title}“. Allergene, Geschmack, Preis und deine persönlichen Ziele können zu einer anderen Entscheidung führen.`,
        `No. The #1 product leads for “${ranking.title}.” Allergens, taste, price, and your personal goals can still make another product the better choice.`,
      ),
    },
  ];
}

function tradeoffReasons(locale: SiteLocale, topPick: Product, ranking: RankingPage, categoryProducts: Product[]) {
  const rankingScore = scoreByType(topPick, ranking.sortScore);
  const category = categoryInsights(categoryProducts);
  const candidates: string[] = [...(rankingScore?.negatives ?? [])];

  if (ranking.sortScore === "low_sugar" && topPick.nutrition.protein !== null && category.medianProtein !== null && topPick.nutrition.protein < category.medianProtein) {
    candidates.push(pick(
      locale,
      `Mit ${localizedNumber(topPick.nutrition.protein, locale)} g liegt der Proteingehalt unter dem Kategorie-Median von ${localizedNumber(category.medianProtein, locale)} g.`,
      `At ${localizedNumber(topPick.nutrition.protein, locale)} g, protein is below the category median of ${localizedNumber(category.medianProtein, locale)} g.`,
    ));
  }
  if (ranking.sortScore === "protein" && topPick.nutrition.sugar !== null && category.medianSugar !== null && topPick.nutrition.sugar > category.medianSugar) {
    candidates.push(pick(
      locale,
      `Mit ${localizedNumber(topPick.nutrition.sugar, locale)} g liegt Zucker über dem Kategorie-Median von ${localizedNumber(category.medianSugar, locale)} g.`,
      `At ${localizedNumber(topPick.nutrition.sugar, locale)} g, sugar is above the category median of ${localizedNumber(category.medianSugar, locale)} g.`,
    ));
  }
  if (topPick.allergens.length) {
    candidates.push(pick(locale, `Deklarierte Allergene prüfen: ${topPick.allergens.join(", ")}.`, `Check disclosed allergens: ${topPick.allergens.join(", ")}.`));
  }
  if (!candidates.length) {
    candidates.push(pick(
      locale,
      "Aus den verfügbaren Rankingdaten ergibt sich kein auffälliger Nachteil. Zutaten und Verpackungsangaben trotzdem prüfen.",
      "The available ranking data shows no notable drawback. Still check ingredients and package information.",
    ));
  }
  return unique(candidates).slice(0, 3);
}

export function buildRankingInsights(
  locale: SiteLocale,
  ranking: RankingPage,
  rankedProducts: Product[],
  categoryProducts: Product[],
  generatedAt: string,
): RankingInsights | null {
  const topPick = rankedProducts[0];
  if (!topPick) return null;
  const runnerUp = rankedProducts[1] ?? null;
  const spec = metricSpec(ranking.sortScore);
  const benchmarkValue = median(categoryProducts.map(spec.value).filter((value): value is number => value !== null));
  const rankingScore = scoreByType(topPick, ranking.sortScore);
  const benchmark = benchmarkSentence(locale, topPick, ranking.sortScore, benchmarkValue);
  const runnerUpComparison = runnerUpSentence(locale, ranking, topPick, runnerUp);
  const category = categoryInsights(categoryProducts);
  const highConfidence = rankedProducts.filter((product) => scoreByType(product, ranking.sortScore)?.confidence === "high").length;
  const confidenceCoverage = Math.round((highConfidence / rankedProducts.length) * 100);
  const metric = rankingMetric(topPick, ranking.sortScore);
  const confidence = rankingScore?.confidence ?? "low";
  const metricReason = metric.rawValue === null
    ? null
    : pick(
        locale,
        `Vergleichswert: ${metric.value}. Datensicherheit: ${confidenceLabel(confidence, locale)}.`,
        `Comparison value: ${metric.value}. Data confidence: ${confidenceLabel(confidence, locale)}.`,
      );
  const answer = rankedProducts.length === 1
    ? pick(
        locale,
        `${topPick.name} ist aktuell das einzige rankingfähige Produkt für dieses Kriterium. Für einen belastbaren Wettbewerb werden weitere Produkte benötigt.`,
        `${topPick.name} is currently the only ranking-eligible product for this criterion. More products are needed for a reliable competitive ranking.`,
      )
    : pick(
        locale,
        `${topPick.name} führt aktuell unter ${rankedProducts.length} geeigneten Produkten. ${benchmark}`,
        `${topPick.name} currently leads ${rankedProducts.length} eligible products. ${benchmark}`,
      );

  return {
    topPick,
    runnerUp,
    answer,
    benchmark: runnerUpComparison || benchmark,
    topReasons: unique([metricReason, ...(rankingScore?.positives ?? []), benchmark]).slice(0, 3),
    tradeoffs: tradeoffReasons(locale, topPick, ranking, categoryProducts),
    method: methodCopy(locale, ranking),
    questions: decisionQuestions(locale, ranking, rankedProducts.length, generatedAt),
    stats: {
      eligibleProducts: rankedProducts.length,
      benchmarkLabel: pick(locale, `Median ${metric.label}`, `Median ${metric.label.toLowerCase()}`),
      benchmarkValue: benchmarkValue === null ? "-" : spec.format(benchmarkValue, topPick, locale),
      highConfidenceCoverage: confidenceCoverage,
      ingredientCoverage: category.ingredientCoverage,
    },
  };
}
