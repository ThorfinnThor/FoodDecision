import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogGrid } from "@/components/CatalogGrid";
import { SiteHeader } from "@/components/SiteHeader";
import { getBrand, getBrands } from "@/lib/static-data";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getBrands().filter((brand) => brand.products.length >= 2).map((brand) => ({ slug: brand.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const brand = getBrand((await params).slug);
  if (!brand) return {};
  return { title: `${brand.name} Produkte - Food Decision Engine`, description: `${brand.products.length} Produkte von ${brand.name} transparent bewertet.`, alternates: { canonical: `/brand/${brand.slug}` }, robots: { index: false, follow: true } };
}

export default async function BrandPage({ params }: Props) {
  const brand = getBrand((await params).slug);
  if (!brand) notFound();
  return <main><SiteHeader /><nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Start</Link><span>/</span><Link href="/products">Produkte</Link><span>/</span><span>{brand.name}</span></nav><section className="subpage-hero compact-subpage-hero"><p className="eyebrow">Markenwelt</p><h1>{brand.name}</h1><p>{brand.products.length} Produkte aus {new Set(brand.products.map((product) => product.category)).size} Kategorien. Scores sind kategoriespezifisch und nicht zwischen beliebigen Produktarten gleichzusetzen.</p></section><section className="section"><CatalogGrid products={brand.products} /></section></main>;
}
