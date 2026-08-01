import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { ProductCard } from "@/components/ProductCard";
import { ProductVisual } from "@/components/ProductVisual";
import { SiteHeader } from "@/components/SiteHeader";
import { comparisonPairs, getCategories, products, staticManifest } from "@/lib/static-data";
import { scoreByType } from "@/lib/scoring";

export const metadata: Metadata = {
  title: "Food Decision Engine - Lebensmittel besser auswählen",
  description: "Finde Lebensmittel, die zu deinen Prioritäten passen - mit verständlichen Scores, Vergleichen und transparenter Datengrundlage.",
};

const priorities = [
  ["Proteinreich", "protein"],
  ["Wenig Zucker", "low_sugar"],
  ["Vegan", "vegan"],
  ["Familientauglich", "family"],
  ["Gute Zutaten", "ingredient_quality"],
  ["Beste Gesamtwahl", "overall_match"],
];

export default function Home() {
  const categories = getCategories();
  const bestProducts = products
    .filter((product) => product.publishability === "ranking_eligible" || product.publishability === "published")
    .sort((a, b) => (scoreByType(b, "overall_match")?.score ?? 0) - (scoreByType(a, "overall_match")?.score ?? 0))
    .slice(0, 4);
  const comparisonProducts = bestProducts.slice(0, 3);
  const comparisonHref = comparisonPairs[0] ? `/compare/${comparisonPairs[0]}` : "/finder";
  const updatedAt = new Date(staticManifest.generatedAt).toLocaleDateString("de-DE");

  return (
    <main>
      <SiteHeader />

      <section className="home-hero">
        <Image
          alt="Haferdrink, Müsli, Joghurt und ein Proteinriegel auf einem hellen Küchentisch"
          className="hero-background"
          fill
          loading="eager"
          priority
          sizes="100vw"
          src="/images/food-decision-hero.png"
        />
        <div className="hero-content">
          <p className="hero-kicker">Unabhängig. Verständlich. Für deinen Alltag.</p>
          <h1>Finde Lebensmittel, die zu deinen Prioritäten passen.</h1>
          <p>Unsere Decision Engine übersetzt Zutaten, Nährwerte und Datenqualität in klare, nachvollziehbare Empfehlungen.</p>
          <form action="/finder" className="hero-search" role="search">
            <label className="sr-only" htmlFor="hero-search">Produkte durchsuchen</label>
            <input id="hero-search" name="q" placeholder="Produkt, Marke oder Zutat suchen …" type="search" />
            <button type="submit">Suchen</button>
          </form>
          <div className="popular-searches" aria-label="Beliebte Suchen">
            <span>Beliebt:</span>
            <Link href="/best/wenig-zucker/hafermilch">Hafermilch ohne Zucker</Link>
            <Link href="/best/proteinreich/proteinriegel">Proteinreiche Snacks</Link>
          </div>
          <div className="hero-trust"><strong>Transparent bewertet</strong><span>Jeder Score zeigt Gründe und Datenlücken.</span></div>
        </div>
      </section>

      <section className="priority-band" aria-labelledby="priority-title">
        <div className="section-inner">
          <div className="priority-heading">
            <span id="priority-title">Was ist dir wichtig?</span>
            <Link href="/finder">Alle Kriterien</Link>
          </div>
          <div className="priority-chips">
            {priorities.map(([label, goal]) => (
              <Link href={`/finder?goal=${goal}`} key={goal}>{label}</Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="kategorien">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">Nach Kategorie entdecken</p>
            <h2>Entscheide smarter - starte hier</h2>
          </div>
          <p>Wähle eine Produktgruppe und sieh sofort, welche Kriterien in dieser Kategorie wirklich zählen.</p>
        </div>
        <div className="category-grid">
          {categories.map((category) => (
            <Link href={`/category/${category.slug}`} className={`category-card category-${category.slug}`} key={category.slug}>
              <Image alt="" aria-hidden="true" fill sizes="(max-width: 720px) 80vw, 25vw" src="/images/food-decision-hero.png" />
              <span className="category-card-overlay">
                <strong>{category.label}</strong>
                <small>{category.intent}</small>
                <b>Produkte ansehen <span aria-hidden="true">→</span></b>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section section-soft" id="empfehlungen">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">Schnelle Orientierung</p>
            <h2>Unsere Top-Empfehlungen</h2>
          </div>
          <p>Nach Gesamturteil sortiert. Öffne ein Produkt, um alle Gründe und Einschränkungen zu sehen.</p>
        </div>
        <div className="product-grid">
          {bestProducts.map((product) => <ProductCard product={product} key={product.id} />)}
        </div>
      </section>

      <section className="section" id="vergleich">
        <div className="comparison-teaser">
          <div className="comparison-preview">
            {comparisonProducts.map((product) => (
              <div className="comparison-mini" key={product.id}>
                <ProductVisual product={product} compact />
                <span>{product.name}</span>
              </div>
            ))}
          </div>
          <div className="comparison-copy">
            <p className="eyebrow">Direktvergleich</p>
            <h2>Unterschiede sehen, schneller entscheiden.</h2>
            <p>Vergleiche Zucker, Protein, Zutaten und Gesamturteil nebeneinander. Die stärkere Wahl wird für jedes Kriterium erklärt.</p>
            <Link className="button-link" href={comparisonHref}>Zum Vergleich</Link>
          </div>
        </div>
      </section>

      <section className="section method-section" id="methodik">
        <div className="section-heading centered-heading">
          <p className="eyebrow">Decision Engine Score</p>
          <h2>Eine Zahl reicht nicht. Deshalb zeigen wir das Warum.</h2>
          <p>Unsere Bewertung trennt die wichtigsten Dimensionen und kennzeichnet Unsicherheit sichtbar.</p>
        </div>
        <div className="method-grid">
          <article><span>01</span><h3>Nährwerte</h3><p>Kategoriebezogene Bewertung statt pauschaler Gesundheitsversprechen.</p></article>
          <article><span>02</span><h3>Zutaten</h3><p>Zutatenlänge, zugesetzter Zucker und erkennbare Zusatzstoffe.</p></article>
          <article><span>03</span><h3>Dein Ziel</h3><p>Protein, wenig Zucker, vegan oder familientauglich - du entscheidest.</p></article>
          <article><span>04</span><h3>Datenqualität</h3><p>Fehlende Angaben werden offengelegt und niemals als Null gewertet.</p></article>
        </div>
      </section>

      <section className="trust-strip" aria-label="Unsere Grundsätze">
        <div><strong>Datenbasiert</strong><span>Klare Regeln statt Werbeversprechen</span></div>
        <div><strong>Unabhängig</strong><span>Affiliate-Angebote verändern keine Scores</span></div>
        <div><strong>Verständlich</strong><span>Gründe statt undurchsichtiger Bewertung</span></div>
        <div><strong>Aktualisiert</strong><span>Letzter Datenexport: {updatedAt}</span></div>
      </section>

      <section className="newsletter-section">
        <div>
          <p className="eyebrow">Neue Kategorien & Rankings</p>
          <h2>Bessere Entscheidungen, ohne Informationsstress.</h2>
          <p>Erhalte gelegentliche Updates zu neuen Vergleichen und verbesserten Daten.</p>
        </div>
        <NewsletterSignup />
      </section>
    </main>
  );
}
