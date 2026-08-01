import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { SiteHeader } from "@/components/SiteHeader";
import { getRanking, rankedProducts, rankingPages } from "@/lib/static-data";

type Props = {
  params: Promise<{ attribute: string; category: string }>;
};

export function generateStaticParams() {
  return rankingPages.map((page) => ({
    attribute: page.attribute,
    category: page.category,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { attribute, category } = await params;
  const ranking = getRanking(attribute, category);
  if (!ranking) return {};

  return {
    title: `${ranking.title} - Food Decision Engine`,
    description: ranking.intro,
    robots: {
      index: ranking.indexable,
      follow: true,
    },
  };
}

export default async function RankingPage({ params }: Props) {
  const { attribute, category } = await params;
  const ranking = getRanking(attribute, category);
  if (!ranking) notFound();

  const items = rankedProducts(ranking.category, ranking.sortScore);

  return (
    <main>
      <SiteHeader />
      <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Start</Link><span aria-hidden="true">/</span><Link href={`/category/${ranking.category}`}>{ranking.category.replaceAll("-", " ")}</Link><span aria-hidden="true">/</span><span aria-current="page">Ranking</span></nav>
      <section className="subpage-hero">
        <p className="eyebrow">Datenbasiertes Ranking</p>
        <h1>{ranking.title}</h1>
        <p>{ranking.intro}</p>
      </section>

      <section className="ranking-context">
        <div>
          <p className="eyebrow">So wird sortiert</p>
          <h2>Vergleichbar und transparent</h2>
        </div>
        <p>
          Aktuell werden {items.length} geeignete Produkte anhand desselben Kriteriums verglichen. Datenlücken und Unsicherheit bleiben auf jeder Produktseite sichtbar.
        </p>
      </section>

      <section className="section">
        <div className="ranking-list">
          {items.map((product, index) => (
            <div className="ranking-row" key={product.id}>
              <span className="rank-number">{index + 1}</span>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
