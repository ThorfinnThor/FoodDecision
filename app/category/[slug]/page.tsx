import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { SiteHeader } from "@/components/SiteHeader";
import { getCategories, getCategory, getProductsByCategory } from "@/lib/data";

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

  return (
    <main>
      <SiteHeader />
      <section className="subpage-hero">
        <p className="eyebrow">Kategorie</p>
        <h1>{category.label}</h1>
        <p>{category.description}</p>
        <div className="hero-actions">
          {category.rankingAttributes.slice(0, 2).map((attribute) => (
            <Link href={`/best/${attribute}/${category.slug}`} key={attribute}>
              {attribute}
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Produktabdeckung</p>
          <h2>{items.length} Fixture-Produkte in dieser Kategorie</h2>
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
