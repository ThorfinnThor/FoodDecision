import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { categoryRouteSlug, localizedPath, pick } from "@/lib/i18n";
import { localeAlternates, requireLocale } from "@/lib/locale-page";
import { getCatalog } from "@/lib/static-data";
import type { CatalogQualityStatus } from "@/lib/types";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  return {
    title: pick(locale, "Datenabdeckung - Food Decision Engine", "Data coverage - Food Decision Engine"),
    description: pick(locale, "Aktuelle Abdeckung und Datenqualität des veröffentlichten Lebensmittelkatalogs.", "Current coverage and data quality of the published food catalog."),
    alternates: localeAlternates(locale, "/data-quality"),
  };
}

export default async function DataQualityPage({ params }: Props) {
  const locale = requireLocale((await params).locale);
  const catalog = getCatalog(locale);
  const report = catalog.qualityReport;
  const c = (de: string, en: string) => pick(locale, de, en);
  const percent = (value: number, total = report.totals.products) => total ? `${Math.round((value / total) * 100)}%` : "0%";
  const statusLabels: Record<CatalogQualityStatus, string> = {
    solid: c("Solide Größe", "Solid size"),
    developing: c("Im Aufbau", "Developing"),
    thin: c("Kleine Auswahl", "Small selection"),
    unavailable: c("Noch nicht verfügbar", "Not available yet"),
  };
  const generatedAt = new Date(report.generatedAt).toLocaleDateString(locale, { dateStyle: "long" });

  return <main>
    <SiteHeader locale={locale} />
    <section className="subpage-hero data-quality-hero">
      <p className="eyebrow">{c("Katalogtransparenz", "Catalog transparency")}</p>
      <h1>{c("Was unser Katalog derzeit wirklich abdeckt", "What our catalog actually covers today")}</h1>
      <p>{c("Wir zeigen Umfang und Datenlücken des veröffentlichten Katalogs offen. Eine große Produktzahl ersetzt dabei weder vollständige Angaben noch eine aktuelle Verpackungsprüfung.", "We openly show the scope and gaps of the published catalog. A large product count does not replace complete information or checking the current package.")}</p>
      <small>{c(`Stand des letzten Katalogexports: ${generatedAt}`, `Last catalog export: ${generatedAt}`)}</small>
    </section>

    <section className="data-quality-summary" aria-label={c("Katalogübersicht", "Catalog overview")}>
      <div><strong>{report.totals.products.toLocaleString(locale)}</strong><span>{c("veröffentlichte Produkte", "published products")}</span></div>
      <div><strong>{percent(report.totals.rankingEligible)}</strong><span>{c("für Rankings geeignet", "eligible for rankings")}</span></div>
      <div><strong>{percent(report.totals.completeNutrition)}</strong><span>{c("mit vollständigen Nährwerten", "with complete nutrition")}</span></div>
      <div><strong>{percent(report.totals.recentlyUpdated)}</strong><span>{c("mit aktuellem Quellenstand", "with recent source data")}</span></div>
    </section>

    <section className="section data-quality-section">
      <div className="section-heading">
        <p className="eyebrow">{c("Nach Kategorie", "By category")}</p>
        <h2>{c("Abdeckung und Verwendbarkeit", "Coverage and usability")}</h2>
        <p>{c("„Rankingfähig“ bedeutet, dass die erforderlichen Werte und eine ausreichende Datensicherheit für mindestens eine belastbare Einordnung vorhanden sind.", "Ranking eligible means the required values and sufficient data confidence are available for at least one reliable assessment.")}</p>
      </div>
      <div className="data-quality-table-wrap">
        <table className="data-quality-table">
          <thead><tr><th>{c("Kategorie", "Category")}</th><th>{c("Abdeckung", "Coverage")}</th><th>{c("Produkte", "Products")}</th><th>{c("Rankingfähig", "Ranking eligible")}</th><th>{c("Nährwerte", "Nutrition")}</th><th>{c("Zutaten", "Ingredients")}</th><th>{c("Bilder", "Images")}</th><th>{c("Aktuell", "Recent")}</th></tr></thead>
          <tbody>{report.categories.map((category) => <tr key={category.slug}>
            <th scope="row">{category.products ? <Link href={localizedPath(locale, `/category/${categoryRouteSlug(category.slug, locale)}`)}>{category.label}</Link> : category.label}</th>
            <td><span className={`coverage-status is-${category.status}`}>{statusLabels[category.status]}</span></td>
            <td>{category.products.toLocaleString(locale)}</td>
            <td>{category.rankingCoveragePercent}%</td>
            <td>{category.nutritionCoveragePercent}%</td>
            <td>{category.ingredientCoveragePercent}%</td>
            <td>{category.imageCoveragePercent}%</td>
            <td>{category.recentCoveragePercent}%</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>

    <section className="detail-section data-quality-explainer">
      <div className="section-heading"><p className="eyebrow">{c("So lesen wir die Zahlen", "How to read the numbers")}</p><h2>{c("Breite und Qualität bleiben getrennt", "Breadth and quality stay separate")}</h2></div>
      <div>
        <article><h3>{c("Abdeckung", "Coverage")}</h3><p>{c("Ab 50 Produkten nennen wir die Kategorie von der Größe her solide, zwischen 20 und 49 im Aufbau und darunter eine kleine Auswahl. Das ist keine Bewertung der einzelnen Produkte.", "We call a category solid in size at 50 products, developing from 20 to 49, and a small selection below that. This is not a rating of individual products.")}</p></article>
        <article><h3>{c("Aktualität", "Freshness")}</h3><p>{c("Als aktuell zählen Quellenstände, die beim Import höchstens 180 Tage alt waren. Die Produktseite zeigt das genaue Quellen- und Importdatum.", "Source data counts as recent when it was no more than 180 days old at import. Product pages show the exact source and import dates.")}</p></article>
        <article><h3>{c("Bilder", "Images")}</h3><p>{c("Gezählt werden nur Produktbilder mit einer für die Anzeige bestätigten offenen Lizenz. Fehlende oder ungeklärte Bilder werden nicht als verfügbar gewertet.", "Only product images with a confirmed open license for display are counted. Missing or unverified images are not treated as available.")}</p></article>
      </div>
    </section>
  </main>;
}
