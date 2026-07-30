import type { Metadata } from "next";
import { ProductCard } from "@/components/ProductCard";
import { SiteHeader } from "@/components/SiteHeader";
import { finderResults, getCategories } from "@/lib/data";

export const metadata: Metadata = {
  title: "Finder - Food Decision Engine",
  description: "Filterbare Produktentscheidung mit erklaerbarem Match-Score.",
};

export default function FinderPage() {
  const results = finderResults();

  return (
    <main>
      <SiteHeader />
      <section className="subpage-hero">
        <p className="eyebrow">Finder</p>
        <h1>Produkte nach Ziel filtern</h1>
        <p>
          Der MVP zeigt die spaetere Finder-Logik als server-gerenderte Oberflaeche.
          Interaktive Filter werden im naechsten Schritt an Search Params angebunden.
        </p>
      </section>

      <section className="finder-layout">
        <aside className="filter-panel">
          <p className="eyebrow">Filter Scope</p>
          <h2>MVP Filter</h2>
          <div className="filter-group">
            <span>Kategorien</span>
            {getCategories().map((category) => (
              <a href={`/category/${category.slug}`} key={category.slug}>{category.label}</a>
            ))}
          </div>
          <div className="filter-group">
            <span>Ziele</span>
            <button>wenig Zucker</button>
            <button>mehr Protein</button>
            <button>vegan</button>
            <button>familientauglich</button>
          </div>
        </aside>
        <section className="finder-results">
          {results.map((product) => (
            <ProductCard product={product} key={product.id} />
          ))}
        </section>
      </section>
    </main>
  );
}
