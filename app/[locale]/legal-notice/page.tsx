import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { BRAND_NAME } from "@/lib/brand";
import { localizedPath, pick } from "@/lib/i18n";
import { getLegalIdentity } from "@/lib/legal";
import { localeAlternates, requireLocale } from "@/lib/locale-page";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  return {
    title: pick(locale, `Impressum | ${BRAND_NAME}`, `Legal notice | ${BRAND_NAME}`),
    description: pick(locale, `Anbieterkennzeichnung und rechtliche Informationen zu ${BRAND_NAME}.`, `Provider identification and legal information for ${BRAND_NAME}.`),
    alternates: localeAlternates(locale, "/legal-notice"),
    robots: { index: false, follow: true },
  };
}

export default async function LegalNoticePage({ params }: Props) {
  const locale = requireLocale((await params).locale);
  const c = (de: string, en: string) => pick(locale, de, en);
  const path = (value = "/") => localizedPath(locale, value);
  const legal = getLegalIdentity();

  return <main>
    <SiteHeader locale={locale} />
    <nav className="breadcrumb" aria-label="Breadcrumb"><Link href={path()}>{c("Start", "Home")}</Link><span aria-hidden="true">/</span><span aria-current="page">{c("Impressum", "Legal notice")}</span></nav>
    <section className="subpage-hero compact-subpage-hero"><p className="eyebrow">{c("Anbieterkennzeichnung", "Provider identification")}</p><h1>{c("Impressum", "Legal notice")}</h1><p>{c(`Rechtliche Angaben zum Betrieb von ${BRAND_NAME}.`, `Legal information about the operation of ${BRAND_NAME}.`)}</p><small>{c("Stand: 15. August 2026", "Last updated: August 15, 2026")}</small></section>

    <section className="section legal-section">
      {!legal.isComplete ? <div className="legal-readiness-warning" role="status"><strong>{c("Pflichtangaben noch nicht vollständig", "Required details are not complete yet")}</strong><p>{c("Betreibername, ladungsfähige Anschrift und Kontaktadresse müssen vor dem rechtssicheren öffentlichen Betrieb vollständig eingetragen werden.", "The operator name, serviceable address, and contact email must be completed before the service is legally ready for public operation.")}</p></div> : null}

      <div className="legal-content">
        <article>
          <p className="eyebrow">01</p>
          <h2>{c("Angaben gemäß § 5 DDG", "Provider details")}</h2>
          {legal.operatorName ? <p><strong>{legal.operatorName}</strong></p> : <p className="legal-missing-value">{c("Betreibername wird ergänzt", "Operator name to be added")}</p>}
          {legal.operatorAddress.length ? <address>{legal.operatorAddress.map((line) => <span key={line}>{line}</span>)}</address> : <p className="legal-missing-value">{c("Ladungsfähige Anschrift wird ergänzt", "Serviceable address to be added")}</p>}
        </article>

        <article>
          <p className="eyebrow">02</p>
          <h2>{c("Kontakt", "Contact")}</h2>
          {legal.legalEmail ? <p>{c("E-Mail:", "Email:")} <a href={`mailto:${legal.legalEmail}`}>{legal.legalEmail}</a></p> : <p className="legal-missing-value">{c("Kontaktadresse wird ergänzt", "Contact email to be added")}</p>}
        </article>

        {legal.editorialResponsible ? <article>
          <p className="eyebrow">03</p>
          <h2>{c("Verantwortlich für redaktionelle Inhalte", "Responsible for editorial content")}</h2>
          <p>{legal.editorialResponsible}</p>
          {legal.operatorAddress.length ? <address>{legal.operatorAddress.map((line) => <span key={line}>{line}</span>)}</address> : null}
        </article> : null}

        {legal.registerName || legal.registerNumber || legal.vatId ? <article>
          <p className="eyebrow">04</p>
          <h2>{c("Register und Steuerangaben", "Registration and tax details")}</h2>
          {legal.registerName ? <p>{c("Register:", "Register:")} {legal.registerName}</p> : null}
          {legal.registerNumber ? <p>{c("Registernummer:", "Registration number:")} {legal.registerNumber}</p> : null}
          {legal.vatId ? <p>{c("Umsatzsteuer Identifikationsnummer:", "VAT identification number:")} {legal.vatId}</p> : null}
        </article> : null}

        <article>
          <p className="eyebrow">05</p>
          <h2>{c("Verbraucherstreitbeilegung", "Consumer dispute resolution")}</h2>
          <p>{c("Wir sind nicht verpflichtet und derzeit nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.", "We are not required and currently not willing to participate in dispute resolution proceedings before a consumer arbitration board.")}</p>
        </article>

        <article>
          <p className="eyebrow">06</p>
          <h2>{c("Inhalte und externe Links", "Content and external links")}</h2>
          <p>{c("Wir pflegen die eigenen Inhalte sorgfältig. Produktdaten können trotzdem unvollständig oder veraltet sein und ersetzen nicht die Angaben auf der aktuellen Verpackung. Für Inhalte externer Seiten sind ausschließlich deren Betreiber verantwortlich.", "We maintain our content with care. Product data may still be incomplete or outdated and does not replace the information on the current package. External website operators remain responsible for their own content.")}</p>
          <p><Link href={path("/editorial-policy")}>{c("Redaktionsrichtlinie", "Editorial policy")}</Link><span aria-hidden="true"> · </span><Link href={path("/privacy")}>{c("Datenschutz", "Privacy")}</Link></p>
        </article>
      </div>
    </section>
  </main>;
}
