import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogGrid } from "@/components/CatalogGrid";
import { SiteHeader } from "@/components/SiteHeader";
import { categoryFinderPath, categoryGroups, categoryPagePath } from "@/lib/discovery";
import { localizedPath, pick } from "@/lib/i18n";
import { requireLocale } from "@/lib/locale-page";
import { getCatalog } from "@/lib/static-data";
import { BRAND_NAME } from "@/lib/brand";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return (["de-DE", "en-US"] as const).flatMap((locale) => getCatalog(locale).getIngredients(3, 150).map((ingredient) => ({
    locale: locale === "de-DE" ? "de" : "en-us",
    slug: ingredient.slug,
  })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const values = await params;
  const locale = requireLocale(values.locale);
  const ingredient = getCatalog(locale).getIngredient(values.slug);
  if (!ingredient) return {};
  const canonical = localizedPath(locale, `/ingredient/${ingredient.slug}`);
  return {
    title: pick(locale, `Produkte mit ${ingredient.name} | ${BRAND_NAME}`, `Products with ${ingredient.name} | ${BRAND_NAME}`),
    description: pick(locale, `${ingredient.products.length} Produkte nennen ${ingredient.name} in ihrer veröffentlichten Zutatenliste.`, `${ingredient.products.length} products list ${ingredient.name} in their published ingredient list.`),
    alternates: { canonical },
    robots: { index: false, follow: true },
  };
}

export default async function IngredientPage({ params }: Props) {
  const values = await params;
  const locale = requireLocale(values.locale);
  const catalog = getCatalog(locale);
  const ingredient = catalog.getIngredient(values.slug);
  if (!ingredient) notFound();
  const path = (value = "/") => localizedPath(locale, value);
  const groups = categoryGroups(ingredient.products, catalog.getCategories());
  const related = catalog.getIngredients(2, 300)
    .filter((candidate) => candidate.slug !== ingredient.slug)
    .map((candidate) => ({ candidate, overlap: candidate.products.filter((product) => ingredient.products.some((item) => item.id === product.id)).length }))
    .filter((item) => item.overlap >= 2)
    .sort((a, b) => b.overlap - a.overlap || a.candidate.name.localeCompare(b.candidate.name, locale))
    .slice(0, 8);

  return <main>
    <SiteHeader locale={locale} />
    <nav className="breadcrumb"><Link href={path()}>{pick(locale, "Start", "Home")}</Link><span>/</span><Link href={path("/ingredients")}>{pick(locale, "Zutaten", "Ingredients")}</Link><span>/</span><span>{ingredient.name}</span></nav>
    <section className="subpage-hero compact-subpage-hero">
      <p className="eyebrow">{pick(locale, "Zutat im Katalog", "Ingredient in the catalog")}</p>
      <h1>{pick(locale, `Produkte mit ${ingredient.name}`, `Products with ${ingredient.name}`)}</h1>
      <p>{pick(locale, `${ingredient.products.length} Produkte aus ${groups.length} Kategorien nennen diese Zutat. Rezepturen können sich jederzeit ändern.`, `${ingredient.products.length} products across ${groups.length} categories list this ingredient. Formulas can change at any time.`)}</p>
    </section>
    <section className="section discovery-context-section">
      <div className="ingredient-caution"><strong>{pick(locale, "Was diese Seite aussagt", "What this page tells you")}</strong><p>{pick(locale, "Der Begriff wurde in der veröffentlichten Zutatenliste gefunden. Das ist keine Aussage über Menge, Eignung, Gesundheit oder Allergenfreiheit. Prüfe bei Unverträglichkeiten immer die aktuelle Verpackung.", "The term was found in the published ingredient list. This does not establish quantity, suitability, health impact, or allergen safety. Always check the current package when managing an intolerance.")}</p></div>
      <div className="section-heading"><p className="eyebrow">{pick(locale, "Vorkommen nach Kategorie", "Occurrences by category")}</p><h2>{pick(locale, "Wo die Zutat genannt wird", "Where the ingredient is listed")}</h2></div>
      <div className="category-breakdown">{groups.map((group) => <article key={group.category.slug}>
        <div><strong>{group.category.label}</strong><span>{group.products.length} {pick(locale, "Produkte", "products")}</span></div>
        <p>{pick(locale, `${group.rankingEligible} davon sind für kategoriespezifische Rankings geeignet.`, `${group.rankingEligible} are eligible for category specific rankings.`)}</p>
        <div><Link href={categoryPagePath(locale, group.category)}>{pick(locale, "Kategorie öffnen", "Open category")}</Link><Link href={`${categoryFinderPath(locale, group.category)}&q=${encodeURIComponent(ingredient.name)}`}>{pick(locale, "Im Finder prüfen", "Use in finder")}</Link></div>
      </article>)}</div>
      {related.length ? <div className="related-entities"><h3>{pick(locale, "Häufig gemeinsam genannt", "Frequently listed together")}</h3><div>{related.map(({ candidate, overlap }) => <Link href={path(`/ingredient/${candidate.slug}`)} key={candidate.slug}><strong>{candidate.name}</strong><span>{overlap} {pick(locale, "gemeinsame Produkte", "shared products")}</span></Link>)}</div></div> : null}
    </section>
    <section className="section section-soft"><div className="section-heading"><p className="eyebrow">{pick(locale, "Produkte", "Products")}</p><h2>{pick(locale, `Zutatenlisten mit ${ingredient.name}`, `Ingredient lists with ${ingredient.name}`)}</h2></div><CatalogGrid categories={groups.map((group) => group.category)} locale={locale} products={ingredient.products} /></section>
  </main>;
}
