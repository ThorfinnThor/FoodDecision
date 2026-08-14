"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { localizedPath, pick } from "@/lib/i18n";
import type { SiteLocale } from "@/lib/types";
import { LocaleSwitcher } from "./LocaleSwitcher";

export function MobileMenu({ locale }: { locale: SiteLocale }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const path = (value = "/") => localizedPath(locale, value);
  const close = () => setOpen(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(false), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      window.setTimeout(() => triggerRef.current?.focus(), 0);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div className="mobile-menu">
      <button aria-controls="mobile-navigation" aria-expanded={open} onClick={() => setOpen((current) => !current)} ref={triggerRef} type="button">
        {pick(locale, "Menü", "Menu")}
      </button>
      {open ? <nav aria-label={pick(locale, "Mobile Navigation", "Mobile navigation")} id="mobile-navigation">
        <LocaleSwitcher locale={locale} />
        <Link href={path("/products")} onClick={close}>{pick(locale, "Produkte", "Products")}</Link>
        <Link href={`${path()}#categories`} onClick={close}>{pick(locale, "Kategorien", "Categories")}</Link>
        <Link href={path("/best")} onClick={close}>{pick(locale, "Rankings", "Rankings")}</Link>
        <Link href={path("/brands")} onClick={close}>{pick(locale, "Marken", "Brands")}</Link>
        <Link href={path("/ingredients")} onClick={close}>{pick(locale, "Zutaten", "Ingredients")}</Link>
        <Link href={path("/nutrition")} onClick={close}>{pick(locale, "Nährwerte", "Nutrition")}</Link>
        <Link href={path("/compare")} onClick={close}>{pick(locale, "Vergleiche", "Compare")}</Link>
        <Link href={path("/favorites")} onClick={close}>{pick(locale, "Favoriten", "Favorites")}</Link>
        <Link href={path("/shopping-list")} onClick={close}>{pick(locale, "Einkaufsliste", "Shopping list")}</Link>
        <Link href={path("/scan")} onClick={close}>{pick(locale, "Barcode prüfen", "Check barcode")}</Link>
        <Link href={path("/preferences")} onClick={close}>{pick(locale, "Präferenzen", "Preferences")}</Link>
        <Link href={path("/methodology")} onClick={close}>{pick(locale, "So funktioniert's", "Methodology")}</Link>
        <Link href={path("/finder")} onClick={close}>{pick(locale, "Finder öffnen", "Open finder")}</Link>
      </nav> : null}
    </div>
  );
}
