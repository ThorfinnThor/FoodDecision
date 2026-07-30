import type { Product } from "@/lib/types";

export function DataQualityNotice({ product }: { product: Product }) {
  const hasFlags = product.qualityFlags.length > 0;

  return (
    <section className="notice">
      <div>
        <p className="eyebrow">Datenqualitaet</p>
        <h2>{hasFlags ? "Mit Einschraenkungen verwenden" : "Gut fuer MVP-Auswertung geeignet"}</h2>
      </div>
      <p>
        Status: <strong>{product.publishability}</strong>. Quelle: {product.source}, importiert am{" "}
        {product.importedAt}. Nutzer sollten Produktetikett und Allergene vor dem Kauf pruefen.
      </p>
      {hasFlags ? (
        <ul className="inline-list">
          {product.qualityFlags.map((flag) => (
            <li key={flag}>{flag}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
