import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="Food Decision Engine Startseite">
          <span className="brand-mark" aria-hidden="true">FD</span>
          <span>Food Decision Engine</span>
        </Link>
        <nav className="desktop-nav" aria-label="Hauptnavigation">
          <Link href="/products">Produkte</Link>
          <Link href="/#kategorien">Kategorien</Link>
          <Link href="/compare">Vergleiche</Link>
          <Link href="/methodology">So funktioniert&apos;s</Link>
        </nav>
        <div className="header-actions">
          <Link className="saved-link" href="/favorites" title="Favoriten">♡</Link>
          <Link className="search-link" href="/scan">Scannen</Link>
          <Link className="primary-link" href="/finder">Finder starten</Link>
        </div>
        <details className="mobile-menu">
          <summary>Menü</summary>
          <nav aria-label="Mobile Navigation">
            <Link href="/products">Produkte</Link>
            <Link href="/#kategorien">Kategorien</Link>
            <Link href="/compare">Vergleiche</Link>
            <Link href="/favorites">Favoriten</Link>
            <Link href="/shopping-list">Einkaufsliste</Link>
            <Link href="/scan">Barcode scannen</Link>
            <Link href="/preferences">Präferenzen</Link>
            <Link href="/methodology">So funktioniert&apos;s</Link>
            <Link href="/finder">Finder starten</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
