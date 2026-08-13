"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { barcodeCheckDigitIsValid, barcodeFormatLabel, barcodeValidationReason, findBarcodeItem, normalizeBarcode, type BarcodeValidationReason } from "@/lib/barcode";
import { localizedPath, pick } from "@/lib/i18n";
import { SCAN_HISTORY_KEY } from "@/lib/storage-keys";
import type { ScoreConfidence, ScoreGrade, SiteLocale } from "@/lib/types";
import { FavoriteButton } from "./FavoriteButton";
import { ShoppingListButton } from "./ShoppingListButton";
import { readBrowserJson, removeBrowserValue, writeBrowserJson } from "@/lib/browser-storage";

export type BarcodeProduct = {
  gtin: string;
  name: string;
  slug: string;
  brand: string;
  categoryLabel: string;
  imageTone: string;
  imageUrl: string | null;
  imageLicense: "CC BY-SA" | null;
  imageSourceUrl: string | null;
  overallScore: number | null;
  overallGrade: ScoreGrade;
  confidence: ScoreConfidence | null;
  positive: string | null;
  warning: string | null;
  sugar: number | null;
  protein: number | null;
  basis: "100g" | "100ml";
};

type LookupResult = { type: "idle" } | { type: "match"; product: BarcodeProduct; code: string } | { type: "missing"; code: string; reason: BarcodeValidationReason | "unknown" };
type HistoryEntry = { code: string; label: string; slug: string | null };

function scoreLabel(grade: ScoreGrade, locale: SiteLocale) {
  const labels: Record<ScoreGrade, [string, string]> = {
    excellent: ["Sehr stark", "Excellent"],
    good: ["Gut", "Good"],
    okay: ["Solide", "Fair"],
    weak: ["Schwach", "Weak"],
    unknown: ["Noch offen", "Not rated"],
  };
  return labels[grade][locale === "de-DE" ? 0 : 1];
}

function confidenceLabel(confidence: ScoreConfidence | null, locale: SiteLocale) {
  if (!confidence) return "";
  const labels: Record<ScoreConfidence, [string, string]> = {
    high: ["hohe Sicherheit", "high confidence"],
    medium: ["mittlere Sicherheit", "medium confidence"],
    low: ["niedrige Sicherheit", "low confidence"],
  };
  return labels[confidence][locale === "de-DE" ? 0 : 1];
}

function readHistory(key: string) {
  try {
    const value = readBrowserJson<unknown>("local", key, []);
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is HistoryEntry => Boolean(
      item && typeof item === "object" && typeof item.code === "string" && typeof item.label === "string" && (typeof item.slug === "string" || item.slug === null),
    )).filter((item) => {
      const normalized = normalizeBarcode(item.code);
      return Boolean(barcodeFormatLabel(normalized) && barcodeCheckDigitIsValid(normalized));
    }).slice(0, 6);
  } catch {
    return [];
  }
}

export function BarcodeLookup({ locale, products }: { locale: SiteLocale; products: BarcodeProduct[] }) {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<LookupResult>({ type: "idle" });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const [loadedImageUrl, setLoadedImageUrl] = useState<string | null>(null);
  const historyKey = `${SCAN_HISTORY_KEY}:${locale}`;
  const path = (value: string) => localizedPath(locale, value);
  const c = (de: string, en: string) => pick(locale, de, en);

  useEffect(() => {
    const timer = window.setTimeout(() => setHistory(readHistory(historyKey)), 0);
    return () => window.clearTimeout(timer);
  }, [historyKey]);

  function remember(entry: HistoryEntry) {
    setHistory((current) => {
      const next = [entry, ...current.filter((item) => item.code !== entry.code)].slice(0, 6);
      writeBrowserJson("local", historyKey, next);
      return next;
    });
  }

  function lookup(value = code) {
    const validationReason = barcodeValidationReason(value);
    const normalized = normalizeBarcode(value);
    if (validationReason) {
      setResult({ type: "missing", code: value.trim().slice(0, 32), reason: validationReason });
      return;
    }
    setCode(normalized);

    const product = findBarcodeItem(products, normalized);
    if (product) {
      setResult({ type: "match", product, code: normalized });
      remember({ code: normalized, label: product.name, slug: product.slug });
      return;
    }

    const reason: BarcodeValidationReason | "unknown" = "unknown";
    setResult({ type: "missing", code: normalized, reason });
    if (reason === "unknown") remember({ code: normalized, label: c("Nicht im Katalog", "Not in catalog"), slug: null });
  }

  function reset() {
    setCode("");
    setResult({ type: "idle" });
  }

  function clearHistory() {
    removeBrowserValue("local", historyKey);
    setHistory([]);
  }

  return (
    <div className="barcode-experience">
      <section className="barcode-tool" aria-label={c("Barcodesuche", "Barcode lookup")}>
        <div className="barcode-controls">
          <div>
            <p className="eyebrow">{c("Nummer eingeben", "Enter the number")}</p>
            <h2>{c("Produkt sofort prüfen", "Check a product instantly")}</h2>
            <p>{c("Gib die Nummer von der Verpackung ein. Unterstützt werden EAN 8, EAN 13, UPC A und GTIN 14. Die Nummer bleibt in deinem Browser.", "Enter the number from the package. EAN 8, EAN 13, UPC A, and GTIN 14 are supported. The number stays in your browser.")}</p>
          </div>
          <form className="manual-barcode" onSubmit={(event) => { event.preventDefault(); lookup(); }}>
            <label htmlFor="barcode-code">{c("Barcode oder GTIN", "Barcode or GTIN")}</label>
            <div><input autoComplete="off" id="barcode-code" inputMode="numeric" onChange={(event) => setCode(event.target.value)} placeholder={products[0]?.gtin ?? "4001234567890"} value={code} /><button type="submit">{c("Prüfen", "Check")}</button></div>
          </form>
        </div>
      </section>

      {result.type === "match" ? (
        <section className="scanner-result is-match" aria-live="polite">
          <div className={`scanner-product-visual tone-${result.product.imageTone}`}>
            {result.product.imageUrl && failedImageUrl !== result.product.imageUrl ? <>
              <div aria-hidden={loadedImageUrl === result.product.imageUrl} className={`scanner-image-placeholder ${loadedImageUrl === result.product.imageUrl ? "is-hidden" : ""}`}><div className="packshot"><span>{result.product.brand}</span><strong>{result.product.name}</strong><small>{result.product.categoryLabel}</small></div></div>
              <Image alt={`${result.product.name} ${c("von", "by")} ${result.product.brand}`} className={loadedImageUrl === result.product.imageUrl ? "is-loaded" : ""} fill onError={() => setFailedImageUrl(result.product.imageUrl)} onLoad={() => setLoadedImageUrl(result.product.imageUrl)} sizes="(max-width: 700px) calc(100vw - 28px), 300px" src={result.product.imageUrl} />
            </> : <div className="packshot"><span>{result.product.brand}</span><strong>{result.product.name}</strong><small>{result.product.categoryLabel}</small></div>}
          </div>
          <div className="scanner-result-copy">
            <p className="eyebrow">{c("Im Katalog gefunden", "Found in the catalog")}</p>
            <h2>{result.product.name}</h2>
            <p className="product-meta">{result.product.brand} · {result.product.categoryLabel} · {barcodeFormatLabel(result.code) ?? "GTIN"} {result.code}</p>
            <div className="scanner-score-row">
              <span><small>{c("Gesamturteil", "Overall")}</small><strong>{result.product.overallScore !== null ? `${result.product.overallScore}/100` : "-"}</strong><em>{scoreLabel(result.product.overallGrade, locale)}{result.product.confidence ? ` · ${confidenceLabel(result.product.confidence, locale)}` : ""}</em></span>
              <span><small>{c("Zucker", "Sugar")}</small><strong>{result.product.sugar !== null ? `${result.product.sugar} g` : "-"}</strong><em>{c("pro", "per")} {result.product.basis}</em></span>
              <span><small>{c("Protein", "Protein")}</small><strong>{result.product.protein !== null ? `${result.product.protein} g` : "-"}</strong><em>{c("pro", "per")} {result.product.basis}</em></span>
            </div>
            {result.product.positive ? <p className="scanner-positive">{result.product.positive}</p> : null}
            {result.product.warning ? <p className="scanner-warning"><strong>{c("Prüfen:", "Check:")}</strong> {result.product.warning}</p> : null}
            <div className="scanner-result-actions">
              <Link className="button-link" href={path(`/product/${result.product.slug}`)}>{c("Vollständige Entscheidung", "View full decision")}</Link>
              <FavoriteButton locale={locale} productName={result.product.name} productSlug={result.product.slug} />
              <ShoppingListButton locale={locale} productName={result.product.name} productSlug={result.product.slug} />
              <button className="secondary-command" onClick={reset} type="button">{c("Weiteres Produkt", "Scan another")}</button>
            </div>
            {result.product.imageUrl && result.product.imageSourceUrl ? <a className="image-credit" href={result.product.imageSourceUrl} rel="license noreferrer" target="_blank">{c("Produktbild", "Product image")}: Open Food Facts, {result.product.imageLicense}</a> : null}
          </div>
        </section>
      ) : null}

      {result.type === "missing" ? (
        <section className="scanner-result is-missing" aria-live="polite">
          <div>
            <p className="eyebrow">{result.reason === "unknown" ? c("Noch nicht im Katalog", "Not in the catalog yet") : c("Nummer prüfen", "Check the number")}</p>
            <h2>{result.reason === "characters" ? c("Nur Ziffern verwenden", "Use digits only") : result.reason === "length" ? c("Barcode ist zu kurz oder zu lang", "Barcode has the wrong length") : result.reason === "checksum" ? c("Prüfziffer stimmt nicht", "Check digit does not match") : c("Produkt noch nicht gefunden", "Product not found yet")}</h2>
            <p>{result.reason === "unknown"
              ? c("Der Barcode ist formal gültig, gehört aber noch nicht zu unserem geprüften Katalog. Du kannst das Produkt stattdessen über Name oder Kategorie suchen.", "The barcode is valid but is not yet in our reviewed catalog. Search by product name or category instead.")
              : result.reason === "characters"
                ? c("Ein Barcode besteht nur aus Ziffern. Entferne Buchstaben und andere Zeichen.", "A barcode contains digits only. Remove letters and other characters.")
                : result.reason === "length"
                  ? c("Vergleiche die eingegebene Nummer noch einmal mit der Verpackung. Übliche Barcodes haben 8, 12, 13 oder 14 Ziffern.", "Check the entered number against the package. Standard barcodes contain 8, 12, 13, or 14 digits.")
                  : c("Vergleiche die Nummer mit der Verpackung. Die Prüfziffer passt nicht zu den übrigen Ziffern.", "Check the number against the package. The check digit does not match the other digits.")}</p>
            {result.code ? <code>{result.code}</code> : null}
          </div>
          <div className="scanner-missing-actions">
            <Link className="button-link" href={path("/products")}>{c("Im Produktkatalog suchen", "Search product catalog")}</Link>
            <button className="secondary-command" onClick={reset} type="button">{c("Nummer neu eingeben", "Enter another number")}</button>
          </div>
        </section>
      ) : null}

      {history.length ? (
        <section className="scan-history">
          <div className="scan-history-heading"><div><p className="eyebrow">{c("Auf diesem Gerät", "On this device")}</p><h2>{c("Letzte Scans", "Recent scans")}</h2></div><button className="quiet-link" onClick={clearHistory} type="button">{c("Verlauf löschen", "Clear history")}</button></div>
          <div className="scan-history-list">{history.map((item) => item.slug ? <Link href={path(`/product/${item.slug}`)} key={item.code}><span>{item.label}</span><small>{item.code}</small><b aria-hidden="true">→</b></Link> : <button key={item.code} onClick={() => lookup(item.code)} type="button"><span>{item.label}</span><small>{item.code}</small><b aria-hidden="true">↻</b></button>)}</div>
        </section>
      ) : null}
    </div>
  );
}
