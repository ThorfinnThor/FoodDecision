import type { Metadata } from "next";
import { SavedProducts } from "@/components/SavedProducts";
import { SiteHeader } from "@/components/SiteHeader";
import { pick } from "@/lib/i18n";
import { requireLocale } from "@/lib/locale-page";
import { getCatalog } from "@/lib/static-data";
import { SHOPPING_LIST_KEY } from "@/lib/storage-keys";
import { BRAND_NAME } from "@/lib/brand";
type Props = { params: Promise<{ locale: string }> };
export const metadata: Metadata = { title: `Shopping list | ${BRAND_NAME}`, robots: { index: false, follow: true } };
export default async function ShoppingListPage({ params }: Props) { const locale = requireLocale((await params).locale); return <main><SiteHeader locale={locale} /><section className="subpage-hero compact-subpage-hero"><p className="eyebrow">{pick(locale, "Für den Einkauf", "For your next shop")}</p><h1>{pick(locale, "Deine Einkaufsliste", "Your shopping list")}</h1><p>{pick(locale, "Hake Produkte beim Einkauf ab, kopiere die Liste oder entferne erledigte Einträge. Alles bleibt lokal auf diesem Gerät.", "Check off products as you shop, copy the list, or remove completed items. Everything stays on this device.")}</p></section><section className="section saved-workspace-section"><SavedProducts emptyCopy={pick(locale, "Füge Produkte aus einer Produktseite oder deinen Favoriten hinzu.", "Add products from a product page or your favorites.")} locale={locale} mode="shopping" products={getCatalog(locale).finderResults()} storageKey={`${SHOPPING_LIST_KEY}:${locale}`} /></section></main>; }
