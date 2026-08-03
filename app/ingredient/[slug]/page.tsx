import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogGrid } from "@/components/CatalogGrid";
import { SiteHeader } from "@/components/SiteHeader";
import { getIngredient, getIngredients } from "@/lib/static-data";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getIngredients(3, 150).map((ingredient) => ({ slug: ingredient.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ingredient = getIngredient((await params).slug);
  if (!ingredient) return {};
  return { title: `Produkte mit ${ingredient.name} - Food Decision Engine`, description: `Lebensmittel mit ${ingredient.name} im transparenten Produktvergleich.`, alternates: { canonical: `/ingredient/${ingredient.slug}` }, robots: { index: false, follow: true } };
}

export default async function IngredientPage({ params }: Props) {
  const ingredient = getIngredient((await params).slug);
  if (!ingredient) notFound();
  return <main><SiteHeader /><nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Start</Link><span>/</span><Link href="/products">Produkte</Link><span>/</span><span>{ingredient.name}</span></nav><section className="subpage-hero compact-subpage-hero"><p className="eyebrow">Zutatenwelt</p><h1>Produkte mit {ingredient.name}</h1><p>{ingredient.products.length} Produkte nennen diese Zutat in den verfügbaren Daten. Rezepturen können sich ändern; im Zweifel gilt die Verpackung.</p></section><section className="section"><CatalogGrid products={ingredient.products} /></section></main>;
}
