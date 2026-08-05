import type { Metadata } from "next";
import { SavedProducts } from "@/components/SavedProducts";
import { SiteHeader } from "@/components/SiteHeader";
import { pick } from "@/lib/i18n";
import { requireLocale } from "@/lib/locale-page";
import { getCatalog } from "@/lib/static-data";
import { FAVORITES_KEY } from "@/lib/storage-keys";
type Props = { params: Promise<{ locale: string }> };
export const metadata: Metadata = { title: "Favorites - Food Decision Engine", robots: { index: false, follow: true } };
export default async function FavoritesPage({ params }: Props) { const locale = requireLocale((await params).locale); return <main><SiteHeader locale={locale} /><section className="subpage-hero compact-subpage-hero"><p className="eyebrow">{pick(locale, "Gespeichert", "Saved")}</p><h1>{pick(locale, "Deine Favoriten", "Your favorites")}</h1><p>{pick(locale, "Produkte bleiben lokal in diesem Browser gespeichert. Dafür ist kein Konto erforderlich.", "Products stay saved in this browser. No account is required.")}</p></section><section className="section"><SavedProducts emptyCopy={pick(locale, "Markiere Produkte mit dem Herz, um sie hier wiederzufinden.", "Use the heart to save products here.")} locale={locale} products={getCatalog(locale).finderResults()} storageKey={`${FAVORITES_KEY}:${locale}`} /></section></main>; }
