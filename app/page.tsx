import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { SiteHeader } from "@/components/SiteHeader";
import { getCategories, products, rankingPages, staticManifest } from "@/lib/static-data";
import { scoreByType } from "@/lib/scoring";

export const metadata: Metadata = {
  title: "Food Decision Engine - MVP",
  description:
    "Erklaerbare Lebensmittel-Scores, Rankings, Vergleiche und Produktalternativen.",
};

export default function Home() {
  const categories = getCategories();
  const bestProducts = products
    .filter((product) => product.publishability === "ranking_eligible")
    .sort((a, b) => (scoreByType(b, "overall_match")?.score ?? 0) - (scoreByType(a, "overall_match")?.score ?? 0))
    .slice(0, 3);

  return (
    <main>
      <SiteHeader />
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">MVP Vertical Slice</p>
          <h1>Food Decision Engine</h1>
          <p>
            Ein erster implementierter Kern fuer erklaerbare Lebensmittelentscheidungen:
            Produktdaten, Score-Objekte, Publishability-Gates, Rankings und Vergleiche.
          </p>
          <div className="hero-actions">
            <Link href="/finder">Finder oeffnen</Link>
            <Link href="/best/wenig-zucker/hafermilch">Ranking ansehen</Link>
          </div>
        </div>
        <div className="decision-panel" aria-label="MVP Status">
          <div>
            <span>Startkategorien</span>
            <strong>{categories.length}</strong>
          </div>
          <div>
            <span>Static JSON Produkte</span>
            <strong>{products.length}</strong>
          </div>
          <div>
            <span>SEO-Rankings</span>
            <strong>{rankingPages.length}</strong>
          </div>
          <p>
            Rankings bleiben bewusst noindex, bis echte Importdaten genug Produktabdeckung liefern.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Launch Scope</p>
          <h2>Startkategorien mit klarer Suchintention</h2>
        </div>
        <div className="category-grid">
          {categories.map((category) => (
            <Link href={`/category/${category.slug}`} className="category-card" key={category.slug}>
              <span>{category.label}</span>
              <strong>{category.intent}</strong>
              <small>{category.rankingAttributes.join(" · ")}</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Beste Fixture-Kandidaten</p>
          <h2>Produkte mit hohem Overall Match</h2>
        </div>
        <div className="product-grid">
          {bestProducts.map((product) => (
            <ProductCard product={product} key={product.id} />
          ))}
        </div>
      </section>

      <section className="notice wide-notice">
        <div>
          <p className="eyebrow">Naechster technischer Schritt</p>
          <h2>Fixtures durch Open-Food-Facts-Import ersetzen</h2>
        </div>
        <p>
          Diese Version liest oeffentliche Seiten aus `public/data`. Quelle des letzten Exports:
          {" "}{staticManifest.source}, erzeugt am {new Date(staticManifest.generatedAt).toLocaleDateString("de-DE")}.
        </p>
      </section>
    </main>
  );
}
