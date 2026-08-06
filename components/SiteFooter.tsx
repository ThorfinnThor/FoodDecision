import Link from "next/link";
import { localizedPath, pick } from "@/lib/i18n";
import type { SiteLocale } from "@/lib/types";

export function SiteFooter({ locale }: { locale: SiteLocale }) {
  const path = (value = "/") => localizedPath(locale, value);
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <Link href={path()} className="brand footer-brand">
            <span className="brand-mark" aria-hidden="true">FD</span>
            <span>Food Decision Engine</span>
          </Link>
          <p>{pick(locale, "Unabhängige, verständliche Entscheidungshilfe für Lebensmittel im Alltag.", "Independent, understandable food guidance for everyday decisions.")}</p>
        </div>
        <nav aria-label="Footer Navigation">
          <Link href={path("/finder")}>Finder</Link>
          <Link href={path("/products")}>{pick(locale, "Produkte", "Products")}</Link>
          <Link href={path("/compare")}>{pick(locale, "Vergleiche", "Compare")}</Link>
          <Link href={path("/methodology")}>{pick(locale, "Methodik", "Methodology")}</Link>
          <Link href={path("/image-credits")}>{pick(locale, "Bildnachweise", "Photo credits")}</Link>
          <a href="https://world.openfoodfacts.org" rel="noreferrer" target="_blank">{pick(locale, "Datenquelle", "Data source")}</a>
        </nav>
      </div>
      <div className="footer-meta">
        <span>{pick(locale, "Produktdaten können unvollständig sein. Angaben auf der Verpackung haben Vorrang.", "Product data may be incomplete. Always rely on the current package label.")}</span>
        <span>{pick(locale, "Open Food Facts: ODbL · Produktbilder: CC BY-SA · Kategoriebilder: offene Lizenzen", "Open Food Facts: ODbL · Product images: CC BY-SA · Category photos: open licenses")}</span>
      </div>
    </footer>
  );
}
