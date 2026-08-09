import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { categoryGroups } from "@/lib/discovery";
import { localizedPath, pick } from "@/lib/i18n";
import { localeAlternates, requireLocale } from "@/lib/locale-page";
import { getCatalog } from "@/lib/static-data";
import { BRAND_NAME } from "@/lib/brand";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  return {
    title: pick(locale, `Zutaten im Produktkatalog | ${BRAND_NAME}`, `Ingredients in the product catalog | ${BRAND_NAME}`),
    description: pick(locale, "Finde häufig genannte Zutaten und die Produkte, in deren Zutatenlisten sie vorkommen.", "Find commonly listed ingredients and the products whose ingredient lists mention them."),
    alternates: localeAlternates(locale, "/ingredients"),
    robots: { index: false, follow: true },
  };
}

export default async function IngredientsPage({ params }: Props) {
  const locale = requireLocale((await params).locale);
  const catalog = getCatalog(locale);
  const path = (value = "/") => localizedPath(locale, value);
  const ingredients = catalog.getIngredients(3, 150);

  return <main>
    <SiteHeader locale={locale} />
    <nav className="breadcrumb"><Link href={path()}>{pick(locale, "Start", "Home")}</Link><span>/</span><span>{pick(locale, "Zutaten", "Ingredients")}</span></nav>
    <section className="subpage-hero compact-subpage-hero">
      <p className="eyebrow">{pick(locale, "Zutatenverzeichnis", "Ingredient directory")}</p>
      <h1>{pick(locale, "Häufig genannte Zutaten", "Frequently listed ingredients")}</h1>
      <p>{pick(locale, "Die Übersicht zeigt Begriffe aus veröffentlichten Zutatenlisten. Sie ersetzt keine Allergieprüfung auf der aktuellen Verpackung.", "This directory shows terms found in published ingredient lists. It never replaces checking the current package for allergens.")}</p>
    </section>
    <section className="section directory-section">
      <div className="section-heading split-heading"><div><p className="eyebrow">{ingredients.length} {pick(locale, "Zutatenbegriffe", "ingredient terms")}</p><h2>{pick(locale, "Vorkommen im Katalog prüfen", "Review catalog occurrences")}</h2></div><p>{pick(locale, "Ähnliche Schreibweisen können getrennt erscheinen. Wir zeigen nur Zutaten, die in mindestens drei Produkten vorkommen.", "Similar spellings may appear separately. Only ingredients listed by at least three products are shown.")}</p></div>
      {ingredients.length ? <div className="entity-directory ingredient-directory">{ingredients.map((ingredient) => {
        const groups = categoryGroups(ingredient.products, catalog.getCategories());
        return <Link href={path(`/ingredient/${ingredient.slug}`)} key={ingredient.slug}>
          <span><strong>{ingredient.name}</strong><small>{groups.slice(0, 3).map((group) => group.category.label).join(" · ")}</small></span>
          <b>{ingredient.products.length} {pick(locale, "Produkte", "products")}</b>
        </Link>;
      })}</div> : <div className="empty-state"><h3>{pick(locale, "Noch kein Zutatenverzeichnis verfügbar", "No ingredient directory available yet")}</h3><p>{pick(locale, "Die Übersicht wächst mit vollständigen und geprüften Zutatenlisten.", "The directory grows as complete, assessed ingredient lists become available.")}</p></div>}
    </section>
  </main>;
}

