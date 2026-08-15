import type { Metadata } from "next";
import Link from "next/link";
import { PrivacyControls } from "@/components/PrivacyControls";
import { SiteHeader } from "@/components/SiteHeader";
import { localizedPath, pick } from "@/lib/i18n";
import { localeAlternates, requireLocale } from "@/lib/locale-page";
import { BRAND_NAME } from "@/lib/brand";
import { getLegalIdentity } from "@/lib/legal";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  return {
    title: pick(locale, `Datenschutz | ${BRAND_NAME}`, `Privacy | ${BRAND_NAME}`),
    description: pick(locale, `Wie ${BRAND_NAME} lokale Daten und freiwillig übermittelte Angaben verarbeitet.`, `How ${BRAND_NAME} handles local data and voluntarily submitted information.`),
    alternates: localeAlternates(locale, "/privacy"),
    robots: { index: false, follow: true },
  };
}

export default async function PrivacyPage({ params }: Props) {
  const locale = requireLocale((await params).locale);
  const c = (de: string, en: string) => pick(locale, de, en);
  const path = (value = "/") => localizedPath(locale, value);
  const legal = getLegalIdentity();
  const contact = legal.privacyEmail || legal.legalEmail;

  return <main>
    <SiteHeader locale={locale} />
    <nav className="breadcrumb" aria-label="Breadcrumb"><Link href={path()}>{c("Start", "Home")}</Link><span aria-hidden="true">/</span><span aria-current="page">{c("Datenschutz", "Privacy")}</span></nav>
    <section className="subpage-hero compact-subpage-hero"><p className="eyebrow">{c("Datensparsam entwickelt", "Built for data minimization")}</p><h1>{c("Datenschutz", "Privacy")}</h1><p>{c("Die wichtigsten Entscheidungen passieren auf deinem Gerät. Hier erklären wir klar, was lokal bleibt, was freiwillig übertragen wird und wie du deine Daten kontrollierst.", "The most important decisions happen on your device. Here we explain what stays local, what is submitted voluntarily, and how you control your data.")}</p><small>{c("Stand: 15. August 2026", "Last updated: August 15, 2026")}</small></section>

    <section className="section privacy-section">
      <div className="privacy-summary" aria-label={c("Kurzfassung", "Summary")}>
        <span><strong>{c("Barcode", "Barcode")}</strong><small>{c("Manuelle Eingabe bleibt lokal", "Manual entry stays local")}</small></span>
        <span><strong>{c("Kamera", "Camera")}</strong><small>{c("Kein Zugriff durch diese Website", "No access by this website")}</small></span>
        <span><strong>{c("Lokale Daten", "Local data")}</strong><small>{c("Bleiben in deinem Browser", "Stay in your browser")}</small></span>
        <span><strong>{c("Statistik", "Analytics")}</strong><small>{c("Nur nach deiner Aktivierung", "Only after you enable it")}</small></span>
      </div>

      <PrivacyControls locale={locale} />

      <div className="privacy-content">
        <article>
          <p className="eyebrow">01</p>
          <h2>{c("Verantwortliche Stelle", "Controller")}</h2>
          {legal.operatorName ? <p><strong>{legal.operatorName}</strong></p> : <p className="privacy-contact-warning">{c("Der vollständige Betreibername wird ergänzt.", "The operator's full legal name will be added.")}</p>}
          {legal.operatorAddress.length ? <address>{legal.operatorAddress.map((line) => <span key={line}>{line}</span>)}</address> : <p className="privacy-contact-warning">{c("Die ladungsfähige Anschrift wird ergänzt.", "The serviceable address will be added.")}</p>}
          {contact ? <p>{c("Datenschutzkontakt:", "Privacy contact:")} <a href={`mailto:${contact}`}>{contact}</a></p> : <p className="privacy-contact-warning">{c("Die Datenschutz Kontaktadresse wird ergänzt.", "The privacy contact email will be added.")}</p>}
        </article>

        <article id="barcode">
          <p className="eyebrow">02</p>
          <h2>{c("Manuelle Barcodesuche", "Manual barcode lookup")}</h2>
          <p>{c(`Die Website fordert keinen Zugriff auf Kamera oder Mikrofon an. Du kannst eine Barcodenummer ausschließlich manuell eingeben. Die Suche findet im bereits geladenen Marktkatalog in deinem Browser statt; die eingegebene Nummer wird nicht an ${BRAND_NAME}, Supabase, Vercel oder andere Dritte übertragen.`, `The website does not request camera or microphone access. You can enter a barcode number manually. Lookup runs against the market catalog already loaded in your browser; the entered number is not sent to ${BRAND_NAME}, Supabase, Vercel, or any other third party.`)}</p>
          <p>{c("Der optionale Scanverlauf enthält nur formal gültige Barcodenummern und gefundene Produktnamen. Er wird ausschließlich lokal in deinem Browser gespeichert. Ungültige Eingaben werden nicht gespeichert. Du kannst den Verlauf auf der Scannerseite oder über die Einstellungen oben vollständig löschen.", "Optional scan history contains only formally valid barcode numbers and matched product names. It is stored only in your browser. Invalid entries are not saved. You can clear the history on the scanner page or with the controls above.")}</p>
        </article>

        <article>
          <p className="eyebrow">03</p>
          <h2>{c("Lokale Funktionen", "Local features")}</h2>
          <p>{c(`Favoriten, Einkaufsliste, abgehakte Einkäufe, Finderpräferenzen und Scanverlauf verwenden den lokalen Browserspeicher. Diese Angaben verlassen dein Gerät nicht und sind nicht mit einem Konto verknüpft. ${BRAND_NAME} setzt für diese Funktionen keine Cookies.`, `Favorites, shopping lists, completed shopping items, Finder preferences, and scan history use local browser storage. This data does not leave your device and is not linked to an account. ${BRAND_NAME} does not set cookies for these features.`)}</p>
          <p>{c("Die Daten bleiben erhalten, bis du sie in der jeweiligen Funktion, über die Einstellungen oben oder über die Browserdaten löschst. Andere Personen mit Zugriff auf dasselbe Browserprofil können lokale Einträge sehen.", "The data remains until you delete it in the relevant feature, with the controls above, or through your browser data settings. Other people with access to the same browser profile may be able to see local entries.")}</p>
        </article>

        <article>
          <p className="eyebrow">04</p>
          <h2>{c("Optionale Nutzungsstatistik", "Optional usage analytics")}</h2>
          <p>{c("Die optionale Nutzungsstatistik ist standardmäßig deaktiviert. Rechtsgrundlage ist erst nach deiner Aktivierung deine Einwilligung gemäß Artikel 6 Absatz 1 Buchstabe a DSGVO. Dann erfasst Vercel Web Analytics anonyme Seitenaufrufe. Zusätzlich senden wir ausgewählte Ereignisse wie das Öffnen einer Produktseite, den Abschluss des Finders oder einen Vergleich an unsere geschützte Schnittstelle. Suchbegriffe, URL Parameter und Barcodes werden weder an Vercel noch an Supabase übertragen.", "Optional usage analytics is disabled by default. Once you enable it, the legal basis is your consent under Article 6(1)(a) GDPR. Vercel Web Analytics then collects anonymous page views. We also send selected events such as opening a product page, completing the Finder, or comparing products to our protected endpoint. Search terms, URL parameters, and barcodes are not sent to Vercel or Supabase.")}</p>
          <p>{c("Vercel Web Analytics verwendet keine Drittanbieter Cookies und stellt uns nur zusammengefasste Statistiken bereit. Für unsere eigenen Ereignisse erzeugt der Browser eine zufällige Sitzungskennung, die vor dem Speichern in Supabase mit SHA 256 gehasht wird. Sie ist keinem Konto zugeordnet. Wenn dein Browser „Do Not Track“ sendet oder du die Statistik wieder deaktivierst, werden keine weiteren Statistikereignisse gesendet.", "Vercel Web Analytics does not use third party cookies and provides us only with aggregated statistics. For our own events, the browser creates a random session identifier that is hashed with SHA 256 before being stored in Supabase. It is not linked to an account. If your browser sends “Do Not Track” or you disable analytics again, no further analytics events are sent.")}</p>
        </article>

        <article>
          <p className="eyebrow">05</p>
          <h2>{c("Hosting und Dienstleister", "Hosting and service providers")}</h2>
          <p>{c("Die Website wird über Vercel ausgeliefert. Dabei können technisch notwendige Verbindungsdaten wie IP Adresse, Zeitpunkt, angeforderte URL und Browserinformationen in Infrastrukturprotokollen und Sicherheitsprotokollen verarbeitet werden. Rechtsgrundlage ist unser berechtigtes Interesse an einer sicheren und zuverlässigen Bereitstellung gemäß Artikel 6 Absatz 1 Buchstabe f DSGVO. Nach deiner freiwilligen Aktivierung verarbeitet Vercel anonyme Seitenaufrufe für zusammengefasste Webstatistiken; ausgewählte Interaktionsereignisse speichern wir in Supabase. Wir bieten derzeit keinen Newsletter an und erfassen keine Adressen für Produktupdates. Geheime Datenbankschlüssel werden nie an den Browser ausgeliefert.", "The website is delivered through Vercel. Technically necessary connection data such as IP address, time, requested URL, and browser information may be processed in infrastructure and security logs. The legal basis is our legitimate interest in secure and reliable delivery under Article 6(1)(f) GDPR. After you voluntarily enable analytics, Vercel processes anonymous page views for aggregated web statistics; we store selected interaction events in Supabase. We currently do not offer a newsletter and do not collect addresses for product updates. Secret database keys are never delivered to the browser.")}</p>
          <p>{c("Vercel und Supabase können Daten außerhalb des Europäischen Wirtschaftsraums verarbeiten. Soweit erforderlich, stützen die Anbieter solche Übermittlungen insbesondere auf die Standardvertragsklauseln der Europäischen Kommission. Einzelheiten stehen in den verlinkten Datenschutzhinweisen und Auftragsverarbeitungsbedingungen.", "Vercel and Supabase may process data outside the European Economic Area. Where required, the providers rely in particular on the European Commission's Standard Contractual Clauses for those transfers. Details are available in the linked privacy notices and data processing terms.")}</p>
          <p><a href="https://vercel.com/legal/privacy-notice" rel="noreferrer" target="_blank">Vercel Privacy Notice</a><span aria-hidden="true"> · </span><a href="https://vercel.com/legal/dpa" rel="noreferrer" target="_blank">Vercel DPA</a><span aria-hidden="true"> · </span><a href="https://supabase.com/privacy" rel="noreferrer" target="_blank">Supabase Privacy Policy</a></p>
        </article>

        <article>
          <p className="eyebrow">06</p>
          <h2>{c("Produktdaten und externe Links", "Product data and external links")}</h2>
          <p>{c("Produktdaten und Produktbilder stammen von Open Food Facts. Die Daten werden vor dem Seitenaufruf importiert; Produktseiten rufen die Open Food Facts API nicht live auf. Produktbilder können direkt von den erlaubten Bildservern von Open Food Facts geladen werden, wodurch dort technisch deine IP Adresse verarbeitet werden kann. Externe Quellenlinks und Händlerlinks öffnen erst nach deinem Klick.", "Product data and product images come from Open Food Facts. Data is imported before page load; product pages do not call the Open Food Facts API live. Product images may load directly from approved Open Food Facts image servers, which can technically process your IP address. External source and merchant links open only after you select them.")}</p>
        </article>

        <article>
          <p className="eyebrow">07</p>
          <h2>{c("Hinweise zu Produktdaten", "Product data reports")}</h2>
          <p>{c("Wenn du freiwillig ein Datenproblem meldest, speichern wir die Produktreferenz, Markt und Sprache, die ausgewählte Problemart, deinen optionalen Hinweis und den Zeitpunkt der Meldung in Supabase. Rechtsgrundlage ist unser berechtigtes Interesse an der Korrektur veröffentlichter Produktdaten gemäß Artikel 6 Absatz 1 Buchstabe f DSGVO. Das Formular fragt weder Namen noch Mailadresse ab und überträgt keine Barcodedaten. Bitte trage keine persönlichen oder medizinischen Informationen ein. Meldungen bleiben bis zur Prüfung und anschließenden Erledigung oder Ablehnung gespeichert.", "If you voluntarily report a data issue, we store the product reference, market and language, selected issue type, optional note, and report time in Supabase. The legal basis is our legitimate interest in correcting published product data under Article 6(1)(f) GDPR. The form does not ask for a name or email address and does not send barcode data. Do not enter personal or medical information. Reports remain stored until they are reviewed and then resolved or dismissed.")}</p>
        </article>

        <article>
          <p className="eyebrow">08</p>
          <h2>{c("Kontakt und Rechte", "Contact and rights")}</h2>
          <p>{c("Du kannst Auskunft, Berichtigung, Löschung, Einschränkung oder Übertragung personenbezogener Daten verlangen, einer Verarbeitung aus berechtigtem Interesse widersprechen und eine Einwilligung jederzeit für die Zukunft widerrufen. Du kannst dich außerdem bei einer Datenschutzaufsichtsbehörde beschweren. Lokal gespeicherte Daten kannst nur du über dieses Gerät löschen, weil wir keinen Zugriff darauf haben.", "You may request access, correction, deletion, restriction, or portability of personal data, object to processing based on legitimate interests, and withdraw consent at any time for the future. You may also lodge a complaint with a data protection supervisory authority. Only you can delete locally stored data through this device because we cannot access it.")}</p>
          {legal.operatorName && contact
            ? <p><strong>{c("Verantwortlich:", "Controller:")}</strong> {legal.operatorName}<br />{c("Datenschutzkontakt:", "Privacy contact:")} <a href={`mailto:${contact}`}>{contact}</a></p>
            : <p className="privacy-contact-warning">{c("Betreiberangaben und Datenschutzadresse sind noch nicht vollständig konfiguriert.", "The operator details and privacy contact are not fully configured yet.")}</p>}
        </article>
      </div>
    </section>
  </main>;
}
