"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { localizedPath } from "@/lib/i18n";
import type { SiteLocale } from "@/lib/types";

type BarcodeProduct = { gtin: string; name: string; slug: string };
type BarcodeDetectorLike = { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> };

export function BarcodeLookup({ locale, products }: { locale: SiteLocale; products: BarcodeProduct[] }) {
  const en = locale === "en-US";
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");
  const [scanning, setScanning] = useState(false);

  function lookup(value = code) {
    const normalized = value.replace(/\D/g, "");
    const product = products.find((item) => item.gtin === normalized);
    if (product) router.push(localizedPath(locale, `/product/${product.slug}`));
    else setStatus(normalized ? (en ? "This barcode is not in the current catalog yet." : "Dieser Barcode ist im aktuellen Katalog noch nicht enthalten.") : (en ? "Enter a barcode." : "Bitte gib einen Barcode ein."));
  }

  function stop() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScanning(false);
  }

  async function start() {
    const Detector = (window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike }).BarcodeDetector;
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setStatus(en ? "Camera scanning is not supported in this browser. Use manual entry." : "Kamera-Scanning wird in diesem Browser nicht unterstützt. Nutze die manuelle Eingabe.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setScanning(true);
      setStatus(en ? "Hold the barcode steady in the camera area." : "Halte den Barcode ruhig in den Kamerabereich.");
      const detector = new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
      const detect = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const found = await detector.detect(videoRef.current);
          if (found[0]?.rawValue) {
            const value = found[0].rawValue;
            setCode(value);
            stop();
            lookup(value);
            return;
          }
        } catch {
          setStatus(en ? "The barcode could not be read. Try more light or manual entry." : "Der Barcode konnte noch nicht gelesen werden. Versuche mehr Licht oder die manuelle Eingabe.");
        }
        window.requestAnimationFrame(detect);
      };
      window.requestAnimationFrame(detect);
    } catch {
      setStatus(en ? "The camera could not be opened. Check browser permission or use manual entry." : "Die Kamera konnte nicht geöffnet werden. Prüfe die Browserfreigabe oder nutze die manuelle Eingabe.");
      stop();
    }
  }

  return (
    <section className="barcode-tool">
      <div className={scanning ? "barcode-camera is-active" : "barcode-camera"}><video aria-label={en ? "Camera view for barcode scan" : "Kamerabild für Barcode-Scan"} muted playsInline ref={videoRef} /><span aria-hidden="true" /></div>
      <div className="barcode-controls"><button className="primary-button" onClick={scanning ? stop : start} type="button">{scanning ? (en ? "Stop camera" : "Kamera stoppen") : (en ? "Scan barcode with camera" : "Barcode mit Kamera scannen")}</button><div className="manual-barcode"><label htmlFor="barcode-code">{en ? "Or enter the number" : "Oder Nummer eingeben"}</label><div><input id="barcode-code" inputMode="numeric" onChange={(event) => setCode(event.target.value)} placeholder={en ? "e.g. 4001234567890" : "z. B. 4001234567890"} value={code} /><button onClick={() => lookup()} type="button">{en ? "Search" : "Suchen"}</button></div></div>{status ? <p aria-live="polite">{status}</p> : null}</div>
    </section>
  );
}
