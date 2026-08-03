import type { Metadata } from "next";
import { BarcodeLookup } from "@/components/BarcodeLookup";
import { SiteHeader } from "@/components/SiteHeader";
import { finderResults } from "@/lib/static-data";

export const metadata: Metadata = { title: "Barcode scannen - Food Decision Engine", description: "Finde ein Lebensmittel per Barcode im aktuellen Katalog.", robots: { index: false, follow: true } };

export default function ScanPage() {
  const products = finderResults().map(({ gtin, name, slug }) => ({ gtin, name, slug }));
  return <main><SiteHeader /><section className="subpage-hero compact-subpage-hero"><p className="eyebrow">Unterwegs entscheiden</p><h1>Barcode scannen</h1><p>Scanne die Packung oder gib die Nummer ein. Kameraaufnahmen verlassen dein Gerät nicht.</p></section><section className="section"><BarcodeLookup products={products} /></section></main>;
}
