import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataQualityNotice } from "@/components/DataQualityNotice";
import { NutritionTable } from "@/components/NutritionTable";
import { ProductCard } from "@/components/ProductCard";
import { ProductVisual } from "@/components/ProductVisual";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { ScorePill } from "@/components/ScorePill";
import { SiteHeader } from "@/components/SiteHeader";
import { StructuredData } from "@/components/StructuredData";
import { absoluteUrl } from "@/lib/seo";
import { getAlternative, getProduct, products } from "@/lib/static-data";
import { gradeLabel, scoreByType } from "@/lib/scoring";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return {};
  return {
    title: `${product.name} - Bewertung & Nährwerte`,
    description: product.description,
    alternates: { canonical: `/product/${product.slug}` },
    robots: { index: false, follow: true },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const alternative = getAlternative(product);
  const comparisonTarget = alternative ?? products.find((item) => item.slug !== product.slug) ?? null;
  const overall = scoreByType(product, "overall_match");
  const positives = [...new Set(product.scores.flatMap((score) => score.positives))].slice(0, 4);
  const negatives = [...new Set(product.scores.flatMap((score) => score.negatives))].slice(0, 3);
  const suitability = product.scores.filter((score) => ["protein", "low_sugar", "vegan", "family"].includes(score.type));
  const suitabilityNames = { protein: "Proteinreich", low_sugar: "Wenig Zucker", vegan: "Vegan", family: "Für Familien" } as const;

  return (
    <main className="product-page">
      <StructuredData data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Product",
            name: product.name,
            description: product.description,
            brand: { "@type": "Brand", name: product.brand },
            gtin13: product.gtin,
            category: product.categoryLabel,
            image: product.imageUrl || undefined,
            url: absoluteUrl(`/product/${product.slug}`),
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Start", item: absoluteUrl("/") },
              { "@type": "ListItem", position: 2, name: product.categoryLabel, item: absoluteUrl(`/category/${product.category}`) },
              { "@type": "ListItem", position: 3, name: product.name, item: absoluteUrl(`/product/${product.slug}`) },
            ],
          },
        ],
      }} />
      <SiteHeader />
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Start</Link><span aria-hidden="true">/</span>
        <Link href={`/category/${product.category}`}>{product.categoryLabel}</Link><span aria-hidden="true">/</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <section className="product-detail-hero">
        <div className="product-detail-visual"><ProductVisual product={product} /></div>
        <div className="product-detail-copy">
          <p className="product-meta">{product.brand} · {product.categoryLabel}</p>
          <h1>{product.name}</h1>
          <p className="product-lead">{product.description}</p>
          {overall ? (
            <div className="main-verdict">
              <ScorePill score={overall} />
              <div><span>Gesamturteil</span><strong>{gradeLabel(overall.grade)}</strong><p>Auf Basis der aktuell verfügbaren Produktdaten.</p></div>
            </div>
          ) : null}
          <div className="pros-cons">
            <div><h2>Spricht dafür</h2><ul>{(positives.length ? positives : ["Keine besonderen Stärken bestätigt."]).map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div><h2>Darauf achten</h2><ul>{(negatives.length ? negatives : ["Keine kritischen Hinweise aus den verfügbaren Daten."]).map((item) => <li key={item}>{item}</li>)}</ul></div>
          </div>
          <div className="hero-actions">
            <Link className="button-link" href="#score-details">Bewertung verstehen</Link>
            {comparisonTarget ? <Link className="secondary-button-link" href={`/compare/${product.slug}-vs-${comparisonTarget.slug}`}>Vergleichen</Link> : null}
          </div>
        </div>
      </section>

      <section className="detail-section suitability-section">
        <div className="section-heading"><p className="eyebrow">Passt das zu mir?</p><h2>Eignung nach Priorität</h2></div>
        <div className="suitability-grid">
          {suitability.map((score) => (
            <article key={score.type}><span>{suitabilityNames[score.type as keyof typeof suitabilityNames]}</span><strong>{score.score ?? "?"}/100</strong><p>{gradeLabel(score.grade)} · {score.confidence === "high" ? "hohe" : score.confidence === "medium" ? "mittlere" : "niedrige"} Sicherheit</p></article>
          ))}
        </div>
      </section>

      <ScoreBreakdown product={product} />

      <section className="detail-section ingredients-section" id="zutaten">
        <div className="section-heading"><p className="eyebrow">Zutaten & Allergene</p><h2>Was du vor dem Kauf wissen solltest</h2></div>
        <div className="two-column">
          <div className="detail-panel"><h3>Zutaten</h3>{product.ingredients.length ? <ul className="tag-list">{product.ingredients.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Keine verlässliche Zutatenliste verfügbar.</p>}</div>
          <div className="detail-panel"><h3>Bekannte Allergene</h3><ul className="tag-list warning-tags">{(product.allergens.length ? product.allergens : ["Keine bestätigten Allergendaten"]).map((item) => <li key={item}>{item}</li>)}</ul><p className="small-note">Bei Allergien zählt immer die aktuelle Verpackungsangabe.</p></div>
        </div>
      </section>

      <NutritionTable product={product} />

      <section className="detail-section source-section">
        <DataQualityNotice product={product} />
      </section>

      {alternative ? (
        <section className="section section-soft">
          <div className="section-heading"><p className="eyebrow">Alternative</p><h2>Eine weitere starke Wahl</h2><p>Aus derselben Kategorie, nach Gesamturteil sortiert.</p></div>
          <div className="single-card-wrap"><ProductCard product={alternative} /></div>
        </section>
      ) : null}

      <section className="detail-section faq-section">
        <div className="section-heading"><p className="eyebrow">Häufige Fragen</p><h2>Gut zu wissen</h2></div>
        <div className="faq-list">
          <details><summary>Ist der Score eine Gesundheitsbewertung?</summary><p>Nein. Er ist eine kategoriespezifische Entscheidungshilfe und keine medizinische Empfehlung.</p></details>
          <details><summary>Wie aktuell sind die Angaben?</summary><p>Der ausgewiesene Datenstand ist {new Date(product.sourceUpdatedAt).toLocaleDateString("de-DE")}. Rezepturen können sich ändern.</p></details>
          <details><summary>Werden fehlende Angaben als schlecht bewertet?</summary><p>Nein. Fehlende Werte bleiben unbekannt und senken die angezeigte Datensicherheit.</p></details>
        </div>
      </section>

      {comparisonTarget ? <div className="mobile-sticky-cta"><Link href={`/compare/${product.slug}-vs-${comparisonTarget.slug}`}>Mit Alternative vergleichen</Link></div> : null}
    </main>
  );
}
