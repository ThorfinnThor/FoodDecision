import type { Metadata } from "next";
import { CatalogGrid } from "@/components/CatalogGrid";
import { SiteHeader } from "@/components/SiteHeader";
import { pick } from "@/lib/i18n";
import { localeAlternates, requireLocale } from "@/lib/locale-page";
import { getCatalog } from "@/lib/static-data";
import { BRAND_NAME } from "@/lib/brand";

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const locale = requireLocale((await params).locale); return { title: pick(locale, `Alle Produkte | ${BRAND_NAME}`, `All products | ${BRAND_NAME}`), description: pick(locale, "Durchsuche den bewerteten Lebensmittelkatalog nach Ziel, Marke und Kategorie.", "Search the assessed food catalog by goal, brand, and category."), alternates: localeAlternates(locale, "/products"), robots: { index: false, follow: true } }; }
export default async function ProductsPage({ params }: Props) { const locale = requireLocale((await params).locale); const catalog = getCatalog(locale); return <main><SiteHeader locale={locale} /><section className="subpage-hero compact-subpage-hero"><p className="eyebrow">{pick(locale, "Produktkatalog", "Product catalog")}</p><h1>{pick(locale, "Alle bewerteten Produkte", "All assessed products")}</h1><p>{pick(locale, "Durchsuche den aktuellen Marktkatalog oder sortiere nach deinem Ziel.", "Search the current market catalog or sort by your goal.")}</p></section><section className="section"><CatalogGrid categories={catalog.getAvailableCategories()} locale={locale} products={catalog.finderResults()} /></section></main>; }
