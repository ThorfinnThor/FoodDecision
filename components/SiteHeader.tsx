import Link from "next/link";
import { localizedPath, pick } from "@/lib/i18n";
import type { SiteLocale } from "@/lib/types";
import { BRAND_MARK, BRAND_NAME } from "@/lib/brand";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileMenu } from "./MobileMenu";

export function SiteHeader({ locale }: { locale: SiteLocale }) {
  const path = (value = "/") => localizedPath(locale, value);
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href={path()} className="brand" aria-label={pick(locale, `${BRAND_NAME} Startseite`, `${BRAND_NAME} home`)}>
          <span className="brand-mark" aria-hidden="true">{BRAND_MARK}</span>
          <span>{BRAND_NAME}</span>
        </Link>
        <nav className="desktop-nav" aria-label={pick(locale, "Hauptnavigation", "Main navigation")}>
          <Link href={path("/products")}>{pick(locale, "Produkte", "Products")}</Link>
          <Link href={`${path()}#categories`}>{pick(locale, "Kategorien", "Categories")}</Link>
          <Link href={path("/best")}>{pick(locale, "Rankings", "Rankings")}</Link>
          <Link href={path("/compare")}>{pick(locale, "Vergleiche", "Compare")}</Link>
          <Link href={path("/methodology")}>{pick(locale, "So funktioniert's", "Methodology")}</Link>
        </nav>
        <div className="header-actions">
          <LocaleSwitcher locale={locale} />
          <Link aria-label={pick(locale, "Favoriten öffnen", "Open favorites")} className="saved-link" href={path("/favorites")} title={pick(locale, "Favoriten", "Favorites")}><span aria-hidden="true">♡</span></Link>
          <Link className="saved-link" href={path("/shopping-list")} title={pick(locale, "Einkaufsliste", "Shopping list")}><span aria-hidden="true">✓</span><span className="sr-only">{pick(locale, "Einkaufsliste", "Shopping list")}</span></Link>
          <Link className="search-link" href={path("/scan")}>{pick(locale, "Barcode", "Barcode")}</Link>
          <Link className="primary-link" href={path("/finder")}>{pick(locale, "Finder starten", "Start finder")}</Link>
        </div>
        <MobileMenu locale={locale} />
      </div>
    </header>
  );
}
