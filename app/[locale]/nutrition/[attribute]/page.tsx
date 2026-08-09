import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { SiteHeader } from "@/components/SiteHeader";
import { categoryPagePath, nutritionTopics } from "@/lib/discovery";
import { localizedPath, pick } from "@/lib/i18n";
import { requireLocale } from "@/lib/locale-page";
import { nutritionValue } from "@/lib/product-insights";
import { getCatalog } from "@/lib/static-data";
import { BRAND_NAME } from "@/lib/brand";

type Props = { params: Promise<{ locale: string; attribute: string }> };

function nutritionBasisLabel(basis: "100g" | "100ml") {
  return basis === "100ml" ? "100 ml" : "100 g";
}

export function generateStaticParams() {
  return (["de-DE", "en-US"] as const).flatMap((locale) => nutritionTopics(locale).map((topic) => ({
    locale: locale === "de-DE" ? "de" : "en-us",
    attribute: topic.route,
  })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const values = await params;
  const locale = requireLocale(values.locale);
  const topic = nutritionTopics(locale).find((candidate) => candidate.route === values.attribute);
  if (!topic) return {};
  const otherLocale = locale === "de-DE" ? "en-US" : "de-DE";
  const counterpart = nutritionTopics(otherLocale).find((candidate) => candidate.internal === topic.internal);
  const canonical = localizedPath(locale, `/nutrition/${topic.route}`);
  return {
    title: `${topic.shortLabel} ${pick(locale, "vergleichen", "comparison")} | ${BRAND_NAME}`,
    description: topic.description,
    alternates: {
      canonical,
      languages: counterpart ? {
        [locale]: canonical,
        [otherLocale]: localizedPath(otherLocale, `/nutrition/${counterpart.route}`),
        "x-default": localizedPath("de-DE", `/nutrition/${nutritionTopics("de-DE").find((candidate) => candidate.internal === topic.internal)?.route ?? topic.internal}`),
      } : undefined,
    },
    robots: { index: false, follow: true },
  };
}

export default async function NutritionPage({ params }: Props) {
  const values = await params;
  const locale = requireLocale(values.locale);
  const topic = nutritionTopics(locale).find((candidate) => candidate.route === values.attribute);
  if (!topic) notFound();
  const catalog = getCatalog(locale);
  const groups = catalog.getAvailableCategories().map((category) => {
    const products = catalog.getProductsByCategory(category.slug)
      .filter((product) => product.publishability === "ranking_eligible" || product.publishability === "published")
      .filter((product) => nutritionValue(product, topic.valueKey) !== null)
      .sort((a, b) => {
        const left = nutritionValue(a, topic.valueKey) ?? 0;
        const right = nutritionValue(b, topic.valueKey) ?? 0;
        return topic.direction === "asc" ? left - right : right - left;
      });
    return { category, products, visible: products.slice(0, 6) };
  }).filter((group) => group.products.length);
  const path = (value = "/") => localizedPath(locale, value);

  return <main>
    <SiteHeader locale={locale} />
    <nav className="breadcrumb"><Link href={path()}>{pick(locale, "Start", "Home")}</Link><span>/</span><Link href={path("/nutrition")}>{pick(locale, "Nährwerte", "Nutrition")}</Link><span>/</span><span>{topic.shortLabel}</span></nav>
    <section className="subpage-hero compact-subpage-hero">
      <p className="eyebrow">{pick(locale, "Nährwertkompass", "Nutrition compass")}</p>
      <h1>{topic.label}</h1>
      <p>{topic.description}</p>
    </section>
    <section className="section nutrition-method-band">
      <div><strong>{pick(locale, "Vergleichsbasis", "Comparison basis")}</strong><span>{pick(locale, "Werte pro 100 g oder 100 ml werden nicht miteinander vermischt.", "Values per 100 g and 100 ml are never mixed.")}</span></div>
      <div><strong>{pick(locale, "Reihenfolge", "Order")}</strong><span>{topic.direction === "asc" ? pick(locale, "Niedrigere Werte zuerst", "Lower values first") : pick(locale, "Höhere Werte zuerst", "Higher values first")}</span></div>
      <div><strong>{pick(locale, "Gesamturteil", "Overall assessment")}</strong><span>{pick(locale, "Dieser Einzelwert ersetzt keinen vollständigen Produktscore.", "This single value never replaces a complete product score.")}</span></div>
    </section>
    {groups.map(({ category, products, visible }) => <section className="section nutrition-category-section" key={category.slug}>
      <div className="section-heading split-heading"><div><p className="eyebrow">{products.length} {pick(locale, products.length === 1 ? "Produkt" : "Produkte", products.length === 1 ? "product" : "products")}</p><h2>{category.label}</h2></div><div className="heading-actions"><Link href={categoryPagePath(locale, category)}>{pick(locale, "Kategorie öffnen", "Open category")}</Link><Link href={`${path("/finder")}?category=${category.slug}&goal=${topic.finderGoal}`}>{pick(locale, "Im Finder verfeinern", "Refine in finder")}</Link></div></div>
      <div className="nutrition-ranking-list">{visible.map((product, index) => <div className="nutrition-ranking-item" key={product.id}>
        <span className="rank-number">{index + 1}</span>
        <ProductCard product={product} />
        <strong className="nutrition-value">{nutritionValue(product, topic.valueKey)} {topic.unit}<small>{pick(locale, `pro ${nutritionBasisLabel(product.nutrition.basis)}`, `per ${nutritionBasisLabel(product.nutrition.basis)}`)}</small></strong>
      </div>)}</div>
      {products.length > visible.length ? <Link className="section-more-link" href={`${path("/finder")}?category=${category.slug}&goal=${topic.finderGoal}`}>{pick(locale, `Alle ${products.length} Produkte im Finder ansehen`, `View all ${products.length} products in the finder`)}</Link> : null}
    </section>)}
    {!groups.length ? <section className="section"><div className="empty-state"><h2>{pick(locale, "Noch keine vergleichbaren Werte", "No comparable values yet")}</h2><p>{pick(locale, "Diese Ansicht wird sichtbar, sobald genügend geprüfte Nährwertangaben vorliegen.", "This view becomes useful once enough assessed nutrition values are available.")}</p></div></section> : null}
  </main>;
}
