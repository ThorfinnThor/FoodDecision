import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataQualityNotice } from "@/components/DataQualityNotice";
import { NutritionTable } from "@/components/NutritionTable";
import { ProductCard } from "@/components/ProductCard";
import { ProductVisual } from "@/components/ProductVisual";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { SiteHeader } from "@/components/SiteHeader";
import { getAlternative, getProduct, products } from "@/lib/static-data";
import { scoreByType } from "@/lib/scoring";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return {};

  return {
    title: `${product.name} - Food Decision Engine`,
    description: product.description,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const alternative = getAlternative(product);
  const overall = scoreByType(product, "overall_match");

  return (
    <main>
      <SiteHeader />
      <section className="product-hero">
        <ProductVisual product={product} />
        <div className="product-hero-copy">
          <p className="eyebrow">{product.brand} · {product.categoryLabel}</p>
          <h1>{product.name}</h1>
          <p>{product.description}</p>
          <div className="hero-metric-row">
            <div>
              <span>Overall Match</span>
              <strong>{overall?.score ?? "?"}/100</strong>
            </div>
            <div>
              <span>Publishability</span>
              <strong>{product.publishability}</strong>
            </div>
            <div>
              <span>Affiliate</span>
              <strong>{product.affiliateAvailable ? "bereit" : "offen"}</strong>
            </div>
          </div>
          <div className="hero-actions">
            <Link href={`/compare/${product.slug}-vs-${alternative?.slug ?? products[0].slug}`}>
              Mit Alternative vergleichen
            </Link>
            <Link href={`/category/${product.category}`}>Kategorie ansehen</Link>
          </div>
        </div>
      </section>

      <DataQualityNotice product={product} />
      <ScoreBreakdown product={product} />
      <NutritionTable product={product} />

      <section className="section compact-section">
        <div className="section-heading">
          <p className="eyebrow">Zutaten und Allergene</p>
          <h2>Was auffaellt</h2>
        </div>
        <div className="two-column">
          <div>
            <h3>Zutaten</h3>
            <ul className="inline-list">
              {product.ingredients.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Allergene</h3>
            <ul className="inline-list">
              {(product.allergens.length ? product.allergens : ["Keine Fixture-Allergene"]).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {alternative ? (
        <section className="section">
          <div className="section-heading">
            <p className="eyebrow">Bessere Alternative</p>
            <h2>Naechster Kandidat in derselben Kategorie</h2>
          </div>
          <ProductCard product={alternative} />
        </section>
      ) : null}
    </main>
  );
}
