import Link from "next/link";
import { getCategories } from "@/lib/data";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <span className="brand-mark">FDE</span>
        <span>Food Decision Engine</span>
      </Link>
      <nav aria-label="Hauptnavigation">
        {getCategories().slice(0, 3).map((category) => (
          <Link href={`/category/${category.slug}`} key={category.slug}>
            {category.label}
          </Link>
        ))}
        <Link href="/finder">Finder</Link>
      </nav>
    </header>
  );
}
