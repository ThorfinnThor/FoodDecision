import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <Link href="/" className="brand footer-brand">
            <span className="brand-mark" aria-hidden="true">FD</span>
            <span>Food Decision Engine</span>
          </Link>
          <p>Unabhängige, verständliche Entscheidungshilfe für Lebensmittel im Alltag.</p>
        </div>
        <nav aria-label="Footer Navigation">
          <Link href="/finder">Finder</Link>
          <Link href="/#kategorien">Kategorien</Link>
          <Link href="/#methodik">Methodik</Link>
          <a href="https://world.openfoodfacts.org" rel="noreferrer" target="_blank">Datenquelle</a>
        </nav>
      </div>
      <div className="footer-meta">
        <span>Produktdaten können unvollständig sein. Angaben auf der Verpackung haben Vorrang.</span>
        <span>Open Food Facts: ODbL · Bilder: CC BY-SA</span>
      </div>
    </footer>
  );
}
