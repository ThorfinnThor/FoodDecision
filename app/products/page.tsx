import type { Metadata } from "next";
import { CatalogGrid } from "@/components/CatalogGrid";
import { SiteHeader } from "@/components/SiteHeader";
import { finderResults, getCategories } from "@/lib/static-data";

export const metadata: Metadata = {
  title: "Alle Produkte - Food Decision Engine",
  description: "Durchsuche und sortiere den bewerteten Lebensmittelkatalog nach Ziel, Marke und Kategorie.",
  alternates: { canonical: "/products" },
  robots: { index: false, follow: true },
};

export default function ProductsPage() {
  const products = finderResults();
  return (
    <main>
      <SiteHeader />
      <section className="subpage-hero compact-subpage-hero">
        <p className="eyebrow">Produktkatalog</p>
        <h1>Alle bewerteten Produkte</h1>
        <p>Durchsuche den aktuellen Datenexport, sortiere nach deinem Ziel oder starte den Finder für eine persönliche Auswahl.</p>
      </section>
      <section className="section"><CatalogGrid categories={getCategories()} products={products} /></section>
    </main>
  );
}
