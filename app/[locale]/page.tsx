import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { SiteHeader } from "@/components/SiteHeader";
import { StructuredData } from "@/components/StructuredData";
import { categoryRouteSlug, localizedPath, pick } from "@/lib/i18n";
import { requireLocale, localeAlternates } from "@/lib/locale-page";
import { absoluteUrl } from "@/lib/seo";
import { getCatalog } from "@/lib/static-data";
import { scoreByType } from "@/lib/scoring";
import { categoryImage, categoryImageAlt } from "@/lib/category-images";
import { BRAND_NAME } from "@/lib/brand";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  return {
    title: pick(locale, `Lebensmittel besser auswählen | ${BRAND_NAME}`, `Choose food with confidence | ${BRAND_NAME}`),
    description: pick(locale, "Verständliche Scores, Vergleiche und transparente Produktdaten für bessere Einkaufsentscheidungen.", "Understandable scores, comparisons, and transparent product data for better grocery decisions."),
    alternates: localeAlternates(locale),
  };
}

const priorities = [
  ["Proteinreich", "Higher protein", "protein"],
  ["Wenig Zucker", "Lower sugar", "low_sugar"],
  ["Vegan", "Vegan", "vegan"],
  ["Familientauglich", "Suitable for families", "family"],
  ["Gute Zutaten", "Simpler ingredients", "ingredient_quality"],
  ["Beste Gesamtwahl", "Best overall", "overall_match"],
];

export default async function Home({ params }: Props) {
  const locale = requireLocale((await params).locale);
  const catalog = getCatalog(locale);
  const path = (value = "/") => localizedPath(locale, value);
  const bestProducts = catalog.products
    .filter((product) => product.publishability === "ranking_eligible" || product.publishability === "published")
    .sort((a, b) => (scoreByType(b, "overall_match")?.score ?? 0) - (scoreByType(a, "overall_match")?.score ?? 0))
    .slice(0, 4);
  const availableCategories = catalog.getAvailableCategories();
  const updatedAt = new Date(catalog.manifest.generatedAt).toLocaleDateString(locale);

  return (
    <main>
      <StructuredData data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: BRAND_NAME,
        inLanguage: locale,
        url: absoluteUrl(path()),
        potentialAction: { "@type": "SearchAction", target: `${absoluteUrl(path("/finder"))}?q={search_term_string}`, "query-input": "required name=search_term_string" },
      }} />
      <SiteHeader locale={locale} />

      <section className="home-hero">
        <Image alt={pick(locale, "Haferdrink, Müsli, Joghurt und Proteinriegel auf einem Küchentisch", "Oat milk, muesli, yogurt, and a protein bar on a kitchen table")} className="hero-background" fill loading="eager" sizes="100vw" src="/images/food-decision-hero.png" />
        <div className="hero-content">
          <p className="hero-kicker">{pick(locale, "Unabhängige Lebensmittelvergleiche für deinen Alltag", "Independent food comparisons for everyday choices")}</p>
          <h1>{pick(locale, "Finde Lebensmittel, die zu deinen Prioritäten passen.", "Find foods that fit your priorities.")}</h1>
          <p>{pick(locale, "Vergleiche Nährwerte, Zutaten und Datenqualität mit klaren, nachvollziehbaren Gründen.", "Compare nutrition, ingredients, and data quality with clear, explainable reasons.")}</p>
          <form action={path("/finder")} className="hero-search" role="search">
            <label className="sr-only" htmlFor="hero-search">{pick(locale, "Produkte durchsuchen", "Search products")}</label>
            <input id="hero-search" name="q" placeholder={pick(locale, "Produkt, Marke oder Zutat suchen", "Search product, brand, or ingredient")} type="search" />
            <button type="submit">{pick(locale, "Suchen", "Search")}</button>
          </form>
          <div className="hero-trust"><strong>{pick(locale, "Transparent bewertet", "Transparent scoring")}</strong><span>{pick(locale, "Jeder Score zeigt Gründe und Datenlücken.", "Every score shows its reasons and data gaps.")}</span></div>
        </div>
      </section>

      <section className="priority-band" aria-labelledby="priority-title"><div className="section-inner"><div className="priority-heading"><span id="priority-title">{pick(locale, "Was ist dir wichtig?", "What matters to you?")}</span><Link href={path("/finder")}>{pick(locale, "Alle Kriterien", "All criteria")}</Link></div><div className="priority-chips">{priorities.map(([de, en, goal]) => <Link href={`${path("/finder")}?goal=${goal}`} key={goal}>{pick(locale, de, en)}</Link>)}</div></div></section>

      <section className="section" id="categories">
        <div className="section-heading split-heading"><div><p className="eyebrow">{pick(locale, "Nach Kategorie entdecken", "Explore by category")}</p><h2>{pick(locale, "Vergleiche Produkte im richtigen Kontext", "Compare products in the right context")}</h2></div><p>{pick(locale, "Jede Produktgruppe nutzt passende Zielwerte, damit die Bewertung fair und nützlich bleibt.", "Each category uses appropriate reference values so comparisons stay fair and useful.")}</p></div>
        <div className="category-grid">{availableCategories.map((category) => (
          <Link href={path(`/category/${categoryRouteSlug(category.slug, locale)}`)} className={`category-card category-${category.slug}`} key={category.slug}>
            <Image alt={categoryImageAlt(category.slug, locale)} fill sizes="(max-width: 600px) 82vw, (max-width: 1080px) 33vw, 25vw" src={categoryImage(category.slug).src} style={{ objectPosition: categoryImage(category.slug).objectPosition }} />
            <span className="category-card-overlay"><strong>{category.label}</strong><small>{category.intent}</small><b>{catalog.getCategoryProductCount(category.slug)} {pick(locale, "Produkte ansehen", "products")} <span aria-hidden="true">→</span></b></span>
          </Link>
        ))}</div>
        <Link className="category-credit-link" href={path("/image-credits")}>{pick(locale, "Bildnachweise und Lizenzen", "Photo credits and licenses")} <span aria-hidden="true">→</span></Link>
        {!availableCategories.length ? <div className="empty-state"><h3>{pick(locale, "Dieser Marktkatalog wird gerade aufgebaut", "This market catalog is being built")}</h3><p>{pick(locale, "Kategorien werden sichtbar, sobald geprüfte Produkte verfügbar sind.", "Categories appear as soon as assessed products are available.")}</p></div> : null}
      </section>

      <section className="section section-soft">
        <div className="section-heading split-heading"><div><p className="eyebrow">{pick(locale, "Schnelle Orientierung", "Quick orientation")}</p><h2>{pick(locale, "Starke Optionen im aktuellen Katalog", "Strong options in the current catalog")}</h2></div><p>{pick(locale, "Nach Gesamturteil sortiert. Öffne ein Produkt, um Gründe und Einschränkungen zu sehen.", "Sorted by overall score. Open a product to see the reasons and limitations.")}</p></div>
        {bestProducts.length ? <div className="product-grid">{bestProducts.map((product) => <ProductCard product={product} key={product.id} />)}</div> : <div className="empty-state"><h3>{pick(locale, "Dieser Marktkatalog wird gerade aufgebaut", "This market catalog is being built")}</h3><p>{pick(locale, "Die Kategorien und Bewertungslogik sind bereit. Produkte werden erst nach Qualitätsprüfung veröffentlicht.", "Categories and scoring are ready. Products appear only after market-specific quality checks.")}</p></div>}
      </section>

      <section className="section method-section"><div className="section-heading centered-heading"><p className="eyebrow">{BRAND_NAME} Score</p><h2>{pick(locale, "Jede Bewertung zeigt ihre wichtigsten Gründe", "Every score shows the reasons that matter")}</h2><p>{pick(locale, "Bewertungen trennen Nährwerte, Zutaten, dein Ziel und die Datenqualität.", "Scores separate nutrition, ingredients, your goal, and data quality.")}</p></div><div className="method-grid">
        <article><span>01</span><h3>{pick(locale, "Nährwerte", "Nutrition")}</h3><p>{pick(locale, "Der Vergleich nutzt passende Maßstäbe für jede Produktkategorie.", "Each comparison uses reference values suited to its product category.")}</p></article>
        <article><span>02</span><h3>{pick(locale, "Zutaten", "Ingredients")}</h3><p>{pick(locale, "Zutatenlänge, zugesetzter Zucker und erkennbare Zusatzstoffe.", "Ingredient length, added sugar, and detectable additives.")}</p></article>
        <article><span>03</span><h3>{pick(locale, "Dein Ziel", "Your goal")}</h3><p>{pick(locale, "Protein, wenig Zucker, vegan oder für Familien geeignet.", "Protein, lower sugar, vegan, or suitable for families.")}</p></article>
        <article><span>04</span><h3>{pick(locale, "Datenqualität", "Data quality")}</h3><p>{pick(locale, "Fehlende Angaben bleiben sichtbar und werden nicht als Null gewertet.", "Missing values stay visible and are never treated as zero.")}</p></article>
      </div></section>

      <section className="trust-strip" aria-label={pick(locale, "Unsere Grundsätze", "Our principles")}><div><strong>{pick(locale, "Datenbasiert", "Data-based")}</strong><span>{pick(locale, "Klare Regeln statt Werbeversprechen", "Clear rules, not marketing claims")}</span></div><div><strong>{pick(locale, "Unabhängig", "Independent")}</strong><span>{pick(locale, "Affiliate-Angebote verändern keine Scores", "Affiliate offers never change scores")}</span></div><div><strong>{pick(locale, "Nachvollziehbar", "Explainable")}</strong><span>{pick(locale, "Gründe statt undurchsichtiger Bewertung", "Reasons instead of opaque ratings")}</span></div><div><strong>{pick(locale, "Aktualisiert", "Updated")}</strong><span>{pick(locale, "Letzter Datenexport", "Latest data export")}: {updatedAt}</span></div></section>

      <section className="newsletter-section"><div><p className="eyebrow">{pick(locale, "Neue Kategorien und Vergleiche", "New categories and comparisons")}</p><h2>{pick(locale, "Der Katalog wächst direkt auf der Website", "The catalog grows directly on the website")}</h2><p>{pick(locale, "Neue Kategorien werden veröffentlicht, sobald genügend geprüfte Produkte für faire Vergleiche verfügbar sind.", "New categories are published when enough assessed products are available for fair comparisons.")}</p></div><Link className="primary-link" href={path("/data-quality")}>{pick(locale, "Katalogstatus ansehen", "View catalog status")}</Link></section>
    </main>
  );
}
