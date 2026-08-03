"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type BarcodeProduct = { gtin: string; name: string; slug: string };
type BarcodeDetectorLike = { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> };

export function BarcodeLookup({ products }: { products: BarcodeProduct[] }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");
  const [scanning, setScanning] = useState(false);

  function lookup(value = code) {
    const normalized = value.replace(/\D/g, "");
    const product = products.find((item) => item.gtin === normalized);
    if (product) router.push(`/product/${product.slug}`);
    else setStatus(normalized ? "Dieser Barcode ist im aktuellen Katalog noch nicht enthalten." : "Bitte gib einen Barcode ein.");
  }

  function stop() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScanning(false);
  }

  async function start() {
    const Detector = (window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike }).BarcodeDetector;
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setStatus("Kamera-Scanning wird in diesem Browser nicht unterstützt. Nutze die manuelle Eingabe.");
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
      setStatus("Halte den Barcode ruhig in den Kamerabereich.");
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
          setStatus("Der Barcode konnte noch nicht gelesen werden. Versuche mehr Licht oder die manuelle Eingabe.");
        }
        window.requestAnimationFrame(detect);
      };
      window.requestAnimationFrame(detect);
    } catch {
      setStatus("Die Kamera konnte nicht geöffnet werden. Prüfe die Browserfreigabe oder nutze die manuelle Eingabe.");
      stop();
    }
  }

  return (
    <section className="barcode-tool">
      <div className={scanning ? "barcode-camera is-active" : "barcode-camera"}><video aria-label="Kamerabild für Barcode-Scan" muted playsInline ref={videoRef} /><span aria-hidden="true" /></div>
      <div className="barcode-controls"><button className="primary-button" onClick={scanning ? stop : start} type="button">{scanning ? "Kamera stoppen" : "Barcode mit Kamera scannen"}</button><div className="manual-barcode"><label htmlFor="barcode-code">Oder Nummer eingeben</label><div><input id="barcode-code" inputMode="numeric" onChange={(event) => setCode(event.target.value)} placeholder="z. B. 4001234567890" value={code} /><button onClick={() => lookup()} type="button">Suchen</button></div></div>{status ? <p aria-live="polite">{status}</p> : null}</div>
    </section>
  );
}
