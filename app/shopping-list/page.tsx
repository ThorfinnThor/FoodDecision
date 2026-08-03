import type { Metadata } from "next";
import { SavedProducts } from "@/components/SavedProducts";
import { SiteHeader } from "@/components/SiteHeader";
import { SHOPPING_LIST_KEY } from "@/lib/storage-keys";
import { finderResults } from "@/lib/static-data";

export const metadata: Metadata = { title: "Einkaufsliste - Food Decision Engine", robots: { index: false, follow: true } };

export default function ShoppingListPage() {
  return <main><SiteHeader /><section className="subpage-hero compact-subpage-hero"><p className="eyebrow">Für den Einkauf</p><h1>Deine Einkaufsliste</h1><p>Stelle bessere Alternativen zusammen. Die Liste bleibt lokal auf diesem Gerät.</p></section><section className="section"><SavedProducts emptyCopy="Füge Produkte auf einer Produktseite oder Produktkarte zur Einkaufsliste hinzu." products={finderResults()} storageKey={SHOPPING_LIST_KEY} /></section></main>;
}
