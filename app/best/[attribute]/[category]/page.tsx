import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { SiteHeader } from "@/components/SiteHeader";
import { getRanking, rankedProducts, rankingPages } from "@/lib/data";

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
      <section className="subpage-hero">
        <p className="eyebrow">{ranking.indexable ? "Indexierbares Ranking" : "Noindex MVP Ranking"}</p>
        <h1>{ranking.title}</h1>
        <p>{ranking.intro}</p>
      </section>

      <section className="notice wide-notice">
        <div>
          <p className="eyebrow">SEO Gate</p>
          <h2>{ranking.indexable ? "Indexierung erlaubt" : "Noch nicht indexierbar"}</h2>
        </div>
        <p>
          Aktuell {items.length} ranking-faehige Produkte. Mindestziel fuer oeffentliche Indexierung:
          {" "}{ranking.minProductsRequired} Produkte mit ausreichender Score-Confidence.
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
