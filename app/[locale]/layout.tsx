import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { localeConfigs, localeFromSegment, pick, supportedLocales } from "@/lib/i18n";
import { siteUrl } from "@/lib/seo";
import { BRAND_NAME } from "@/lib/brand";
import { ConsentAwareAnalytics } from "@/components/ConsentAwareAnalytics";
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
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
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
  return (
    <html data-scroll-behavior="smooth" lang={localeConfigs[locale].htmlLang}>
      <body>{children}<SiteFooter locale={locale} /><ConsentAwareAnalytics /></body>
    </html>
  );
}
