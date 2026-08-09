"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { localizedPath, pick } from "@/lib/i18n";
import type { SiteLocale } from "@/lib/types";

export default function NotFoundPage() {
  const pathname = usePathname();
  const locale: SiteLocale = pathname.startsWith("/en-us") ? "en-US" : "de-DE";
  const path = (value = "/") => localizedPath(locale, value);

  return <main>
    <SiteHeader locale={locale} />
    <section className="subpage-hero compact-subpage-hero">
      <p className="eyebrow">404</p>
      <h1>{pick(locale, "Diese Seite wurde nicht gefunden", "This page could not be found")}</h1>
      <p>{pick(locale, "Der Link ist möglicherweise veraltet oder der Inhalt ist in diesem Markt nicht verfügbar.", "The link may be outdated or the content may not be available in this market.")}</p>
      <div className="hero-actions">
        <Link className="primary-link" href={path("/products")}>{pick(locale, "Produkte durchsuchen", "Browse products")}</Link>
        <Link className="text-link" href={path()}>{pick(locale, "Zur Startseite", "Go to home")}</Link>
      </div>
    </section>
  </main>;
}
