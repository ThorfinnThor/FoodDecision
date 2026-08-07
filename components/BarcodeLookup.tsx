"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { barcodeCheckDigitIsValid, barcodeFormatLabel, findBarcodeItem, normalizeBarcode } from "@/lib/barcode";
import { localizedPath, pick } from "@/lib/i18n";
import { SCAN_HISTORY_KEY } from "@/lib/storage-keys";
import type { ScoreConfidence, ScoreGrade, SiteLocale } from "@/lib/types";
import { FavoriteButton } from "./FavoriteButton";
import { ShoppingListButton } from "./ShoppingListButton";

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

type BarcodeDetectorLike = { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> };
type LookupResult = { type: "idle" } | { type: "match"; product: BarcodeProduct; code: string } | { type: "missing"; code: string; reason: "format" | "checksum" | "unknown" };
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
    const value = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is HistoryEntry => Boolean(
      item && typeof item === "object" && typeof item.code === "string" && typeof item.label === "string" && (typeof item.slug === "string" || item.slug === null),
    )).slice(0, 6);
  } catch {
    return [];
  }
}

export function BarcodeLookup({ locale, products }: { locale: SiteLocale; products: BarcodeProduct[] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRequestRef = useRef(0);
  const startingRef = useRef(false);
  const [code, setCode] = useState("");
  const [cameraStatus, setCameraStatus] = useState("");
  const [starting, setStarting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<LookupResult>({ type: "idle" });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const historyKey = `${SCAN_HISTORY_KEY}:${locale}`;
  const path = (value: string) => localizedPath(locale, value);
  const c = (de: string, en: string) => pick(locale, de, en);

  const stop = useCallback(() => {
    cameraRequestRef.current += 1;
    startingRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStarting(false);
    setScanning(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setHistory(readHistory(historyKey)), 0);
    const stopWhenHidden = () => {
      if (document.visibilityState !== "visible") stop();
    };
    window.addEventListener("pagehide", stop);
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", stop);
      document.removeEventListener("visibilitychange", stopWhenHidden);
      cameraRequestRef.current += 1;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [historyKey, stop]);

  function remember(entry: HistoryEntry) {
    setHistory((current) => {
      const next = [entry, ...current.filter((item) => item.code !== entry.code)].slice(0, 6);
      window.localStorage.setItem(historyKey, JSON.stringify(next));
      return next;
    });
  }

  function lookup(value = code) {
    const normalized = normalizeBarcode(value);
    setCode(normalized);
    setCameraStatus("");
    if (!normalized) {
      setResult({ type: "missing", code: "", reason: "format" });
      return;
    }

    const product = findBarcodeItem(products, normalized);
    if (product) {
      setResult({ type: "match", product, code: normalized });
      remember({ code: normalized, label: product.name, slug: product.slug });
      return;
    }

    const format = barcodeFormatLabel(normalized);
    const reason = !format ? "format" : barcodeCheckDigitIsValid(normalized) ? "unknown" : "checksum";
    setResult({ type: "missing", code: normalized, reason });
    remember({ code: normalized, label: reason === "unknown" ? c("Nicht im Katalog", "Not in catalog") : c("Ungültige Nummer", "Invalid number"), slug: null });
  }

  async function start() {
    if (startingRef.current || streamRef.current) return;
    const Detector = (window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike }).BarcodeDetector;
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setCameraStatus(c("Kamera-Scanning wird in diesem Browser nicht unterstützt. Nutze die manuelle Eingabe.", "Camera scanning is not supported in this browser. Use manual entry."));
      return;
    }
    const requestId = cameraRequestRef.current + 1;
    cameraRequestRef.current = requestId;
    startingRef.current = true;
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      if (requestId !== cameraRequestRef.current || document.visibilityState !== "visible") {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stop();
        return;
      }
      video.srcObject = stream;
      await video.play();
      if (requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      setScanning(true);
      setResult({ type: "idle" });
      setCameraStatus(c("Halte den Barcode ruhig in den markierten Bereich.", "Hold the barcode steady inside the marked area."));
      const detector = new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
      const detect = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const found = await detector.detect(videoRef.current);
          if (found[0]?.rawValue) {
            const value = found[0].rawValue;
            stop();
            lookup(value);
            return;
          }
        } catch {
          setCameraStatus(c("Noch nicht lesbar. Versuche mehr Licht oder die manuelle Eingabe.", "Not readable yet. Try more light or manual entry."));
        }
        window.requestAnimationFrame(detect);
      };
      window.requestAnimationFrame(detect);
    } catch {
      if (requestId === cameraRequestRef.current) {
        setCameraStatus(c("Die Kamera konnte nicht geöffnet werden. Prüfe die Browserfreigabe oder nutze die manuelle Eingabe.", "The camera could not be opened. Check browser permission or use manual entry."));
        stop();
      }
    } finally {
      if (requestId === cameraRequestRef.current) {
        startingRef.current = false;
        setStarting(false);
      }
    }
  }

  function reset() {
    stop();
    setCode("");
    setCameraStatus("");
    setResult({ type: "idle" });
  }

  function clearHistory() {
    window.localStorage.removeItem(historyKey);
    setHistory([]);
  }

  return (
    <div className="barcode-experience">
      <section className="barcode-tool" aria-label={c("Barcode-Suche", "Barcode lookup")}>
        <div className={scanning ? "barcode-camera is-active" : "barcode-camera"}>
          <video aria-label={c("Kamerabild für Barcode-Scan", "Camera view for barcode scan")} muted playsInline ref={videoRef} />
          <span aria-hidden="true" />
          {!scanning ? <div className="barcode-camera-placeholder"><strong>{c("Barcode in den Rahmen halten", "Hold barcode inside the frame")}</strong><small>{c("Die Verarbeitung erfolgt nur auf deinem Gerät.", "Processing stays on your device.")}</small></div> : null}
        </div>
        <div className="barcode-controls">
          <div>
            <p className="eyebrow">{c("Kamera oder Nummer", "Camera or number")}</p>
            <h2>{c("Produkt sofort prüfen", "Check a product instantly")}</h2>
            <p>{c("EAN-8, EAN-13, UPC-A und GTIN-14 werden unterstützt.", "EAN-8, EAN-13, UPC-A, and GTIN-14 are supported.")}</p>
          </div>
          <button className="primary-button" disabled={starting} onClick={scanning ? stop : start} type="button">{scanning ? c("Kamera stoppen", "Stop camera") : starting ? c("Kamera wird geöffnet …", "Opening camera …") : c("Barcode mit Kamera scannen", "Scan barcode with camera")}</button>
          <p className="scanner-privacy-note">{c("Kamerabild und Barcodenummer verlassen dein Gerät nicht.", "Camera images and barcode numbers never leave your device.")} <Link href={`${path("/privacy")}#camera`}>{c("Datenschutzdetails", "Privacy details")}</Link></p>
          <form className="manual-barcode" onSubmit={(event) => { event.preventDefault(); lookup(); }}>
            <label htmlFor="barcode-code">{c("Oder Nummer eingeben", "Or enter the number")}</label>
            <div><input autoComplete="off" id="barcode-code" inputMode="numeric" onChange={(event) => setCode(event.target.value)} placeholder={products[0]?.gtin ?? "4001234567890"} value={code} /><button type="submit">{c("Prüfen", "Check")}</button></div>
          </form>
          {cameraStatus ? <p className="barcode-status" aria-live="polite">{cameraStatus}</p> : null}
        </div>
      </section>

      {result.type === "match" ? (
        <section className="scanner-result is-match" aria-live="polite">
          <div className={`scanner-product-visual tone-${result.product.imageTone}`}>
            {result.product.imageUrl ? <Image alt={`${result.product.name} ${c("von", "by")} ${result.product.brand}`} fill sizes="(max-width: 700px) 100vw, 300px" src={result.product.imageUrl} unoptimized /> : <div className="packshot"><span>{result.product.brand}</span><strong>{result.product.name}</strong><small>{result.product.categoryLabel}</small></div>}
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
            <h2>{result.reason === "format" ? c("Barcode ist zu kurz oder zu lang", "Barcode has the wrong length") : result.reason === "checksum" ? c("Prüfziffer stimmt nicht", "Check digit does not match") : c("Produkt noch nicht gefunden", "Product not found yet")}</h2>
            <p>{result.reason === "unknown"
              ? c("Der Barcode ist formal gültig, gehört aber noch nicht zu unserem geprüften Katalog. Du kannst das Produkt stattdessen über Name oder Kategorie suchen.", "The barcode is valid but is not yet in our reviewed catalog. Search by product name or category instead.")
              : c("Vergleiche die eingegebene Nummer noch einmal mit der Verpackung. Übliche Barcodes haben 8, 12, 13 oder 14 Ziffern.", "Check the entered number against the package. Standard barcodes contain 8, 12, 13, or 14 digits.")}</p>
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
