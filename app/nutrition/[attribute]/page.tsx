import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { SiteHeader } from "@/components/SiteHeader";
import { categoryCatalog } from "@/lib/catalog";
import { nutritionValue } from "@/lib/product-insights";
import { finderResults } from "@/lib/static-data";

const attributes = {
  zucker: { label: "Zucker", unit: "g", direction: "asc", copy: "Produkte mit niedrigeren ausgewiesenen Zuckerwerten zuerst." },
  protein: { label: "Protein", unit: "g", direction: "desc", copy: "Produkte mit höheren ausgewiesenen Proteinwerten zuerst." },
  kalorien: { label: "Kalorien", unit: "kcal", direction: "asc", copy: "Produkte mit niedrigeren Energiewerten zuerst." },
  ballaststoffe: { label: "Ballaststoffe", unit: "g", direction: "desc", copy: "Produkte mit höheren ausgewiesenen Ballaststoffwerten zuerst." },
  salz: { label: "Salz", unit: "g", direction: "asc", copy: "Produkte mit niedrigeren ausgewiesenen Salzwerten zuerst." },
} as const;

type Props = { params: Promise<{ attribute: string }> };
export function generateStaticParams() { return Object.keys(attributes).map((attribute) => ({ attribute })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const attribute = attributes[(await params).attribute as keyof typeof attributes];
  if (!attribute) return {};
  return { title: `${attribute.label} im Produktvergleich - Food Decision Engine`, description: attribute.copy, robots: { index: false, follow: true } };
}

export default async function NutritionPage({ params }: Props) {
  const key = (await params).attribute;
  const attribute = attributes[key as keyof typeof attributes];
  if (!attribute) notFound();
  const products = finderResults();
  const categoryGroups = categoryCatalog.map((category) => ({
    category,
    items: products.filter((product) => product.category === category.slug && nutritionValue(product, key) !== null).sort((a, b) => {
      const left = nutritionValue(a, key) ?? 0;
      const right = nutritionValue(b, key) ?? 0;
      return attribute.direction === "asc" ? left - right : right - left;
    }).slice(0, 100),
  })).filter((group) => group.items.length > 0);

  return <main><SiteHeader /><nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Start</Link><span>/</span><span>Nährwerte</span><span>/</span><span>{attribute.label}</span></nav><section className="subpage-hero compact-subpage-hero"><p className="eyebrow">Nährwert-Kompass</p><h1>{attribute.label} transparent vergleichen</h1><p>{attribute.copy} Werte gelten pro 100 g oder 100 ml. Rangfolgen bleiben bewusst innerhalb derselben Produktgruppe.</p></section>{categoryGroups.map(({ category, items }) => <section className="section nutrition-category-section" key={category.slug}><div className="section-heading"><p className="eyebrow">{items.length} {items.length === 1 ? "Produkt" : "Produkte"}</p><h2>{category.label}</h2></div><div className="nutrition-ranking-list">{items.map((product, index) => <div className="nutrition-ranking-item" key={product.id}><span className="rank-number">{index + 1}</span><ProductCard product={product} /><strong className="nutrition-value">{nutritionValue(product, key)} {attribute.unit}</strong></div>)}</div></section>)}</main>;
}
