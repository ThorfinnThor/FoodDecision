import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { SiteHeader } from "@/components/SiteHeader";
import { getCategories, getCategory, getProductsByCategory, rankingPages } from "@/lib/static-data";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getCategories().map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) return {};

  return {
    title: `${category.label} - Food Decision Engine`,
    description: category.description,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const items = getProductsByCategory(category.slug);
  const categoryRankings = rankingPages.filter((ranking) => ranking.category === category.slug);

  return (
    <main>
      <SiteHeader />
      <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Start</Link><span aria-hidden="true">/</span><span aria-current="page">{category.label}</span></nav>
      <section className="subpage-hero">
        <p className="eyebrow">Kategorie entdecken</p>
        <h1>{category.label}</h1>
        <p>{category.description}</p>
        <div className="hero-actions">
          {categoryRankings.map((ranking) => (
            <Link href={`/best/${ranking.attribute}/${category.slug}`} key={ranking.attribute}>
              {ranking.title}
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Produkte vergleichen</p>
          <h2>{items.length} Produkte mit nachvollziehbarer Bewertung</h2>
          <p>Sortiere über ein passendes Ranking oder öffne eine Produktseite für alle Details.</p>
        </div>
        <div className="product-grid">
          {items.map((product) => (
            <ProductCard product={product} key={product.id} />
          ))}
        </div>
      </section>
    </main>
  );
}
