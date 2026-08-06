import Link from "next/link";
import { localizedPath, pick } from "@/lib/i18n";
import type { SiteLocale } from "@/lib/types";
import { LocaleSwitcher } from "./LocaleSwitcher";

export function SiteHeader({ locale }: { locale: SiteLocale }) {
  const path = (value = "/") => localizedPath(locale, value);
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href={path()} className="brand" aria-label={pick(locale, "Food Decision Engine Startseite", "Food Decision Engine home")}>
          <span className="brand-mark" aria-hidden="true">FD</span>
          <span>Food Decision Engine</span>
        </Link>
        <nav className="desktop-nav" aria-label={pick(locale, "Hauptnavigation", "Main navigation")}>
          <Link href={path("/products")}>{pick(locale, "Produkte", "Products")}</Link>
          <Link href={`${path()}#categories`}>{pick(locale, "Kategorien", "Categories")}</Link>
          <Link href={path("/compare")}>{pick(locale, "Vergleiche", "Compare")}</Link>
          <Link href={path("/methodology")}>{pick(locale, "So funktioniert's", "Methodology")}</Link>
        </nav>
        <div className="header-actions">
          <LocaleSwitcher locale={locale} />
          <Link className="saved-link" href={path("/favorites")} title={pick(locale, "Favoriten", "Favorites")}>♡</Link>
          <Link className="saved-link" href={path("/shopping-list")} title={pick(locale, "Einkaufsliste", "Shopping list")}><span aria-hidden="true">✓</span><span className="sr-only">{pick(locale, "Einkaufsliste", "Shopping list")}</span></Link>
          <Link className="search-link" href={path("/scan")}>{pick(locale, "Scannen", "Scan")}</Link>
          <Link className="primary-link" href={path("/finder")}>{pick(locale, "Finder starten", "Start finder")}</Link>
        </div>
        <details className="mobile-menu">
          <summary>{pick(locale, "Menü", "Menu")}</summary>
          <nav aria-label={pick(locale, "Mobile Navigation", "Mobile navigation")}>
            <LocaleSwitcher locale={locale} />
            <Link href={path("/products")}>{pick(locale, "Produkte", "Products")}</Link>
            <Link href={`${path()}#categories`}>{pick(locale, "Kategorien", "Categories")}</Link>
            <Link href={path("/compare")}>{pick(locale, "Vergleiche", "Compare")}</Link>
            <Link href={path("/favorites")}>{pick(locale, "Favoriten", "Favorites")}</Link>
            <Link href={path("/shopping-list")}>{pick(locale, "Einkaufsliste", "Shopping list")}</Link>
            <Link href={path("/scan")}>{pick(locale, "Barcode scannen", "Scan barcode")}</Link>
            <Link href={path("/preferences")}>{pick(locale, "Präferenzen", "Preferences")}</Link>
            <Link href={path("/methodology")}>{pick(locale, "So funktioniert's", "Methodology")}</Link>
            <Link href={path("/finder")}>{pick(locale, "Finder starten", "Start finder")}</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
