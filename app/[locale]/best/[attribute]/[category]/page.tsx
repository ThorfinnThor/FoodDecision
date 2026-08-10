import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RankingDecision } from "@/components/RankingDecision";
import { RankingList } from "@/components/RankingList";
import { SiteHeader } from "@/components/SiteHeader";
import { StructuredData } from "@/components/StructuredData";
import {
  categoryFromRouteSlug,
  categoryRouteSlug,
  localizedPath,
  pick,
  rankingFromRouteSlug,
  rankingRouteSlug,
} from "@/lib/i18n";
import { requireLocale } from "@/lib/locale-page";
import { buildRankingInsights } from "@/lib/ranking-insights";
import {
  absoluteUrl,
  averageDataCompleteness,
  countUniqueInsights,
  evaluateSeoPage,
  getSeoPageDefinition,
} from "@/lib/seo";
import { getCatalog } from "@/lib/static-data";
import { BRAND_NAME } from "@/lib/brand";
import { openDatabaseLicenseUrl, openFoodFactsUrl } from "@/lib/geo";

type Props = {
  params: Promise<{ locale: string; attribute: string; category: string }>;
};

export function generateStaticParams() {
  return (["de-DE", "en-US"] as const).flatMap((locale) => {
    const catalog = getCatalog(locale);
    return catalog.rankingPages
      .filter((page) => catalog.rankedProducts(page.category, page.sortScore).length > 0)
      .map((page) => ({
        locale: locale === "de-DE" ? "de" : "en-us",
        attribute: rankingRouteSlug(page.attribute, locale),
        category: categoryRouteSlug(page.category, locale),
      }));
  });
}

function resolve(values: { locale: string; attribute: string; category: string }) {
  const locale = requireLocale(values.locale);
  const catalog = getCatalog(locale);
  const attribute = rankingFromRouteSlug(values.attribute, locale);
  const category = categoryFromRouteSlug(values.category, locale);
  const ranking = attribute && category ? catalog.getRanking(attribute, category) : null;
  const items = ranking ? catalog.rankedProducts(ranking.category, ranking.sortScore) : [];
  const categoryItems = category ? catalog.getProductsByCategory(category) : [];
  const insights = ranking
    ? buildRankingInsights(locale, ranking, items, categoryItems, catalog.manifest.generatedAt)
    : null;
  return { locale, catalog, ranking, items, categoryItems, insights };
}

function seoDecision(
  path: string,
  ranking: NonNullable<ReturnType<typeof resolve>["ranking"]>,
  items: ReturnType<typeof resolve>["items"],
) {
  const definition = getSeoPageDefinition(path);
  return evaluateSeoPage(definition, {
    resultCount: items.length,
    dataCompleteness: averageDataCompleteness(items),
    uniqueInsightCount: countUniqueInsights(items),
    title: definition?.seoTitle ?? ranking.title,
    h1: definition?.h1 ?? ranking.title,
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const values = await params;
  const { locale, catalog, ranking, items, insights } = resolve(values);
  if (!ranking || !insights) return { robots: { index: false, follow: false } };

  const canonical = localizedPath(locale, `/best/${values.attribute}/${values.category}`);
  const definition = getSeoPageDefinition(canonical);
  const decision = seoDecision(canonical, ranking, items);
  const description = definition?.seoDescription ?? insights.answer;

  return {
    title: `${definition?.seoTitle ?? ranking.title} | ${BRAND_NAME}`,
    description,
    alternates: {
      canonical,
      languages: {
        "de-DE": localizedPath("de-DE", `/best/${rankingRouteSlug(ranking.attribute, "de-DE")}/${categoryRouteSlug(ranking.category, "de-DE")}`),
        "en-US": localizedPath("en-US", `/best/${rankingRouteSlug(ranking.attribute, "en-US")}/${categoryRouteSlug(ranking.category, "en-US")}`),
        "x-default": localizedPath("de-DE", `/best/${rankingRouteSlug(ranking.attribute, "de-DE")}/${categoryRouteSlug(ranking.category, "de-DE")}`),
      },
    },
    robots: {
      index: decision.indexable,
      follow: true,
      googleBot: { index: decision.indexable, follow: true },
    },
    openGraph: {
      type: "website",
      title: ranking.title,
      description,
      url: canonical,
      locale: locale === "de-DE" ? "de_DE" : "en_US",
      images: insights.topPick.imageUrl && insights.topPick.imageLicense
        ? [{ url: insights.topPick.imageUrl, alt: `${insights.topPick.name} ${pick(locale, "von", "by")} ${insights.topPick.brand}` }]
        : undefined,
    },
    other: {
      "data-catalog-generated-at": catalog.manifest.generatedAt,
    },
  };
}

export default async function RankingPage({ params }: Props) {
  const values = await params;
  const { locale, catalog, ranking, items, insights } = resolve(values);
  if (!ranking || !insights || !items.length) notFound();

  const path = (value = "/") => localizedPath(locale, value);
  const category = catalog.getCategory(ranking.category);
  if (!category) notFound();

  const canonical = path(`/best/${values.attribute}/${values.category}`);
  const definition = getSeoPageDefinition(canonical);
  const categoryPath = path(`/category/${categoryRouteSlug(category.slug, locale)}`);
  const relatedRankings = catalog.rankingPages
    .filter((candidate) => candidate.category === ranking.category && candidate.attribute !== ranking.attribute)
    .filter((candidate) => catalog.rankedProducts(candidate.category, candidate.sortScore).length >= candidate.minProductsRequired)
    .slice(0, 2);
  const sameGoalRankings = catalog.rankingPages
    .filter((candidate) => candidate.attribute === ranking.attribute && candidate.category !== ranking.category)
    .filter((candidate) => catalog.rankedProducts(candidate.category, candidate.sortScore).length >= candidate.minProductsRequired)
    .slice(0, 4);
  const catalogDate = new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(catalog.manifest.generatedAt));

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: pick(locale, "Start", "Home"), item: absoluteUrl(path()) },
      { "@type": "ListItem", position: 2, name: category.label, item: absoluteUrl(categoryPath) },
      { "@type": "ListItem", position: 3, name: ranking.title, item: absoluteUrl(canonical) },
    ],
  };
  const itemListData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: ranking.title,
    description: insights.answer,
    inLanguage: locale,
    url: absoluteUrl(canonical),
    numberOfItems: items.length,
    itemListElement: items.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: product.name,
      url: absoluteUrl(path(`/product/${product.slug}`)),
    })),
  };
  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: insights.questions.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
  const datasetData = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: ranking.title,
    description: insights.answer,
    url: absoluteUrl(canonical),
    inLanguage: locale,
    dateModified: catalog.manifest.generatedAt,
    creator: { "@type": "Organization", name: BRAND_NAME, url: absoluteUrl("/") },
    isBasedOn: openFoodFactsUrl,
    citation: openFoodFactsUrl,
    license: openDatabaseLicenseUrl,
    measurementTechnique: insights.method.map((item) => item.body).join(" "),
    variableMeasured: [
      { "@type": "PropertyValue", name: pick(locale, "Geeignete Produkte", "Eligible products"), value: insights.stats.eligibleProducts },
      { "@type": "PropertyValue", name: insights.stats.benchmarkLabel, value: insights.stats.benchmarkValue },
      { "@type": "PropertyValue", name: pick(locale, "Hohe Datensicherheit", "High confidence"), value: `${insights.stats.highConfidenceCoverage}%` },
      { "@type": "PropertyValue", name: pick(locale, "Zutatenabdeckung", "Ingredient coverage"), value: `${insights.stats.ingredientCoverage}%` },
    ],
    includedInDataCatalog: {
      "@type": "DataCatalog",
      name: pick(locale, `${BRAND_NAME} Lebensmittelkatalog`, `${BRAND_NAME} food catalog`),
      url: absoluteUrl(path("/data-quality")),
    },
  };

  return <main>
    <StructuredData data={breadcrumbData} />
    <StructuredData data={itemListData} />
    <StructuredData data={faqData} />
    <StructuredData data={datasetData} />
    <SiteHeader locale={locale} />

    <nav className="breadcrumb" aria-label={pick(locale, "Brotkrumen", "Breadcrumb")}>
      <Link href={path()}>{pick(locale, "Start", "Home")}</Link>
      <span aria-hidden="true">/</span>
      <Link href={categoryPath}>{category.label}</Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{pick(locale, "Ranking", "Ranking")}</span>
    </nav>

    <section className="subpage-hero ranking-page-hero">
      <p className="eyebrow">{pick(locale, "Datenbasierte Entscheidung", "Data-based decision")}</p>
      <h1>{definition?.h1 ?? ranking.title}</h1>
      <p>{definition?.editorialSummary ?? ranking.intro}</p>
    </section>

    <section className="ranking-answer-band" aria-labelledby="ranking-answer-title">
      <div className="ranking-answer-copy">
        <p className="eyebrow">{pick(locale, "Direkte Antwort", "Direct answer")}</p>
        <h2 id="ranking-answer-title">{pick(locale, "Was zeigt dieses Ranking?", "What does this ranking show?")}</h2>
        <p>{insights.answer}</p>
      </div>
      <dl className="ranking-provenance">
        <div><dt>{pick(locale, "Quelle", "Source")}</dt><dd><a href={openFoodFactsUrl} rel="noreferrer" target="_blank">Open Food Facts</a></dd></div>
        <div><dt>{pick(locale, "Katalogstand", "Catalog date")}</dt><dd>{catalogDate}</dd></div>
        <div><dt>{pick(locale, "Vergleichsmenge", "Comparison set")}</dt><dd>{items.length === 1
          ? pick(locale, "1 geeignetes Produkt", "1 eligible product")
          : pick(locale, `${items.length} geeignete Produkte`, `${items.length} eligible products`)}</dd></div>
        <div><dt>{pick(locale, "Regel", "Rule")}</dt><dd>{pick(locale, "Gleiche Bezugsbasis, keine Schätzwerte", "Same reference basis, no estimates")}</dd></div>
      </dl>
      <p className="ranking-source-note">{pick(
        locale,
        "Produktdaten können unvollständig sein. Die aktuelle Verpackung hat Vorrang.",
        "Product data may be incomplete. The current package label takes precedence.",
      )} <Link href={path("/editorial-policy")}>{pick(locale, "Quellen und Redaktionsrichtlinie", "Sources and editorial policy")}</Link></p>
    </section>

    <RankingDecision locale={locale} ranking={ranking} insights={insights} />

    <section className="ranking-context ranking-stat-band" aria-label={pick(locale, "Ranking-Daten", "Ranking data")}>
      <div>
        <p className="eyebrow">{pick(locale, "Katalog auf einen Blick", "Catalog at a glance")}</p>
        <h2>{pick(locale, "Vergleichbar und transparent", "Comparable and transparent")}</h2>
      </div>
      <dl className="insight-stats">
        <div><dt>{pick(locale, "Geeignete Produkte", "Eligible products")}</dt><dd>{insights.stats.eligibleProducts}</dd></div>
        <div><dt>{insights.stats.benchmarkLabel}</dt><dd>{insights.stats.benchmarkValue}</dd></div>
        <div><dt>{pick(locale, "Hohe Datensicherheit", "High confidence")}</dt><dd>{insights.stats.highConfidenceCoverage}%</dd></div>
        <div><dt>{pick(locale, "Zutatenabdeckung", "Ingredient coverage")}</dt><dd>{insights.stats.ingredientCoverage}%</dd></div>
      </dl>
    </section>

    <section className="section ranking-results-section" aria-labelledby="complete-ranking-title">
      <div className="section-heading split-heading">
        <div>
          <p className="eyebrow">{pick(locale, "Vollständiges Ranking", "Complete ranking")}</p>
          <h2 id="complete-ranking-title">{items.length === 1
            ? pick(locale, "1 Platzierung", "1 ranked product")
            : pick(locale, `Alle ${items.length} Platzierungen`, `All ${items.length} ranked products`)}</h2>
        </div>
        <p>{pick(
          locale,
          "Die Zahl links ist die Platzierung. Auf der Karte steht der wichtigste Vergleichswert. Bei Gleichstand entscheiden die transparenten Detailregeln. Den allgemeinen Produktscore findest du auf der Produktseite.",
          "The number on the left is the position. The card shows the main comparison value. Transparent detail rules resolve ties. The general product score remains on the product page.",
        )}</p>
      </div>
      <RankingList locale={locale} products={items} scoreType={ranking.sortScore} />
    </section>

    <section className="section section-soft ranking-method-section" aria-labelledby="ranking-method-title">
      <div className="section-heading">
        <p className="eyebrow">{pick(locale, "So entsteht die Reihenfolge", "How the order is calculated")}</p>
        <h2 id="ranking-method-title">{pick(locale, "Eine Regel für alle Produkte", "One rule for every product")}</h2>
        <p>{pick(
          locale,
          "Die Reihenfolge wird aus strukturierten Produktdaten berechnet. Es gibt keine bezahlten Platzierungen und fehlende Angaben werden nicht geschätzt.",
          "The order is calculated from structured product data. There are no paid placements, and missing values are never estimated.",
        )}</p>
      </div>
      <div className="ranking-method-grid">
        {insights.method.map((item, index) => <article key={item.title}><span>0{index + 1}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}
      </div>
      <Link className="text-link ranking-method-link" href={path("/methodology")}>{pick(locale, "Vollständige Methodik ansehen", "Read the full methodology")} <span aria-hidden="true">→</span></Link>
    </section>

    <section className="detail-section ranking-questions-section" aria-labelledby="ranking-questions-title">
      <div className="section-heading">
        <p className="eyebrow">{pick(locale, "Richtig einordnen", "Use the ranking well")}</p>
        <h2 id="ranking-questions-title">{pick(locale, "Fragen vor deiner Entscheidung", "Questions before you choose")}</h2>
      </div>
      <div className="faq-list">
        {insights.questions.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}
      </div>
    </section>

    <section className="detail-section related-ranking-section" aria-labelledby="related-ranking-title">
      <div className="section-heading">
        <p className="eyebrow">{pick(locale, "Nächster sinnvoller Schritt", "Useful next step")}</p>
        <h2 id="related-ranking-title">{pick(locale, "Entscheidung weiter eingrenzen", "Narrow your decision")}</h2>
      </div>
      <nav className="ranking-related-links" aria-label={pick(locale, "Ähnliche Entscheidungen", "Related decisions")}>
        <Link href={`${path("/finder")}?goal=${ranking.sortScore}&category=${ranking.category}`}>{pick(locale, "Mit eigenen Filtern im Finder", "Use your own filters in Finder")}<span aria-hidden="true">→</span></Link>
        <Link href={categoryPath}>{pick(locale, `${category.label}: alle Produkte`, `All ${category.label.toLowerCase()} products`)}<span aria-hidden="true">→</span></Link>
        {relatedRankings.map((candidate) => <Link href={path(`/best/${rankingRouteSlug(candidate.attribute, locale)}/${categoryRouteSlug(candidate.category, locale)}`)} key={`${candidate.attribute}-${candidate.category}`}>{candidate.title}<span aria-hidden="true">→</span></Link>)}
        {sameGoalRankings.map((candidate) => <Link href={path(`/best/${rankingRouteSlug(candidate.attribute, locale)}/${categoryRouteSlug(candidate.category, locale)}`)} key={`${candidate.attribute}-${candidate.category}`}>{candidate.title}<span aria-hidden="true">→</span></Link>)}
      </nav>
    </section>
  </main>;
}
