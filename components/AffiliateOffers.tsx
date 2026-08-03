"use client";

import { trackEvent } from "@/lib/client-state";
import type { AffiliateOffer } from "@/lib/types";

export function AffiliateOffers({ offers, productSlug }: { offers: AffiliateOffer[]; productSlug: string }) {
  if (!offers.length) return null;
  return (
    <section className="detail-section offers-section">
      <div className="section-heading"><p className="eyebrow">Verfügbarkeit</p><h2>Angebote ansehen</h2><p>Shop-Links verändern unsere Bewertung nicht. Bei einem Kauf können wir eine Provision erhalten.</p></div>
      <div className="offer-list">
        {offers.map((offer) => <a href={offer.url} key={offer.id} onClick={() => trackEvent("affiliate_clicked", { entityType: "product", entityId: productSlug, metadata: { offerId: offer.id, merchant: offer.merchant } })} rel="nofollow sponsored noopener" target="_blank"><span><strong>{offer.merchant}</strong>{offer.sponsored ? <small>Anzeige / Affiliate-Link</small> : <small>Händlerangebot</small>}</span><span>{offer.priceHint ?? "Preis im Shop"}</span><span aria-hidden="true">↗</span></a>)}
      </div>
    </section>
  );
}
