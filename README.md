# Nährwert-Rechner · Nutrient Calculator

Nährwerte und Vitalwerte eines Tages erfassen — zweisprachig (Deutsch/Englisch),
auf dem Handy bedienbar, mit gesicherter Ablage in einem privaten GitHub-Repository.

- **Packung fotografieren** — Claude liest die Nährwerttabelle (auch Name, Füllmenge,
  Barcode) und schlägt Dichte und Löffelgewicht vor. Mit Barcode ergänzt Open Food
  Facts fehlende Werte. Nichts wird ungesehen gespeichert: jedes Ergebnis landet erst
  im Editor.
- **Recherchieren** — Open Food Facts (Markenprodukte, Barcode), USDA FoodData Central
  (Grundnahrungsmittel mit Vitaminen/Mineralstoffen), Claude-Websuche (alles andere,
  mit Quellen).
- **Mengen wie in der Küche** — g, kg, ml, l, EL, TL, Tasse, Glas, Prise, Packung und
  eigene Portionen. Umgerechnet über das Löffelgewicht bzw. die Dichte des Produkts.
- **Tagessumme** — Energie, Makronährstoffe, Ballaststoffe, 13 Vitamine, 15
  Mineralstoffe, jeweils absolut und in % des Tagesbedarfs. Fehlt eine Angabe bei
  einzelnen Zutaten, steht „≥“ davor und wie viele Zutaten ohne Angabe sind.
- **Vitalwerte** — Gewicht, Blutdruck, Puls, Blutzucker, Schlaf, Wasser u. a.
- **Verlauf** — jede Größe über 7 bis 365 Tage, Durchschnitt aller Nährstoffe, CSV.
- **Rezepte** — eine Mahlzeit als eigenes Produkt speichern (Werte je 100 g).
- **Schnittstelle** zum Peptid-Wochenbogen: [docs/SCHNITTSTELLE.md](docs/SCHNITTSTELLE.md).

## Starten

```bash
npm install
npm start            # http://localhost:8090/
```

Ohne weitere Einrichtung läuft alles im Browser. Für die gesicherte Ablage und das
Foto-Auslesen: [docs/SETUP.md](docs/SETUP.md).

## Prüfen

```bash
npm run check        # Unit-Tests + Einzeldatei bauen + Browser-Rauchtest
```

Der Rauchtest ersetzt GitHub, Claude und Open Food Facts durch Attrappen und prüft den
ganzen Weg vom Foto bis zur Datei im Repository — ohne Netz und ohne Kosten.

## Aufbau

Wie der Peptid-Wochenbogen: kein Framework, keine Laufzeitabhängigkeit, ES-Module
direkt im Browser. esbuild und Playwright braucht nur, wer baut oder testet.

```
index.html                 nur Struktur
src/css/                   tokens.css (alle Farben, hell/dunkel), app.css
src/js/
  naehrstoffe.js           DER Nährstoffkatalog: Schlüssel, Einheiten, Namen, Ziele, Quellen-Zuordnung
  vitalwerte.js            Liste der Vitalwerte
  masse.js                 EL/TL/Tasse … → Gramm und Milliliter
  rechnen.js               reine Rechnung (Node-testbar)
  aktionen.js              Änderungen an Tagen und Produkten, verzögertes Speichern
  i18n.js                  Deutsch/Englisch
  storage/                 local, github, index (Fassade)
  quellen/                 claude (Foto, Websuche), openfoodfacts, usda, bild
  ui/                      tag, produkte, vital, verlauf, setup, status, naehrtabelle
schnittstelle/             naehrwert-quelle.js — Lesemodul für den Wochenbogen
scripts/                   serve, build-single, unit-test, smoke-test, github-attrappe
```

Neue Nährstoffe oder Vitalwerte sind eine Zeile in `naehrstoffe.js` bzw.
`vitalwerte.js`; Formular, Tabellen, Verlauf, CSV und `schema.json` lesen dieselbe Liste.

## Hinweis

Eine Rechenhilfe, keine Ernährungs- oder medizinische Beratung. Haushaltsmaße und
Dichten sind Näherungen; Packungsangaben selbst haben Toleranzen.
