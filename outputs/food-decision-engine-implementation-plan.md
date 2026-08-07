# Food Decision Engine - Implementierungsplan

Stand: 2026-08-07

## 0. Verbindliche Sprint-Aktualisierung

Die folgenden Entscheidungen ersetzen widersprechende Annahmen in aelteren
Abschnitten dieses Plans:

- Maerkte: Deutschland (`DE`, `de-DE`) und USA (`US`, `en-US`).
- Oeffentliche URL-Struktur: `/de/...` und `/en-us/...`; keine automatische
  Geo- oder Browser-Sprachweiterleitung.
- Datenisolation: Importlaeufe, Rohprodukte, normalisierte Produkte, Rankings,
  Exporte, Favoriten, Einkaufslisten und Finder-Praeferenzen sind marktbezogen.
- SEO: eigene Canonicals je Locale, uebersetzte Kategorie- und Ranking-Slugs,
  reziproke `hreflang`-Links nur fuer tatsaechlich entsprechende Seiten und
  `x-default` auf Deutsch. Ungepruefte skalierte Seiten bleiben `noindex,follow`.
- Bilder: Im aktuellen Sprint werden ausschliesslich HTTPS-Produktbilder der
  erlaubten Open-Food-Facts-Hosts angezeigt. Sie werden als CC BY-SA
  gekennzeichnet und auf die Produktquelle verlinkt. Andere Bildquellen werden
  ausgeblendet und als Datenqualitaetsproblem protokolliert.
- Wachstum: Zuerst werden die vorhandenen 12 Kategorien pro Markt stabilisiert.
  Kategorien unter 20 veroeffentlichten Produkten gelten als `thin`, 20 bis 49
  als `developing`, ab 50 als `solid`. Erst danach werden neue Kategorien
  ergaenzt.
- Monetarisierung: Affiliate-Links werden erst nach einer stabilen Live-Version
  umgesetzt. Affiliate-Daten duerfen Scores, Rankings und Empfehlungen niemals
  beeinflussen.
- Exportskalierung: Supabase wird paginiert abgefragt; Produkt- und Suchindizes
  werden in Bloecke zu maximal 500 Eintraegen geteilt. Dadurch endet ein voller
  Import nicht still bei der Supabase-Standardgrenze von 1.000 Zeilen.
- Nutzwert vor SEO-Menge: Kategorie- und Ranking-Seiten enthalten
  datenabgeleitete Kennzahlen, Vergleichskontext, Datenabdeckung und sichtbare
  Unsicherheit. Seiten werden nicht allein wegen vorhandener Produkte indexiert.

### Reihenfolge fuer den naechsten Live-Ausbau

1. Migration `0007_market_localization_foundation.sql` anwenden.
2. Duennen deutschen Kategorien gezielt per Dry Run und danach Write Run
   auffuellen.
3. US-Katalog mit einer Seite und 50 Produkten je Kategorie trocken testen.
4. Den US-Katalog mit denselben Einstellungen schreiben und normalisieren.
5. Beide Marktmanifeste, die Qualitaetszusammenfassung und `/de` sowie `/en-us`
   in der Live-Version pruefen.
6. Pro Markt auf drei Seiten zu je 50 Produkten erweitern; bei OFF-503 nur
   betroffene Kategorien erneut ausfuehren.
7. Erst nach stabilen Katalogen neue Kategorien und danach Affiliate-Links
   beginnen.

## 1. Produktvision

Die Food Decision Engine wird keine weitere Naehrwertdatenbank. Sie beantwortet konkrete Einkaufs- und Ernaehrungsfragen:

- Welches Produkt passt zu meinem Ziel?
- Welche Alternative ist gesuender, guenstiger oder besser vertraeglich?
- Welche Produkte erfuellen mehrere Anforderungen gleichzeitig?
- Was ist der beste Ersatz fuer Produkt X?

Die Positionierung lautet:

> Nicht: "Hier sind die Naehrwerte."
>
> Sondern: "Hier ist die beste Wahl fuer deinen konkreten Bedarf - mit Begruendung und Alternativen."

Das langfristige Produkt verbindet strukturierte Produktdaten, nachvollziehbare Scores, Vergleiche, Bestenlisten, einen schnellen Finder und spaeter personalisierte Praeferenzen.

## 2. Zielgruppen

- gesundheitsbewusste Verbraucher
- Familien und Eltern
- Sportler
- Menschen mit Allergien oder Unvertraeglichkeiten
- Veganer und Vegetarier
- preisbewusste Kaeufer
- Nutzer mit konkreten Makro-, Zutaten- oder Label-Praeferenzen

## 3. Phase 0: Kritische Vorentscheidungen

Vor der Implementierung muessen die folgenden Punkte festgelegt sein. Diese Entscheidungen begrenzen den Scope und verhindern, dass aus dem MVP eine unkontrollierte Datenbank wird.

### Zielmarkt und Sprache (historische Ausgangsannahme, durch Abschnitt 0 ersetzt)

- Zielmarkt: Deutschland
- Sprache: Deutsch
- Primaere Datenbasis: Open Food Facts mit Fokus auf Produkte, die fuer Deutschland relevant sind
- Keine Mehrsprachigkeit im MVP
- Keine Nutzeraccounts im MVP

### Startkategorien

Der MVP startet mit wenigen Kategorien, in denen Such- und Vergleichsintention klar erkennbar sind:

- Hafermilch und pflanzliche Milchalternativen
- Proteinriegel
- Muesli und Cerealien
- Joghurt, Skyr und Quark
- vegane Snacks

Weitere Kategorien werden erst ergaenzt, wenn Import, Normalisierung, Scoring, SEO-Indexierung und Monitoring fuer diese Startkategorien stabil laufen.

### Implementierte Produktpalette

Die technische Palette ist bereits auf zwoelf Kategorien erweitert. Die ersten
fuenf bleiben die priorisierten Launch-Kategorien; die weiteren Kategorien
nutzen denselben Import-, Qualitaets-, Scoring- und SEO-Governance-Prozess:

- Hafermilch
- Proteinriegel
- Muesli
- Joghurt und Skyr
- vegane Snacks
- Fruehstueckscerealien
- pflanzliche Joghurts
- Brotaufstriche
- Nussmuse
- Fertiggerichte
- Erfrischungsgetraenke
- Kinder-Snacks

Pro Kategorie sind zwei sinnvolle Ranking-Konzepte als noindex-Kandidaten
definiert, insgesamt 24. Ein Ranking wird erst indexierbar, wenn die im Plan
festgelegten Mengen-, Datenqualitaets-, Originalitaets- und Freigabekriterien
erfuellt sind. Die breitere technische Palette ist deshalb keine automatische
SEO-Veroeffentlichung.

### Primaere Nutzerfragen im MVP

- Ist dieses Produkt fuer mein Ziel geeignet?
- Warum ist es geeignet oder ungeeignet?
- Welche bessere Alternative gibt es?
- Welches Produkt ist in einer Kategorie die beste Wahl fuer ein konkretes Kriterium?
- Wie unterscheiden sich zwei Produkte?

### Nicht im MVP

- Accounts
- Barcode-Scan
- personalisierte Langzeitprofile
- Rezepte
- Einkaufslisten
- Preis-Tracking
- Haendlerverfuegbarkeit
- API fuer Partner
- mobile native App
- KI-generierte medizinische oder therapeutische Empfehlungen

## 4. Geschaeftsmodell

### Primaer

- Affiliate fuer Lebensmittel, Supplements, Kuechenprodukte und Lieferdienste
- Display Ads auf informations- und SEO-starken Seiten

### Sekundaer

- gesponserte, klar gekennzeichnete Platzierungen
- Haendler- und Marken-Leads
- Datenzugang oder API fuer Partner
- Premium-Funktionen erst bei klarer Nachfrage

### Grundregeln

- Gesponserte Platzierungen duerfen Scores und Rankings nicht verdecken oder veraendern.
- Affiliate-Links muessen technisch und visuell als kommerzielle Elemente nachvollziehbar bleiben.
- Rankings muessen auch ohne Affiliate-Angebote funktionieren.
- Die beste Entscheidungshilfe ist wichtiger als kurzfristige Monetarisierung.

## 5. Datenquellen und Compliance

### Kernquelle

Open Food Facts dient als Basis fuer:

- Produktnamen
- Marken
- Barcodes/GTINs
- Kategorien
- Labels
- Zutaten
- Allergene
- Naehrwerte
- Produktbilder
- Laender- und Store-Hinweise
- Datenqualitaets- und Aenderungsinformationen, soweit verfuegbar

### Ergaenzende Quellen

- eigene normalisierte Kategorien und Synonyme
- manuell gepflegte Editorial Facts fuer wichtige Produktgruppen
- oeffentlich verfuegbare Referenzwerte fuer Naehrstoffe
- spaeter optional Haendlerpreise und Verfuegbarkeiten, sofern kommerziell und rechtlich sauber nutzbar

### Lizenz- und Quellenprinzipien

- Jede Quelle wird dokumentiert.
- Rohdaten, normalisierte Daten und redaktionelle Daten bleiben getrennt.
- Der Ursprung jedes importierten Wertes muss rekonstruierbar sein.
- Open-Food-Facts-Attribution wird sichtbar und maschinenlesbar eingeplant.
- Share-Alike-Anforderungen werden technisch beruecksichtigt.
- Produktbilder werden nur genutzt, wenn die Lizenz- und Attribution-Anforderungen eingehalten werden koennen.
- Unsichere oder unvollstaendige Produkte werden sichtbar gekennzeichnet oder nicht veroeffentlicht.

Open Food Facts beschreibt in der offiziellen Dokumentation, dass die Datenbank unter der Open Database License steht, einzelne Inhalte unter der Database Contents License verfuegbar sind und Produktbilder unter Creative Commons Attribution ShareAlike stehen. Vor Launch muss die konkrete Umsetzung mit den aktuellen Open-Food-Facts-Nutzungs- und Attributionsregeln final abgeglichen werden.

### Health-, Allergen- und Verbraucherhinweise

- Keine medizinischen Diagnosen oder Therapieempfehlungen.
- Keine Aussage wie "gesund" ohne Kontext und Begruendung.
- Allergene immer mit Hinweis auf Datenunsicherheit und Produktetikett-Pruefung anzeigen.
- Bei fehlenden Daten keine negativen Annahmen treffen.
- Bei Kindern, Allergien, Unvertraeglichkeiten und Diaeten besonders vorsichtig formulieren.
- Produktdaten koennen veraltet, unvollstaendig oder nutzergeneriert sein.

## 6. Produktumfang

### A. Produktseiten

Jede Produktseite enthaelt:

- Produktname, Marke, Kategorie und Bild
- zentrale Naehrwerte pro 100 g/ml und optional pro Portion
- Zutaten und Allergene
- Labels und relevante Claims
- Positives und Negatives in verstaendlicher Sprache
- relevante Scores mit Begruendung
- Datenqualitaets-Hinweis
- Alternativen
- direkte Vergleichslinks
- passende Bestenlisten
- Affiliate-CTA, sofern verfuegbar

### B. Kategorie- und Bestenlisten

Beispiele:

- beste Hafermilch ohne Zuckerzusatz
- proteinreichste Joghurts
- Mueslis mit wenig Zucker
- vegane Snacks unter 200 kcal
- Kinderprodukte ohne Palmoel
- beste Proteinriegel ohne Suessstoffe

Diese Seiten sind die wichtigste SEO- und Monetarisierungsschicht. Sie duerfen nur indexiert werden, wenn die Datenlage ausreichend ist.

### C. Vergleichsseiten

Vergleichsseiten zeigen:

- Produkt A vs. Produkt B
- Marke A vs. Marke B
- Kategorie A vs. Kategorie B

Sie enthalten Unterschiede, Gewinner pro Kriterium, Datenqualitaet, Score-Erklaerungen und eine klare Entscheidungshilfe.

### D. Finder

Der Finder startet als filterbare Produktsuche mit erklaerbarem Match-Score.

MVP-Filter:

- Kategorie
- Ernaehrungsform
- Allergene ausschliessen
- maximaler Zucker
- Mindestprotein
- Kalorienbereich
- Zusatzstoffe
- enthaltene oder ausgeschlossene Zutaten

Ergebnis:

- sortierte Produkte
- Match-Score
- wichtigste Gruende fuer Match oder Ausschluss
- Link zu Produkt, Vergleich und Alternativen

### E. Langfristige Erweiterungen

- Einkaufslisten
- Barcode-Scan in mobiler Web-App
- personalisierte Praeferenzen
- Preis-Leistungs-Score
- Rezept- und Substitutionslogik
- "besserer Ersatz"-Funktion
- B2B-Datenprodukte

## 7. MVP-Scope

Der erste oeffentlich nutzbare Stand muss liefern:

- Produktdetailseiten fuer veroeffentlichbare Produkte
- Kategorieuebersichten fuer die Startkategorien
- 5 bis 10 manuell ausgewaehlte Ranking-Seiten
- Produktvergleich fuer zwei Produkte
- erklaerbare Score-Breakdowns
- sichtbare Datenqualitaetsindikatoren
- Sitemap, Canonicals und Noindex-Regeln
- Basis-Analytics fuer Seitenaufrufe, Ranking-Klicks, Vergleichsnutzung und Affiliate-Klicks
- Import- und Scoring-Logs fuer interne Kontrolle

## 8. Datenmodell

### Kerntabellen

- `products`
- `brands`
- `categories`
- `product_categories`
- `nutrition_facts`
- `ingredients`
- `product_ingredients`
- `allergens`
- `product_allergens`
- `labels`
- `product_labels`
- `product_scores`
- `comparisons`
- `seo_pages`
- `affiliate_offers`
- `data_quality_flags`

### Kritische Zusatztabellen

- `data_sources`
- `import_runs`
- `product_source_snapshots`
- `score_rules`
- `score_explanations`
- `ranking_pages`
- `ranking_items`
- `redirects`
- `slug_history`
- `editorial_notes`
- `publishability_checks`

### Wichtige Feldgruppen

`products`:

- interne Produkt-ID
- Barcode/GTIN
- Slug
- Name
- Marke
- Bild-URL
- Hauptkategorie
- Herkunftsland/Relevanzland
- Quelle
- Importstatus
- Publishability-Status
- Datenqualitaetsstatus
- letzter Importzeitpunkt
- letzter Quell-Aenderungszeitpunkt

`nutrition_facts`:

- Energie
- Fett
- gesaettigte Fettsaeuren
- Kohlenhydrate
- Zucker
- Ballaststoffe
- Eiweiss
- Salz
- Natrium, falls verfuegbar
- Einheit
- Bezugswert pro 100 g/ml
- Portion, falls verfuegbar
- Vollstaendigkeitsgrad

`product_scores`:

- Produkt-ID
- Score-Typ
- Score-Wert
- Grade
- Confidence
- Regelversion
- Positivgruende
- Negativgruende
- fehlende Daten
- berechnet am

## 9. Publishability und Datenqualitaet

Nicht jedes importierte Produkt darf automatisch oeffentlich sichtbar werden.

### Publishability-Status

- `imported`: Rohdaten wurden importiert
- `draft`: Produkt ist intern sichtbar, aber unvollstaendig
- `reviewable`: genug Daten fuer interne Pruefung
- `published`: Produkt darf oeffentlich erscheinen
- `ranking_eligible`: Produkt darf in Rankings verwendet werden
- `blocked`: Produkt ist irrefuehrend, doppelt, defekt oder rechtlich riskant

### Mindestanforderungen fuer Produktseiten

Ein Produkt darf als `published` gelten, wenn mindestens vorhanden:

- Produktname
- Kategorie oder hinreichend sichere Kategoriezuordnung
- Naehrwerte pro 100 g/ml
- Quelle und Importzeitpunkt
- stabile Produkt-URL
- keine Blocker-Flags

### Mindestanforderungen fuer Ranking-Faehigkeit

Ein Produkt darf als `ranking_eligible` gelten, wenn zusaetzlich vorhanden:

- alle fuer den Ranking-Score erforderlichen Naehrwerte
- ausreichende Score-Confidence
- keine kritischen fehlenden Felder fuer das Ranking-Kriterium
- keine offensichtliche Dublette
- Kategoriezuordnung mit hoher Sicherheit

### Datenqualitaets-Flags

- fehlender Produktname
- fehlende Marke
- fehlende Naehrwerte
- unplausible Naehrwerte
- fehlende Zutatenliste
- fehlende Allergene
- unsichere Kategorie
- fehlendes Bild
- moegliche Dublette
- veralteter Import
- widerspruechliche Einheit
- Quelle unklar

Fehlerhafte Datensaetze werden isoliert und protokolliert, nicht stillschweigend veroeffentlicht.

## 10. Scoring

Scores muessen transparent, versioniert und kategoriespezifisch sein.

### Basisscores

- Nutrition Score
- Ingredient Quality Score
- Protein Score
- Low Sugar Score
- Family Score
- Vegan Score
- Overall Match Score

Es gibt keine universelle Gesundheitspunktzahl fuer alle Produktarten. Ein Joghurt und ein Olivenoel brauchen unterschiedliche Bewertungslogiken.

### Score-Prinzipien

- Regeln versionieren
- einzelne Faktoren offenlegen
- fehlende Daten nicht als Null interpretieren
- Unsicherheit anzeigen
- Score niemals als medizinische Aussage darstellen
- Score immer im Kategorie- und Zielkontext erklaeren
- Score-Ausgaben testbar und reproduzierbar machen

### Score Output Contract

Jeder Score gibt nicht nur eine Zahl zurueck:

```ts
type ProductScore = {
  score: number | null;
  grade: "excellent" | "good" | "okay" | "weak" | "unknown";
  confidence: "high" | "medium" | "low";
  positives: string[];
  negatives: string[];
  missingData: string[];
  ruleVersion: string;
};
```

### Kategorie-Regeln im MVP

Fuer jede Startkategorie werden vor UI-Finalisierung festgelegt:

- Score-Formel
- benoetigte Felder
- Gewichtung
- Umgang mit fehlenden Daten
- Confidence-Regeln
- Textbausteine fuer Erklaerungen
- Testprodukte mit erwarteten Ergebnissen

### Beispiel: Low Sugar Score

Der Low Sugar Score bewertet Zucker nur im Kategorie-Kontext.

- Hafermilch: Zucker pro 100 ml, Zusatz von Zucker/Sirup, "ohne Zuckerzusatz"-Label
- Muesli: Zucker pro 100 g, getrocknete Fruechte separat kennzeichnen, Suessungsmittel markieren
- Proteinriegel: Zucker pro 100 g und pro Riegel, Zuckeralkohole und Suessstoffe gesondert anzeigen
- Joghurt/Skyr: Zucker pro 100 g, Fruchtzubereitung und zugesetzter Zucker unterscheiden, wenn Datenlage es erlaubt

## 11. Ranking-Logik

Ranking-Seiten sind nur dann indexierbar, wenn sie eine echte Suchintention und ausreichend Datenqualitaet haben.

### Indexierbare Ranking-Seiten

Eine Ranking-Seite darf indexiert werden, wenn:

- mindestens 20 passende Produkte vorhanden sind
- mindestens 10 Produkte hohe oder mittlere Score-Confidence haben
- das Ranking-Kriterium eindeutig ist
- die Sortierung erklaerbar ist
- keine excessive Marken- oder Produktduplikation vorliegt
- ein einzigartiges Intro und eine datenbasierte Auswertung vorhanden sind
- interne Links zu Produkten, Alternativen und verwandten Rankings vorhanden sind
- eine stabile URL existiert

### Noindex oder nicht generieren

Eine Ranking-Seite wird `noindex` oder gar nicht erzeugt, wenn:

- zu wenige Produkte vorhanden sind
- die Suchintention unklar ist
- die Filterkombination zu duenn oder beliebig ist
- zu viele fehlende Daten die Aussage unsicher machen
- kein sinnvoller Unterschied zwischen Produkten sichtbar wird

## 12. SEO-Architektur

### Seitentypen

- `/product/[slug]`
- `/category/[slug]`
- `/best/[attribute]/[category]`
- `/compare/[product-a]-vs-[product-b]`
- `/brand/[slug]`
- `/ingredient/[slug]`
- `/nutrition/[attribute]`
- `/finder`

### Suchintentionen

- bestes Produkt
- gesund/ungesund im Kontext
- Alternative
- Vergleich
- ohne bestimmte Zutat
- hoher oder niedriger Naehrwert
- geeignet fuer Zielgruppe

### Kontrollierte Indexierung

Nicht jede Filterkombination wird indexiert. Indexiert werden nur Seiten mit:

- ausreichender Produktanzahl
- eindeutiger Suchintention
- einzigartigem Intro
- echter Datenauswertung
- stabiler URL
- interner Verlinkung
- akzeptabler Datenqualitaet

### Technische SEO-Regeln

- Canonical-URL fuer jede indexierbare Seite
- `noindex` fuer schwache, doppelte oder temporaere Seiten
- Sitemap nur fuer indexierbare Seiten
- Slugs muessen stabil sein
- Slug-Aenderungen erzeugen Redirects
- `slug_history` verhindert kaputte interne Links
- Facetten-URLs werden strikt whitelisted
- Pagination bekommt klare Canonical- und Link-Regeln
- strukturierte Daten nur dort einsetzen, wo sie sauber belegbar sind

## 13. UI/UX

### Stil

- helle, vertrauenswuerdige Oberflaeche
- grosse Produktbilder
- klare Typografie
- wenige Farben
- mobil zuerst
- Scores mit Textbegruendung, nicht nur Kreise oder Ampeln
- Datenqualitaet sichtbar, aber nicht alarmistisch

### Wichtige Komponenten

- Product Card
- Comparison Table
- Score Breakdown
- Ingredient Chips
- Filter Drawer
- Best Choice Badge
- Alternative Carousel
- Affiliate CTA
- Data Quality Notice
- Ranking Reason Row
- Publishability/Admin Debug Panel nur intern

### UX-Prinzip

Der Nutzer soll innerhalb weniger Sekunden verstehen:

1. Ist das Produkt fuer mich geeignet?
2. Warum?
3. Welche bessere Alternative gibt es?

## 14. Technische Architektur

### Stack

- Next.js mit App Router und TypeScript
- Supabase Postgres
- GitHub Actions fuer Import und Aktualisierung
- Vercel fuer Hosting
- Objekt-Speicher nur bei Bedarf

### Grundsatz

Keine externen Live-API-Aufrufe beim Seitenaufruf. Alle Daten werden importiert, normalisiert und aus der eigenen Datenbank ausgeliefert.

### Rendering

- ueberwiegend statische Seiten
- ISR fuer haeufig aktualisierte Produkte
- Server Components
- optimierte Bilder
- minimale Client-JavaScript-Menge
- paginierte Kategorien
- gecachte Datenbankabfragen
- materialisierte Views fuer Rankings und haeufige Filterkombinationen

## 15. ETL

GitHub Actions oder ein vergleichbarer geplanter Job fuehrt aus:

- inkrementeller Produktimport
- Quellen-Snapshot speichern
- Normalisierung von Einheiten und Kategorien
- Zutaten- und Allergen-Mapping
- Dubletten-Erkennung
- Publishability-Checks
- Score-Neuberechnung
- Qualitaetspruefung
- Aktualisierung von Rankings
- Sitemap-Generierung

### Import-Run Logging

Jeder Importlauf speichert:

- Startzeit und Endzeit
- Quelle
- importierte Produkte
- neue Produkte
- aktualisierte Produkte
- gesperrte Produkte
- Fehler
- Warnungen
- Score-Neuberechnungen
- generierte oder entfernte SEO-Seiten

## 16. Analytics und KPIs

### Produkt- und SEO-KPIs

- organische Landingpages mit Impressionen
- Klickrate in Suchergebnissen
- indexierte Seiten vs. generierte Seiten
- Ranking- und Vergleichsnutzung
- Finder-Nutzung
- Affiliate-Klickrate
- Anteil von Produktseiten mit Alternativen
- Datenvollstaendigkeit
- Anteil ranking-faehiger Produkte pro Kategorie

### Operative KPIs

- Import-Erfolgsrate
- Produkte mit kritischen Datenqualitaetsfehlern
- Score-Confidence-Verteilung
- Rankings mit zu wenigen Produkten
- veraltete Produktdaten
- defekte Bild-URLs
- Redirect- und Slug-Probleme

## 17. Tests und Qualitaetssicherung

### Testarten

- Unit Tests fuer Scoring-Regeln
- Unit Tests fuer Normalisierung von Naehrwerten, Einheiten, Kategorien und Slugs
- Fixture Tests mit bekannten Produkten und erwarteten Scores
- Integration Tests fuer Importpipeline
- Snapshot Tests fuer SEO-URLs, Canonicals und Sitemap-Eintraege
- Playwright Tests fuer Produktseite, Kategorie, Ranking und Vergleich
- Datenqualitaets-Regressionstests

### Testdaten

Der MVP braucht ein kleines, versioniertes Seed-Dataset fuer:

- Hafermilch
- Proteinriegel
- Muesli
- Joghurt/Skyr
- vegane Snacks

Dieses Dataset dient dazu, Scoring, UI, Rankings und SEO deterministisch zu testen.

## 18. Interne Admin- und Debug-Funktionen

Vor oder parallel zum Launch sollte es einfache interne Kontrollmoeglichkeiten geben:

- Import-Run-Uebersicht
- Produktstatus ansehen
- Publishability-Gruende ansehen
- Score-Breakdown debuggen
- Ranking-Zusammensetzung pruefen
- Datenqualitaetsflags filtern
- blockierte Produkte pruefen
- Slug- und Redirect-Historie kontrollieren

Das kann zunaechst als geschuetzte interne Route oder einfache Supabase-Ansicht umgesetzt werden.

## 19. Roadmap

### Phase 1 - belastbare Basis

- Repository, CI, Linting, Tests
- Supabase-Schema und Migrationen
- Seed-Dataset fuer Startkategorien
- Import-Pipeline
- Normalisierung
- Publishability-Checks
- grundlegende Scores
- Produktseiten
- Kategorie-Seiten
- erste Ranking-Seiten
- einfache Vergleiche

### Phase 2 - SEO-Wachstum

- hunderte kuratierte Programmatic-SEO-Seiten
- Marken- und Zutatenwelten
- staerkere interne Verlinkung
- Affiliate-Integration
- automatisierte Content-Qualitaetsregeln
- bessere Slug-, Redirect- und Sitemap-Automation

### Phase 3 - Decision Engine

- fortgeschrittener Finder
- kategoriespezifische Match-Scores
- bessere Alternativen
- persoenliche Praeferenzen ohne zwingenden Account
- Ersatzprodukt-Logik

### Phase 4 - Plattform

- mehrere Laender und Sprachen
- Haendlerpreise
- Barcode-Scan
- API und Widgets
- B2B-Datenprodukte

## 20. Coding-Agent-Reihenfolge

Empfohlene Reihenfolge fuer die Implementierung:

1. Repository, CI, Linting, Tests
2. Supabase-Schema und Migrationen
3. Seed-Dataset fuer 3 bis 5 Kategorien
4. Import-Pipeline
5. Normalisierung und Publishability-Checks
6. Scoring Engine
7. Produktseiten
8. Kategorie-Seiten
9. Ranking-Seiten
10. Vergleichsseiten
11. SEO, Sitemap, Canonical und Noindex
12. Analytics und Affiliate Tracking
13. Finder
14. Internationalisierung

Die Scoring Engine kommt vor dem Grossteil der UI, weil Produktseiten, Rankings und Vergleiche auf erklaerbaren Score-Objekten beruhen.

## 21. Definition of Done

Das Vollprodukt gilt als erreicht, wenn:

- Produkt-, Kategorie-, Ranking- und Vergleichsseiten skalierbar generiert werden
- Scores nachvollziehbar, versioniert und getestet sind
- Datenqualitaet automatisch geprueft wird
- schwache oder unsichere Seiten nicht indexiert werden
- organischer Traffic und Affiliate-Klicks messbar sind
- neue Kategorien ohne grundlegenden Umbau ergaenzt werden koennen
- neue Laender und Sprachen architektonisch vorbereitet sind
- Lizenz-, Attribution-, Affiliate- und Health-Disclaimer sauber umgesetzt sind

## 22. Launch-Kriterien fuer MVP

Der MVP darf live gehen, wenn:

- mindestens drei Startkategorien mit echten Produkten gefuellt sind
- jede oeffentliche Produktseite einen Datenqualitaetsstatus zeigt
- mindestens fuenf Ranking-Seiten indexierbar sind
- alle indexierbaren Seiten Canonicals haben
- Sitemap nur hochwertige Seiten enthaelt
- Scoring-Regeln fuer die Startkategorien versioniert und getestet sind
- Import-Fehler sichtbar protokolliert werden
- Affiliate-Links klar gekennzeichnet sind
- Open-Food-Facts-Attribution sichtbar vorhanden ist
- rechtliche Hinweise zu Datenqualitaet, Allergenen und Ernaehrungsinformationen vorhanden sind

## 23. Offene Entscheidungen vor Implementierungsstart

Diese Entscheidungen sollten vor dem ersten Coding-Sprint final beantwortet werden:

- Soll der MVP strikt deutschsprachig sein oder intern bereits englische Felder mitfuehren?
- Welche drei Startkategorien werden zuerst gebaut?
- Welche Score-Typen sind fuer jede Startkategorie wirklich noetig?
- Welche Datenqualitaetsregeln blockieren Veroeffentlichung?
- Welche Ranking-Seiten sollen die ersten fuenf indexierbaren Seiten sein?
- Wird Produktbild-Hosting direkt von Open Food Facts genutzt oder werden Bilder gespiegelt?
- Welche Analytics-Loesung wird verwendet?
- Welche Affiliate-Netzwerke oder Haendler sind fuer den MVP relevant?
- Wie wird Open-Food-Facts-Attribution konkret im UI und im Datenexport dargestellt?

## 24. Quellenhinweise

- Open Food Facts API Documentation: https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/
- Open Food Facts License Guidance: https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/license-be-on-the-legal-side/
- Open Food Facts Documentation Overview: https://openfoodfacts.github.io/documentation/docs/

## 25. Umsetzungsstand der Produktbasis

Die aktuelle Implementierung deckt die technische Vollprodukt-Basis ab:

- 12 erweiterbare Kategorien und 24 reglementierte Ranking-Kandidaten
- kategoriespezifische, versionierte und erklaerbare Scores
- Produkt-, Kategorie-, Ranking-, Vergleichs-, Marken-, Zutaten- und
  Naehrwertseiten
- fortgeschrittener Finder mit harten Filtern, Match-Score und Begruendungen
- Alternativen, Favoriten, lokale Einkaufsliste und lokale Praeferenzen
- Barcode-Suche per Kamera oder manueller GTIN
- Kamera- und Barcode-Verarbeitung ausschließlich lokal ohne Bild-, Video- oder
  GTIN-Übertragung; Kameraerlaubnis nur auf den Scanner-Routen
- zweisprachige Datenschutzseite mit standardmäßig deaktivierter optionaler
  Nutzungsstatistik und Kontrolle über alle lokal gespeicherten App-Daten
- CSP, Permissions Policy, HSTS, Clickjacking-Schutz und abgesicherte JSON-APIs
- sichtbarer Quellenstand, Katalogimport, Datenfrische und verwendete
  Score-Regelversionen auf jeder Produktseite
- datensparsame Produktdaten-Meldungen ohne Konto oder Kontaktdaten mit
  geschützter Supabase-Prüfwarteschlange
- serverseitige Newsletter-Einwilligung und datensparsame Ereignismessung
- gekennzeichnete Affiliate-Angebote, sofern aktive Angebote vorliegen
- Supabase-Import, Normalisierung, Publishability, statischer Export und
  Vercel-Deploy-Hook als durchgaengige Pipeline

Bewusst noch nicht als abgeschlossen gelten echte Marktabdeckung,
SEO-Freigaben, Haendlerpreise, Benutzerkonten, mehrere Laender und B2B-APIs.
Diese Punkte benoetigen reale Datenmenge, redaktionelle Freigabe,
Partnervertraege oder weitere Produktphasen und duerfen nicht durch Demo-Daten
simuliert werden.
