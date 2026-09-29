# Schnittstelle: Daten für den Peptid-Wochenbogen

Der Nährwert-Rechner schreibt seine Daten als JSON-Dateien in ein **privates**
GitHub-Repository. Jedes andere Programm, das denselben Zugriffsschlüssel hat, kann
sie lesen — gedacht ist vor allem der Peptid-Wochenbogen.

Es gibt zwei Wege:

1. **Fertiges Lesemodul** — `schnittstelle/naehrwert-quelle.js` in den Wochenbogen
   kopieren (eine Datei, keine Abhängigkeiten). Empfohlen.
2. **Dateien selbst lesen** — das Format unten ist stabil und versioniert.

Geschrieben wird nur vom Nährwert-Rechner. Der Wochenbogen liest nur, damit genau
eine Stelle das Format verantwortet.

---

## 1. Lesemodul

```js
import { naehrwertQuelle } from './naehrwert-quelle.js';

const q = naehrwertQuelle({
  owner: 'Aphexx100',
  repo: 'naehrwert-daten',
  branch: 'main',          // Vorgabe
  pfad: 'naehrwerte',      // Vorgabe
  token                    // derselbe Fine-grained Token wie für peptid-daten,
});                        // wenn er beide Repositories umfasst

const w = await q.woche('2026-10-03');   // 7 Tage bis einschließlich Schlüssel
```

`woche(schluessel)` passt zum Wochenschlüssel des Wochenbogens (Datum des
Erfassungstags = letzter Tag der Woche). Rückgabe:

| Feld | Bedeutung |
|---|---|
| `von`, `bis` | Zeitraum (YYYY-MM-DD) |
| `tageErfasst` | Tage mit Mahlzeiten oder Vitalwerten |
| `tageMitMahlzeiten` | Tage mit mindestens einer Zutat — Nenner der Mittelwerte |
| `summe[key]` | Summe über den Zeitraum |
| `mittel[key]` | Mittel je erfasstem Esstag |
| `ziele[key]` | Tagesziele (vom jüngsten Tag) |
| `anteilMittel[key]` | `mittel` in % des Ziels |
| `vitalMittel[key]` | Mittel eines Vitalwerts über die Tage, an denen er erfasst ist |
| `vitalLetzter[key]` | `{ datum, wert }` der letzten Messung |
| `tage[]` | je Tag `{ datum, summe, anteil, vital }` für eigene Grafiken |

Weitere Methoden: `tag(datum)`, `tage(von, bis)`, `zusammenfassung(von, bis)`,
`produkte()`, `config()`, `schema()`. Die reine Rechnung `fasseZusammen(tage, von, bis)`
ist zusätzlich exportiert, falls die Tage schon anderweitig geladen sind.

Beispiel für den Wochenbogen — Kupfer aus der Nahrung neben der GHK-Cu-Zufuhr:

```js
const w = await q.woche(state.weekKey);
w.mittel.copper          // mg/Tag aus Lebensmitteln
w.anteilMittel.copper    // % der Referenzmenge (1 mg)
w.mittel.zinc            // Zink ist der Gegenspieler — gleich mit anzeigen
```

Liest das Modul ein neueres Datenformat, als es kennt, bricht es mit einer klaren
Meldung ab statt falsch zu rechnen (`UNTERSTUETZTE_VERSION`).

---

## 2. Dateien im Datenrepository

```
naehrwerte/
  schema.json                 Katalog: Schlüssel, Einheiten, Namen (de/en), Vorgabeziele, Formatversion
  config.json                 Tagesziele, Haushaltsmaße, Mahlzeiten, Vitalwert-Auswahl
  produkte.json               alle Produkte (ohne Fotos)
  bilder/<produkt-id>.jpg     Foto je Produkt (optional)
  tage/2026/2026-09-29.json   ein Tag je Datei, nach Jahr gegliedert
```

### Tag — `tage/YYYY/YYYY-MM-DD.json`

```json
{
  "schema": "naehrwert/tag/1",
  "version": 1,
  "datum": "2026-09-29",
  "mahlzeiten": [
    {
      "id": "m-…", "name": "fruehstueck", "titel": "Frühstück",
      "eintraege": [
        {
          "id": "e-…", "produkt": "p-speisequark-…", "name": "Speisequark Magerstufe",
          "marke": "Gut & Günstig", "menge": 3, "einheit": "EL",
          "gramm": 60, "ml": 57.1,
          "n": { "energy_kcal": 39, "protein": 7.2, "fat": 0.12, … }
        }
      ]
    }
  ],
  "vital": { "gewicht": 82.4, "rr_sys": 128, "puls": 61 },
  "notiz": "",
  "gramm": 266,
  "summe":  { "energy_kcal": 133, "protein": 14, "calcium": 240, … },
  "ziele":  { "energy_kcal": 2000, "protein": 50, "calcium": 800, … },
  "anteil": { "energy_kcal": 6.7, "protein": 28, "calcium": 30, … },
  "geaendert": "2026-09-29T08:14:03.000Z"
}
```

Wichtig für Leser:

- **`summe` und `anteil` sind fertig gerechnet.** Wer nur Tageswerte braucht, muss
  weder Produkte noch Einheiten kennen.
- **`eintraege[].n` ist eine Momentaufnahme.** Wird ein Produkt später korrigiert,
  bleiben vergangene Tage unverändert.
- **Fehlende Schlüssel heißen „keine Angabe“, nicht 0.** Packungen nennen meist nur
  Energie, Fett, gesättigte Fettsäuren, Kohlenhydrate, Zucker, Eiweiß und Salz.
  Ein Vitamin-Wert in `summe` ist deshalb eine Untergrenze, sobald eine Zutat ihn
  nicht angibt. Wer es genau wissen will, zählt in `eintraege[].n` nach.
- **`ziele` gehören zum Tag.** Ändert man seine Ziele, behalten alte Tage ihre.
- `mahlzeiten[].name` ist ein Schlüssel (`fruehstueck`, `mittag`, `abend`, `snack`)
  oder ein frei gewählter Name; `titel` ist die Anzeige in der Sprache beim Speichern.
- Leere Tage (keine Zutat, kein Vitalwert) gibt es als Datei normalerweise nicht;
  falls doch, zählen sie in keinem Mittelwert.

### Nährstoffschlüssel

Einheit ist die im Katalog (`schema.json` → `naehrstoffe[].unit`). Auswahl:

| Schlüssel | Einheit | Ziel | Art |
|---|---|---|---|
| `energy_kcal` / `energy_kj` | kcal / kJ | 2000 / 8400 | Richtwert |
| `fat`, `sat_fat`, `mono_fat`, `poly_fat` | g | 70, ≤ 20, –, – | |
| `carbs`, `sugar`, `polyols`, `starch` | g | 260, ≤ 90, –, – | |
| `fiber` | g | 30 | erreichen |
| `protein` | g | 50 | Richtwert |
| `salt` / `sodium` | g / mg | ≤ 6 / ≤ 2400 | höchstens |
| `cholesterol` | mg | ≤ 300 | höchstens |
| `vit_a`, `vit_d`, `vit_k`, `biotin`, `folate`, `vit_b12` | µg | 800, 5, 75, 50, 200, 2,5 | erreichen |
| `vit_e`, `vit_c`, `vit_b1`, `vit_b2`, `niacin`, `pantothen`, `vit_b6` | mg | 12, 80, 1,1, 1,4, 16, 6, 1,4 | erreichen |
| `potassium`, `chloride`, `calcium`, `phosphorus`, `magnesium` | mg | 2000, 800, 800, 700, 375 | erreichen |
| `iron`, `zinc`, `copper`, `manganese`, `fluoride` | mg | 14, 10, 1, 2, 3,5 | erreichen |
| `selenium`, `chromium`, `molybdenum`, `iodine` | µg | 55, 40, 50, 150 | erreichen |

Ziele sind die Referenzmengen der LMIV (EU 1169/2011, Anhang XIII) — dieselbe Basis wie
„% RM“ auf Packungen; Ballaststoffe nach DGE. Die im Rechner eingestellten Ziele
stehen in `config.json` → `ziele` (nur Abweichungen) und je Tag in `ziele`.

### Vitalwerte

`gewicht` (kg), `koerperfett` (%), `bauchumfang` (cm), `rr_sys` / `rr_dia` (mmHg),
`puls` (/min), `glukose` (mg/dl), `temperatur` (°C), `spo2` (%), `schlaf` (h),
`wasser` (ml), `schritte`.

### Produkt — Eintrag in `produkte.json` → `produkte[id]`

```json
{
  "schema": "naehrwert/produkt/1",
  "id": "p-speisequark-magerstufe-…",
  "name": "Speisequark Magerstufe, laktosefrei",
  "marke": "Gut & Günstig",
  "ean": "",
  "basis": "g",                         // Werte je 100 g ("ml": je 100 ml)
  "naehrwerte": { "energy_kcal": 65, … },
  "packung": { "menge": 250, "einheit": "g" },
  "dichte": 1.05,                       // g/ml, für ml ↔ g
  "el_g": 20, "tl_g": null,             // eigenes Löffelgewicht
  "portionen": [{ "name": "Scheibe", "g": 25 }],
  "quelle": { "art": "foto|openfoodfacts|usda|claude-recherche|manuell|rezept", "ref": "…", "datum": "…" },
  "bild": true,                         // Foto liegt unter bilder/<id>.jpg
  "angelegt": "…", "geaendert": "…"
}
```

---

## Zugriff einrichten

Am einfachsten **ein** Fine-grained Token für beide privaten Repositories:
GitHub → Settings → Developer settings → Fine-grained tokens → den bestehenden Token
des Wochenbogens bearbeiten → *Repository access* um `naehrwert-daten` erweitern.
Für den Wochenbogen reicht Lesen; der Nährwert-Rechner braucht *Contents: Read and
write*.

Alternative ohne zweites Repository: im Rechner als Daten-Repository `peptid-daten`
mit Unterordner `naehrwerte` eintragen. Dann liegen beide Datenbestände nebeneinander
im selben privaten Repository, und der vorhandene Token genügt.

## Versionierung

`schema.json` → `version` wird nur bei einer **inkompatiblen** Änderung des
Tagesformats erhöht. Neue Nährstoffe oder Vitalwerte sind kompatibel — ein Leser, der
einen Schlüssel nicht kennt, ignoriert ihn einfach.
