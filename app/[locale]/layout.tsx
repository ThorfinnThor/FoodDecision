import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { StructuredData } from "@/components/StructuredData";
import { localeConfigs, localeFromSegment, localizedPath, pick, supportedLocales } from "@/lib/i18n";
import { absoluteUrl, siteUrl } from "@/lib/seo";
import { BRAND_NAME } from "@/lib/brand";
import { ConsentAwareAnalytics } from "@/components/ConsentAwareAnalytics";
import { StoragePersistenceNotice } from "@/components/StoragePersistenceNotice";
import "../globals.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: segment } = await params;
  const locale = localeFromSegment(segment) ?? "de-DE";
  const description = pick(
    locale,
    "Erklärbare Produktvergleiche, Rankings und Scores für bessere Einkaufsentscheidungen.",
    "Explainable food comparisons, rankings, and scores for better everyday choices.",
  );
  return {
    metadataBase: new URL(siteUrl),
    title: BRAND_NAME,
    description,
    icons: {
      icon: [{ url: "/favicon.png", sizes: "64x64", type: "image/png" }],
      shortcut: "/favicon.png",
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    openGraph: {
      title: BRAND_NAME,
      description,
      type: "website",
      locale: locale === "de-DE" ? "de_DE" : "en_US",
      siteName: BRAND_NAME,
    },
  };
}

export function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale: localeConfigs[locale].urlSegment }));
}

export default async function RootLayout({ children, params }: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale: segment } = await params;
  const locale = localeFromSegment(segment);
  if (!locale) notFound();
  const websiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND_NAME,
    url: siteUrl,
    description: pick(
      locale,
      "Erklärbare Lebensmittelvergleiche und kategoriespezifische Rankings.",
      "Explainable food comparisons and category-specific rankings.",
    ),
    inLanguage: locale,
    publisher: {
      "@type": "Organization",
      name: BRAND_NAME,
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/brand-icon.webp"),
      },
      publishingPrinciples: absoluteUrl(localizedPath(locale, "/editorial-policy")),
    },
  };
  return (
    <html data-scroll-behavior="smooth" lang={localeConfigs[locale].htmlLang}>
      <body><StructuredData data={websiteData} />{children}<StoragePersistenceNotice locale={locale} /><SiteFooter locale={locale} /><ConsentAwareAnalytics /></body>
    </html>
  );
}
