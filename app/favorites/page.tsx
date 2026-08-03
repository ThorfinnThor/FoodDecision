import type { Metadata } from "next";
import { SavedProducts } from "@/components/SavedProducts";
import { SiteHeader } from "@/components/SiteHeader";
import { FAVORITES_KEY } from "@/lib/storage-keys";
import { finderResults } from "@/lib/static-data";

export const metadata: Metadata = { title: "Favoriten - Food Decision Engine", robots: { index: false, follow: true } };

export default function FavoritesPage() {
  return <main><SiteHeader /><section className="subpage-hero compact-subpage-hero"><p className="eyebrow">Gespeichert</p><h1>Deine Favoriten</h1><p>Produkte bleiben lokal in diesem Browser gespeichert. Dafür ist kein Konto erforderlich.</p></section><section className="section"><SavedProducts emptyCopy="Markiere Produkte mit dem Herz, um sie hier wiederzufinden." products={finderResults()} storageKey={FAVORITES_KEY} /></section></main>;
}
