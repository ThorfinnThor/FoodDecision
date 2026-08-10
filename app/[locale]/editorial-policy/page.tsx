import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { StructuredData } from "@/components/StructuredData";
import { BRAND_NAME } from "@/lib/brand";
import { openDatabaseLicenseUrl, openFoodFactsUrl } from "@/lib/geo";
import { localizedPath, pick } from "@/lib/i18n";
import { localeAlternates, requireLocale } from "@/lib/locale-page";
import { absoluteUrl } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  return {
    title: pick(locale, `Redaktionsrichtlinie | ${BRAND_NAME}`, `Editorial policy | ${BRAND_NAME}`),
    description: pick(
      locale,
      "Quellen, Berechnung, Aktualisierung, Unabhängigkeit und Grenzen der Lebensmittelvergleiche.",
      "Sources, calculations, updates, independence, and limitations of the food comparisons.",
    ),
    alternates: localeAlternates(locale, "/editorial-policy"),
    robots: { index: false, follow: true },
  };
}

export default async function EditorialPolicyPage({ params }: Props) {
  const locale = requireLocale((await params).locale);
  const c = (de: string, en: string) => pick(locale, de, en);
  const path = (value = "/") => localizedPath(locale, value);
  const principlesUrl = absoluteUrl(path("/editorial-policy"));
  const policyData = {
    "@context": "https://schema.org",
    "@type": "DigitalDocument",
    name: c("Redaktionsrichtlinie", "Editorial policy"),
    description: c(
      "Quellen, Berechnung, Aktualisierung und Grenzen der veröffentlichten Lebensmittelvergleiche.",
      "Sources, calculations, updates, and limitations of the published food comparisons.",
    ),
    inLanguage: locale,
    url: principlesUrl,
    publisher: { "@type": "Organization", name: BRAND_NAME, url: absoluteUrl("/") },
    isBasedOn: openFoodFactsUrl,
  };

  return <main>
    <StructuredData data={policyData} />
    <SiteHeader locale={locale} />

    <section className="subpage-hero editorial-policy-hero">
      <p className="eyebrow">{c("Offen dokumentiert", "Documented openly")}</p>
      <h1>{c("So veröffentlichen wir verlässliche Vergleiche", "How we publish reliable comparisons")}</h1>
      <p>{c(
        "Jede Platzierung soll überprüfbar bleiben. Deshalb zeigen wir Datenquelle, Vergleichsbasis, Berechnungsregel, Aktualität und bekannte Grenzen direkt auf der Website.",
        "Every ranking should remain verifiable. We therefore show the data source, comparison basis, calculation rule, update date, and known limitations directly on the website.",
      )}</p>
    </section>

    <section className="editorial-policy-summary" aria-label={c("Grundsätze", "Principles")}>
      <div><strong>{c("Kategoriebezogen", "Category specific")}</strong><span>{c("Nur vergleichbare Produkte treten gegeneinander an.", "Only comparable products are ranked together.")}</span></div>
      <div><strong>{c("Unabhängig", "Independent")}</strong><span>{c("Zahlungen verändern keine Scores oder Platzierungen.", "Payments never change scores or positions.")}</span></div>
      <div><strong>{c("Nachprüfbar", "Verifiable")}</strong><span>{c("Regeln, Datenstand und Unsicherheit bleiben sichtbar.", "Rules, update dates, and uncertainty remain visible.")}</span></div>
    </section>

    <section className="section editorial-policy-grid">
      <article>
        <span>01</span>
        <h2>{c("Datenquelle", "Data source")}</h2>
        <p>{c(
          "Produktdaten stammen aus Open Food Facts und werden vor dem Seitenaufbau importiert. Die Website ruft beim Lesen einer Produktseite keine Produktdaten live von Open Food Facts ab.",
          "Product data comes from Open Food Facts and is imported before pages are built. Reading a product page does not trigger a live product-data request to Open Food Facts.",
        )}</p>
        <a href={openFoodFactsUrl} rel="noreferrer" target="_blank">Open Food Facts <span aria-hidden="true">↗</span></a>
      </article>
      <article>
        <span>02</span>
        <h2>{c("Berechnung", "Calculation")}</h2>
        <p>{c(
          "Versionierte Regeln werden für alle geeigneten Produkte derselben Kategorie gleich angewendet. Fehlende Werte werden nicht als Null behandelt und nicht geschätzt.",
          "Versioned rules are applied equally to every eligible product in the same category. Missing values are never treated as zero or estimated.",
        )}</p>
        <Link href={path("/methodology")}>{c("Methodik lesen", "Read the methodology")} <span aria-hidden="true">→</span></Link>
      </article>
      <article>
        <span>03</span>
        <h2>{c("Aktualisierung", "Updates")}</h2>
        <p>{c(
          "Jede Rankingseite nennt den verwendeten Katalogstand. Neue Importe ersetzen frühere Daten erst nach Normalisierung, Qualitätsprüfung und einem erfolgreichen Export.",
          "Every ranking page states the catalog version it uses. New imports replace earlier data only after normalization, quality checks, and a successful export.",
        )}</p>
        <Link href={path("/data-quality")}>{c("Datenabdeckung prüfen", "Review data coverage")} <span aria-hidden="true">→</span></Link>
      </article>
      <article>
        <span>04</span>
        <h2>{c("Unabhängigkeit", "Independence")}</h2>
        <p>{c(
          "Affiliate Verfügbarkeit, Händlerangebote und bezahlte Platzierungen fließen nicht in Bewertungen oder Reihenfolgen ein. Angebote werden getrennt von der redaktionellen Bewertung dargestellt.",
          "Affiliate availability, merchant offers, and paid placements do not affect assessments or ordering. Offers are shown separately from editorial evaluation.",
        )}</p>
      </article>
      <article>
        <span>05</span>
        <h2>{c("Korrekturen", "Corrections")}</h2>
        <p>{c(
          "Auf Produktseiten können unvollständige oder falsche Angaben gemeldet werden. Eine Meldung verändert den veröffentlichten Katalog nicht automatisch, sondern wird zuerst geprüft.",
          "Incomplete or incorrect information can be reported from product pages. A report never changes the published catalog automatically and is reviewed first.",
        )}</p>
        <Link href={path("/products")}>{c("Produkte ansehen", "View products")} <span aria-hidden="true">→</span></Link>
      </article>
      <article>
        <span>06</span>
        <h2>{c("Grenzen", "Limitations")}</h2>
        <p>{c(
          "Die Website ist eine Entscheidungshilfe und keine medizinische Beratung. Bei Allergien, Unverträglichkeiten oder widersprüchlichen Angaben gilt immer die aktuelle Verpackung.",
          "The website is a decision aid, not medical advice. For allergies, intolerances, or conflicting information, always rely on the current package label.",
        )}</p>
      </article>
    </section>

    <section className="detail-section machine-access-section">
      <div className="section-heading">
        <p className="eyebrow">{c("Maschinenlesbarer Zugang", "Machine-readable access")}</p>
        <h2>{c("Inhalte auffindbar und zitierbar halten", "Keep content discoverable and citable")}</h2>
        <p>{c(
          "Diese Verzeichnisse fassen die öffentlichen Seiten und ihre Bedeutung zusammen. Maßgeblich bleiben der sichtbare Seiteninhalt, die strukturierten Daten und die Crawler Regeln.",
          "These directories summarize the public pages and their meaning. The visible page content, structured data, and crawler rules remain authoritative.",
        )}</p>
      </div>
      <nav aria-label={c("Maschinenlesbare Ressourcen", "Machine-readable resources")}>
        <a href="/llms.txt">llms.txt <span aria-hidden="true">→</span></a>
        <a href="/llms-full.txt">llms-full.txt <span aria-hidden="true">→</span></a>
        <a href="/sitemap.xml">sitemap.xml <span aria-hidden="true">→</span></a>
        <a href="/robots.txt">robots.txt <span aria-hidden="true">→</span></a>
        <a href={openDatabaseLicenseUrl} rel="noreferrer" target="_blank">Open Database License <span aria-hidden="true">↗</span></a>
      </nav>
    </section>
  </main>;
}
