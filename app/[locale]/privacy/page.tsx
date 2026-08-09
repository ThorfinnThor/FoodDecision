import type { Metadata } from "next";
import Link from "next/link";
import { PrivacyControls } from "@/components/PrivacyControls";
import { SiteHeader } from "@/components/SiteHeader";
import { localizedPath, pick } from "@/lib/i18n";
import { localeAlternates, requireLocale } from "@/lib/locale-page";
import { BRAND_NAME } from "@/lib/brand";

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
  const operatorName = process.env.NEXT_PUBLIC_OPERATOR_NAME?.trim();
  const contact = process.env.NEXT_PUBLIC_PRIVACY_CONTACT?.trim();

  return <main>
    <SiteHeader locale={locale} />
    <nav className="breadcrumb" aria-label="Breadcrumb"><Link href={path()}>{c("Start", "Home")}</Link><span aria-hidden="true">/</span><span aria-current="page">{c("Datenschutz", "Privacy")}</span></nav>
    <section className="subpage-hero compact-subpage-hero"><p className="eyebrow">{c("Datensparsam entwickelt", "Built for data minimization")}</p><h1>{c("Datenschutz", "Privacy")}</h1><p>{c("Die wichtigsten Entscheidungen passieren auf deinem Gerät. Hier erklären wir klar, was lokal bleibt, was freiwillig übertragen wird und wie du deine Daten kontrollierst.", "The most important decisions happen on your device. Here we explain what stays local, what is submitted voluntarily, and how you control your data.")}</p><small>{c("Stand: 9. August 2026", "Last updated: August 9, 2026")}</small></section>

    <section className="section privacy-section">
      <div className="privacy-summary" aria-label={c("Kurzfassung", "Summary")}>
        <span><strong>{c("Barcode", "Barcode")}</strong><small>{c("Manuelle Eingabe bleibt lokal", "Manual entry stays local")}</small></span>
        <span><strong>{c("Kamera", "Camera")}</strong><small>{c("Kein Zugriff durch diese Website", "No access by this website")}</small></span>
        <span><strong>{c("Lokale Daten", "Local data")}</strong><small>{c("Bleiben in deinem Browser", "Stay in your browser")}</small></span>
        <span><strong>{c("Statistik", "Analytics")}</strong><small>{c("Nur nach deiner Aktivierung", "Only after you enable it")}</small></span>
      </div>

      <PrivacyControls locale={locale} />

      <div className="privacy-content">
        <article id="barcode">
          <p className="eyebrow">01</p>
          <h2>{c("Manuelle Barcodesuche", "Manual barcode lookup")}</h2>
          <p>{c(`Die Website fordert keinen Zugriff auf Kamera oder Mikrofon an. Du kannst eine Barcodenummer ausschließlich manuell eingeben. Die Suche findet im bereits geladenen Marktkatalog in deinem Browser statt; die eingegebene Nummer wird nicht an ${BRAND_NAME}, Supabase, Vercel oder andere Dritte übertragen.`, `The website does not request camera or microphone access. You can enter a barcode number manually. Lookup runs against the market catalog already loaded in your browser; the entered number is not sent to ${BRAND_NAME}, Supabase, Vercel, or any other third party.`)}</p>
          <p>{c("Der optionale Scanverlauf enthält nur formal gültige Barcodenummern und gefundene Produktnamen. Er wird ausschließlich lokal in deinem Browser gespeichert. Ungültige Eingaben werden nicht gespeichert. Du kannst den Verlauf auf der Scannerseite oder über die Einstellungen oben vollständig löschen.", "Optional scan history contains only formally valid barcode numbers and matched product names. It is stored only in your browser. Invalid entries are not saved. You can clear the history on the scanner page or with the controls above.")}</p>
        </article>

        <article>
          <p className="eyebrow">02</p>
          <h2>{c("Lokale Funktionen", "Local features")}</h2>
          <p>{c(`Favoriten, Einkaufsliste, abgehakte Einkäufe, Finderpräferenzen und Scanverlauf verwenden den lokalen Browserspeicher. Diese Angaben verlassen dein Gerät nicht und sind nicht mit einem Konto verknüpft. ${BRAND_NAME} setzt für diese Funktionen keine Cookies.`, `Favorites, shopping lists, completed shopping items, Finder preferences, and scan history use local browser storage. This data does not leave your device and is not linked to an account. ${BRAND_NAME} does not set cookies for these features.`)}</p>
          <p>{c("Die Daten bleiben erhalten, bis du sie in der jeweiligen Funktion, über die Einstellungen oben oder über die Browserdaten löschst. Andere Personen mit Zugriff auf dasselbe Browserprofil können lokale Einträge sehen.", "The data remains until you delete it in the relevant feature, with the controls above, or through your browser data settings. Other people with access to the same browser profile may be able to see local entries.")}</p>
        </article>

        <article>
          <p className="eyebrow">03</p>
          <h2>{c("Optionale Nutzungsstatistik", "Optional usage analytics")}</h2>
          <p>{c("Die optionale Nutzungsstatistik ist standardmäßig deaktiviert. Erst nach deiner Aktivierung erfasst Vercel Web Analytics anonyme Seitenaufrufe. Zusätzlich senden wir ausgewählte Ereignisse wie das Öffnen einer Produktseite, den Abschluss des Finders oder einen Vergleich an unsere geschützte Schnittstelle. Suchbegriffe, URL Parameter und Barcodes werden weder an Vercel noch an Supabase übertragen.", "Optional usage analytics is disabled by default. Only after you enable it does Vercel Web Analytics collect anonymous page views. We also send selected events such as opening a product page, completing the Finder, or comparing products to our protected endpoint. Search terms, URL parameters, and barcodes are not sent to Vercel or Supabase.")}</p>
          <p>{c("Vercel Web Analytics verwendet keine Drittanbieter Cookies und stellt uns nur zusammengefasste Statistiken bereit. Für unsere eigenen Ereignisse erzeugt der Browser eine zufällige Sitzungskennung, die vor dem Speichern in Supabase mit SHA 256 gehasht wird. Sie ist keinem Konto zugeordnet. Wenn dein Browser „Do Not Track“ sendet oder du die Statistik wieder deaktivierst, werden keine weiteren Statistikereignisse gesendet.", "Vercel Web Analytics does not use third party cookies and provides us only with aggregated statistics. For our own events, the browser creates a random session identifier that is hashed with SHA 256 before being stored in Supabase. It is not linked to an account. If your browser sends “Do Not Track” or you disable analytics again, no further analytics events are sent.")}</p>
        </article>

        <article>
          <p className="eyebrow">04</p>
          <h2>{c("Hosting und Dienstleister", "Hosting and service providers")}</h2>
          <p>{c("Die Website wird über Vercel ausgeliefert. Dabei können technisch notwendige Verbindungsdaten wie IP Adresse, Zeitpunkt, angeforderte URL und Browserinformationen in Infrastrukturprotokollen und Sicherheitsprotokollen verarbeitet werden. Nach deiner freiwilligen Aktivierung verarbeitet Vercel anonyme Seitenaufrufe für zusammengefasste Webstatistiken; ausgewählte Interaktionsereignisse speichern wir in Supabase. Wir bieten derzeit keinen Newsletter an und erfassen keine Adressen für Produktupdates. Frühere Testvormerkungen werden mit der zugehörigen Datenbanktabelle gelöscht. Geheime Datenbankschlüssel werden nie an den Browser ausgeliefert.", "The website is delivered through Vercel. Technically necessary connection data such as IP address, time, requested URL, and browser information may be processed in infrastructure and security logs. After you voluntarily enable analytics, Vercel processes anonymous page views for aggregated web statistics; we store selected interaction events in Supabase. We currently do not offer a newsletter and do not collect addresses for product updates. Earlier test signups are deleted with the related database table. Secret database keys are never delivered to the browser.")}</p>
          <p><a href="https://vercel.com/legal/privacy-notice" rel="noreferrer" target="_blank">Vercel Privacy Notice</a><span aria-hidden="true"> · </span><a href="https://supabase.com/privacy" rel="noreferrer" target="_blank">Supabase Privacy Policy</a></p>
        </article>

        <article>
          <p className="eyebrow">05</p>
          <h2>{c("Produktdaten und externe Links", "Product data and external links")}</h2>
          <p>{c("Produktdaten und Produktbilder stammen von Open Food Facts. Die Daten werden vor dem Seitenaufruf importiert; Produktseiten rufen die Open Food Facts API nicht live auf. Produktbilder können direkt von den erlaubten Bildservern von Open Food Facts geladen werden, wodurch dort technisch deine IP Adresse verarbeitet werden kann. Externe Quellenlinks und Händlerlinks öffnen erst nach deinem Klick.", "Product data and product images come from Open Food Facts. Data is imported before page load; product pages do not call the Open Food Facts API live. Product images may load directly from approved Open Food Facts image servers, which can technically process your IP address. External source and merchant links open only after you select them.")}</p>
        </article>

        <article>
          <p className="eyebrow">06</p>
          <h2>{c("Hinweise zu Produktdaten", "Product data reports")}</h2>
          <p>{c("Wenn du freiwillig ein Datenproblem meldest, speichern wir die Produktreferenz, Markt und Sprache, die ausgewählte Problemart, deinen optionalen Hinweis und den Zeitpunkt der Meldung in Supabase. Das Formular fragt weder Namen noch Mailadresse ab und überträgt keine Barcodedaten. Bitte trage keine persönlichen oder medizinischen Informationen ein. Meldungen bleiben bis zur Prüfung und anschließenden Erledigung oder Ablehnung gespeichert.", "If you voluntarily report a data issue, we store the product reference, market and language, selected issue type, optional note, and report time in Supabase. The form does not ask for a name or email address and does not send barcode data. Do not enter personal or medical information. Reports remain stored until they are reviewed and then resolved or dismissed.")}</p>
        </article>

        <article>
          <p className="eyebrow">07</p>
          <h2>{c("Kontakt und Rechte", "Contact and rights")}</h2>
          <p>{c("Du kannst Auskunft, Berichtigung oder Löschung der von uns gespeicherten personenbezogenen Daten verlangen und eine erteilte Einwilligung widerrufen. Lokal gespeicherte Daten kannst nur du über dieses Gerät löschen, weil wir keinen Zugriff darauf haben.", "You may request access, correction, or deletion of personal data stored by us and withdraw consent. Only you can delete locally stored data through this device because we cannot access it.")}</p>
          {operatorName && contact
            ? <p><strong>{c("Verantwortlich:", "Controller:")}</strong> {operatorName}<br />{c("Datenschutzkontakt:", "Privacy contact:")} <a href={`mailto:${contact}`}>{contact}</a></p>
            : <p className="privacy-contact-warning">{c("Vor dem öffentlichen Launch müssen hier noch der vollständige Betreibername und eine erreichbare Datenschutzadresse ergänzt werden.", "Before public launch, the operator's full legal name and a working privacy contact address must be added here.")}</p>}
        </article>
      </div>
    </section>
  </main>;
}
