import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { categoryImages } from "@/lib/category-images";
import { localizedPath, pick } from "@/lib/i18n";
import { localeAlternates, requireLocale } from "@/lib/locale-page";
import { getCatalog } from "@/lib/static-data";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  return {
    title: pick(locale, "Bildnachweise - Food Decision Engine", "Photo credits - Food Decision Engine"),
    description: pick(locale, "Quellen, Urheber und offene Lizenzen der Kategoriebilder.", "Sources, creators, and open licenses for category photos."),
    alternates: localeAlternates(locale, "/image-credits"),
    robots: { index: false, follow: true },
  };
}

export default async function ImageCreditsPage({ params }: Props) {
  const locale = requireLocale((await params).locale);
  const catalog = getCatalog(locale);
  const path = (value = "/") => localizedPath(locale, value);
  const categories = catalog.getCategories();

  return <main>
    <SiteHeader locale={locale} />
    <nav className="breadcrumb" aria-label="Breadcrumb"><Link href={path()}>{pick(locale, "Start", "Home")}</Link><span aria-hidden="true">/</span><span aria-current="page">{pick(locale, "Bildnachweise", "Photo credits")}</span></nav>
    <section className="subpage-hero compact-subpage-hero"><p className="eyebrow">{pick(locale, "Offene Bildlizenzen", "Open image licenses")}</p><h1>{pick(locale, "Bildnachweise", "Photo credits")}</h1><p>{pick(locale, "Alle Kategoriebilder stammen aus Wikimedia Commons und dürfen unter den jeweils genannten Bedingungen kommerziell verwendet werden.", "All category photos come from Wikimedia Commons and permit commercial use under the listed terms.")}</p></section>
    <section className="section image-credits-section">
      <div className="image-credit-grid">{categories.map((category) => {
        const image = categoryImages[category.slug];
        return <article className="image-credit-item" key={category.slug}>
          <div className="image-credit-preview"><Image alt={image.alt[locale]} fill sizes="(max-width: 600px) 100vw, (max-width: 1080px) 50vw, 33vw" src={image.src} style={{ objectPosition: image.objectPosition }} /></div>
          <div className="image-credit-copy"><h2>{category.label}</h2><dl><div><dt>{pick(locale, "Urheber", "Creator")}</dt><dd>{image.creator}</dd></div><div><dt>{pick(locale, "Lizenz", "License")}</dt><dd><a href={image.licenseUrl} rel="license noreferrer" target="_blank">{image.license}</a></dd></div><div><dt>{pick(locale, "Quelle", "Source")}</dt><dd><a href={image.sourceUrl} rel="noreferrer" target="_blank">Wikimedia Commons</a></dd></div></dl></div>
        </article>;
      })}</div>
      <p className="image-credit-note">{pick(locale, "Die Dateien wurden von Wikimedia Commons auf Webgröße skaliert und werden in der Oberfläche nur per CSS zugeschnitten. Produktbilder werden separat direkt aus Open Food Facts eingebunden und auf der jeweiligen Produktseite gekennzeichnet.", "Files were resized to web dimensions by Wikimedia Commons and are only cropped visually with CSS. Product images are sourced separately from Open Food Facts and credited on each product page.")}</p>
    </section>
  </main>;
}
