import type { Metadata } from "next";
import { SavedProducts } from "@/components/SavedProducts";
import { SiteHeader } from "@/components/SiteHeader";
import { pick } from "@/lib/i18n";
import { requireLocale } from "@/lib/locale-page";
import { getCatalog } from "@/lib/static-data";
import { SHOPPING_LIST_KEY } from "@/lib/storage-keys";
type Props = { params: Promise<{ locale: string }> };
export const metadata: Metadata = { title: "Shopping list - Food Decision Engine", robots: { index: false, follow: true } };
export default async function ShoppingListPage({ params }: Props) { const locale = requireLocale((await params).locale); return <main><SiteHeader locale={locale} /><section className="subpage-hero compact-subpage-hero"><p className="eyebrow">{pick(locale, "Für den Einkauf", "For your next shop")}</p><h1>{pick(locale, "Deine Einkaufsliste", "Your shopping list")}</h1><p>{pick(locale, "Die Liste bleibt lokal auf diesem Gerät.", "The list stays on this device.")}</p></section><section className="section"><SavedProducts emptyCopy={pick(locale, "Füge Produkte aus einer Produktseite hinzu.", "Add products from a product page.")} locale={locale} products={getCatalog(locale).finderResults()} storageKey={`${SHOPPING_LIST_KEY}:${locale}`} /></section></main>; }
