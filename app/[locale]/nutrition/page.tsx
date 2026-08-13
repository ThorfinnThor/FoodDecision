import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { nutritionTopics } from "@/lib/discovery";
import { localizedPath, pick } from "@/lib/i18n";
import { localeAlternates, requireLocale } from "@/lib/locale-page";
import { getCatalog } from "@/lib/static-data";
import { BRAND_NAME } from "@/lib/brand";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  return {
    title: pick(locale, `Nährwerte vergleichen | ${BRAND_NAME}`, `Compare nutrition | ${BRAND_NAME}`),
    description: pick(locale, "Vergleiche Zucker, Protein, Kalorien, Ballaststoffe und Salz im passenden Produktkontext.", "Compare sugar, protein, calories, fiber, and salt in the right product context."),
    alternates: localeAlternates(locale, "/nutrition"),
    robots: { index: false, follow: true },
  };
}

export default async function NutritionHubPage({ params }: Props) {
  const locale = requireLocale((await params).locale);
  const catalog = getCatalog(locale);
  const path = (value = "/") => localizedPath(locale, value);
  const topics = nutritionTopics(locale);

  return <main>
    <SiteHeader locale={locale} />
    <nav className="breadcrumb"><Link href={path()}>{pick(locale, "Start", "Home")}</Link><span>/</span><span>{pick(locale, "Nährwerte", "Nutrition")}</span></nav>
    <section className="subpage-hero compact-subpage-hero">
      <p className="eyebrow">{pick(locale, "Nährwertkompass", "Nutrition compass")}</p>
      <h1>{pick(locale, "Nährwerte im richtigen Kontext", "Nutrition in the right context")}</h1>
      <p>{pick(locale, `Vergleiche ${catalog.products.length} Produkte innerhalb ihrer Kategorie und Bezugsbasis. Kein einzelner Nährwert entscheidet allein über die Gesamtbewertung.`, `Compare ${catalog.products.length} products within their category and serving basis. No single nutrient determines the overall assessment.`)}</p>
    </section>
    <section className="section directory-section">
      <div className="section-heading split-heading"><div><p className="eyebrow">{pick(locale, "Fünf Perspektiven", "Five perspectives")}</p><h2>{pick(locale, "Wähle den Wert, den du verstehen möchtest", "Choose the value you want to understand")}</h2></div><p>{pick(locale, "Jede Ansicht trennt Produktgruppen, zeigt fehlende Daten und führt zu den passenden Detailseiten.", "Each view separates product groups, exposes missing data, and leads to the relevant product details.")}</p></div>
      <div className="topic-directory">{topics.map((topic) => <Link href={path(`/nutrition/${topic.route}`)} key={topic.internal}>
        <span className="topic-index">{String(topics.indexOf(topic) + 1).padStart(2, "0")}</span>
        <span><strong>{topic.label}</strong><small>{topic.description}</small></span>
        <b>{pick(locale, "Kategorie wählen", "Choose category")}</b>
      </Link>)}</div>
    </section>
  </main>;
}
