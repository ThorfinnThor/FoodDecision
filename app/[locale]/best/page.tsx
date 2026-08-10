import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { StructuredData } from "@/components/StructuredData";
import {
  categoryRouteSlug,
  localizedPath,
  pick,
  rankingRouteSlug,
} from "@/lib/i18n";
import { localeAlternates, requireLocale } from "@/lib/locale-page";
import { absoluteUrl } from "@/lib/seo";
import { getCatalog } from "@/lib/static-data";
import { BRAND_NAME } from "@/lib/brand";

type Props = { params: Promise<{ locale: string }> };

const goalOrder = [
  "beste-wahl",
  "wenig-zucker",
  "proteinreich",
  "gute-zutaten",
  "familie",
  "vegan",
] as const;

function goalCopy(locale: "de-DE" | "en-US", attribute: string) {
  const copy: Record<string, { de: string; en: string; deBody: string; enBody: string }> = {
    "beste-wahl": {
      de: "Beste Gesamtwahl",
      en: "Best overall",
      deBody: "Nährwerte und Zutaten werden gemeinsam betrachtet, damit kein einzelner Wert die Entscheidung bestimmt.",
      enBody: "Nutrition and ingredients are considered together so one value does not decide the result.",
    },
    "wenig-zucker": {
      de: "Weniger Zucker",
      en: "Less sugar",
      deBody: "Die Reihenfolge folgt dem Zuckerwert und nutzt klare Regeln für fehlende oder gleiche Angaben.",
      enBody: "The order follows sugar content and uses clear rules for missing or equal values.",
    },
    proteinreich: {
      de: "Mehr Protein",
      en: "More protein",
      deBody: "Produkte werden nach dem ausgewiesenen Proteingehalt innerhalb derselben Kategorie geordnet.",
      enBody: "Products are ordered by disclosed protein content within the same category.",
    },
    "gute-zutaten": {
      de: "Verständliche Zutaten",
      en: "Simpler ingredients",
      deBody: "Zutatenlisten werden nach nachvollziehbaren Signalen verglichen, ohne Gesundheitsversprechen abzuleiten.",
      enBody: "Ingredient lists are compared using transparent signals without making health claims.",
    },
    familie: {
      de: "Für Familien",
      en: "For families",
      deBody: "Zucker, Salz, Zutaten und bekannte Allergene werden bewusst konservativ eingeordnet.",
      enBody: "Sugar, sodium, ingredients, and known allergens are assessed conservatively.",
    },
    vegan: {
      de: "Vegan",
      en: "Vegan",
      deBody: "Die vegane Kennzeichnung wird geprüft und bleibt von der Nährwertbewertung getrennt.",
      enBody: "Vegan labeling is checked separately from the nutrition assessment.",
    },
  };
  const item = copy[attribute] ?? copy["beste-wahl"];
  return {
    title: pick(locale, item.de, item.en),
    body: pick(locale, item.deBody, item.enBody),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  return {
    title: pick(locale, `Lebensmittel Rankings | ${BRAND_NAME}`, `Food rankings | ${BRAND_NAME}`),
    description: pick(
      locale,
      "Vergleiche Lebensmittel nach Zucker, Protein, Zutaten und Gesamturteil mit nachvollziehbaren Regeln.",
      "Compare foods by sugar, protein, ingredients, and overall assessment using transparent rules.",
    ),
    alternates: localeAlternates(locale, "/best"),
    robots: { index: false, follow: true },
  };
}

export default async function RankingHub({ params }: Props) {
  const locale = requireLocale((await params).locale);
  const catalog = getCatalog(locale);
  const path = (value = "/") => localizedPath(locale, value);
  const rankings = catalog.rankingPages.flatMap((ranking) => {
    const items = catalog.rankedProducts(ranking.category, ranking.sortScore);
    const category = catalog.getCategory(ranking.category);
    if (!category || items.length < ranking.minProductsRequired) return [];
    return [{ ranking, category, items }];
  });
  const availableCategories = new Set(rankings.map((item) => item.ranking.category)).size;

  const itemListData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: pick(locale, "Lebensmittel Rankings", "Food rankings"),
    inLanguage: locale,
    numberOfItems: rankings.length,
    itemListElement: rankings.map(({ ranking }, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: ranking.title,
      url: absoluteUrl(path(`/best/${rankingRouteSlug(ranking.attribute, locale)}/${categoryRouteSlug(ranking.category, locale)}`)),
    })),
  };

  return <main>
    <StructuredData data={itemListData} />
    <SiteHeader locale={locale} />

    <section className="subpage-hero ranking-hub-hero">
      <p className="eyebrow">{pick(locale, "Nach deiner Frage sortieren", "Start with your question")}</p>
      <h1>{pick(locale, "Lebensmittel Rankings für klare Entscheidungen", "Food rankings for clear decisions")}</h1>
      <p>{pick(
        locale,
        "Wähle zuerst dein Ziel und vergleiche anschließend nur Produkte derselben Kategorie. Jede Platzierung zeigt den entscheidenden Wert und die verwendete Regel.",
        "Choose your goal first, then compare products within the same category. Every position shows the deciding value and the rule used.",
      )}</p>
    </section>

    <section className="ranking-hub-summary" aria-label={pick(locale, "Ranking Übersicht", "Ranking overview")}>
      <div><strong>{rankings.length}</strong><span>{pick(locale, "verfügbare Rankings", "available rankings")}</span></div>
      <div><strong>{availableCategories}</strong><span>{pick(locale, "vergleichbare Kategorien", "comparable categories")}</span></div>
      <div><strong>{new Date(catalog.manifest.generatedAt).toLocaleDateString(locale)}</strong><span>{pick(locale, "letzter Datenstand", "latest data update")}</span></div>
    </section>

    <section className="section ranking-hub-intro">
      <div className="section-heading split-heading">
        <div>
          <p className="eyebrow">{pick(locale, "Ein Ziel pro Ranking", "One goal per ranking")}</p>
          <h2>{pick(locale, "Welche Frage möchtest du beantworten?", "Which question do you want to answer?")}</h2>
        </div>
        <p>{pick(
          locale,
          "Die Reihenfolge ändert sich je nach Ziel. Ein Produkt mit besonders viel Protein muss deshalb nicht gleichzeitig die beste Gesamtwahl sein.",
          "The order changes with the goal. A product with especially high protein is not automatically the best overall choice.",
        )}</p>
      </div>
    </section>

    <div className="ranking-hub-groups">
      {!rankings.length ? <div className="empty-state ranking-hub-empty">
        <h2>{pick(locale, "Rankings werden gerade vorbereitet", "Rankings are being prepared")}</h2>
        <p>{pick(
          locale,
          "Eine Rangliste erscheint, sobald mindestens zwanzig geeignete Produkte derselben Kategorie verfügbar sind.",
          "A ranking appears when at least twenty eligible products from the same category are available.",
        )}</p>
        <Link className="text-link" href={path("/data-quality")}>{pick(locale, "Katalogstatus ansehen", "View catalog status")} <span aria-hidden="true">→</span></Link>
      </div> : null}
      {goalOrder.map((attribute) => {
        const group = rankings.filter((item) => item.ranking.attribute === attribute);
        if (!group.length) return null;
        const copy = goalCopy(locale, attribute);
        return <section className="ranking-hub-group" key={attribute} aria-labelledby={`ranking-goal-${attribute}`}>
          <div className="ranking-hub-group-heading">
            <p className="eyebrow">{pick(locale, "Vergleichsziel", "Comparison goal")}</p>
            <h2 id={`ranking-goal-${attribute}`}>{copy.title}</h2>
            <p>{copy.body}</p>
          </div>
          <div className="ranking-hub-list">
            {group.map(({ ranking, category, items }) => {
              const href = path(`/best/${rankingRouteSlug(ranking.attribute, locale)}/${categoryRouteSlug(ranking.category, locale)}`);
              return <Link href={href} key={`${ranking.attribute}-${ranking.category}`}>
                <span><small>{category.label}</small><strong>{ranking.title}</strong></span>
                <span><b>{items.length}</b><small>{pick(locale, "Produkte", "products")}</small></span>
                <span aria-hidden="true">→</span>
              </Link>;
            })}
          </div>
        </section>;
      })}
    </div>

    <section className="section section-soft ranking-hub-method">
      <div>
        <p className="eyebrow">{pick(locale, "Transparente Reihenfolge", "Transparent ordering")}</p>
        <h2>{pick(locale, "So kannst du ein Ranking richtig einordnen", "How to interpret a ranking")}</h2>
        <p>{pick(
          locale,
          "Alle Produkte nutzen dieselbe Bezugsbasis und dieselben Regeln. Fehlende Werte werden nicht als Null behandelt. Bezahlte Platzierungen verändern die Reihenfolge nicht.",
          "All products use the same reference basis and rules. Missing values are never treated as zero. Paid placements never change the order.",
        )}</p>
      </div>
      <nav aria-label={pick(locale, "Weitere Entscheidungshilfen", "More decision tools")}>
        <Link href={path("/methodology")}>{pick(locale, "Methodik verstehen", "Understand the methodology")}<span aria-hidden="true">→</span></Link>
        <Link href={path("/finder")}>{pick(locale, "Mit eigenen Filtern suchen", "Search with your own filters")}<span aria-hidden="true">→</span></Link>
      </nav>
    </section>
  </main>;
}
