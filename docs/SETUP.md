# Einrichtung

Wie beim Wochenbogen zwei Repositories, weil sie unterschiedliche Sichtbarkeit brauchen:

| Repository | Sichtbarkeit | Inhalt |
|---|---|---|
| `naehrwert-rechner` | öffentlich | die Seite — Code, keine Daten (GitHub Pages) |
| `naehrwert-daten` | **privat** | Produkte, Tage, Vitalwerte als JSON |

Gesundheitsdaten liegen nie im öffentlichen Repository. Die Seite holt sie zur Laufzeit
mit einem Zugriffsschlüssel, der nur im Browser steht.

## 1. Code veröffentlichen

```bash
git remote add origin git@github.com:DEIN-NAME/naehrwert-rechner.git
git push -u origin main
```

GitHub → Settings → Pages → *Deploy from a branch* → `main` / `/ (root)`.
Danach unter `https://DEIN-NAME.github.io/naehrwert-rechner/`.

## 2. Daten-Repository

Neues Repository `naehrwert-daten`, **Private**, mit README initialisieren (damit es
einen `main`-Branch gibt). Die Ordner legt der Rechner selbst an.

*Alternative:* das vorhandene `peptid-daten` mit Unterordner `naehrwerte` benutzen —
dann entfällt Schritt 3.

## 3. Zugriffsschlüssel

GitHub → Settings → Developer settings → Fine-grained tokens. Am einfachsten den Token
des Wochenbogens bearbeiten und `naehrwert-daten` zur Repository-Auswahl hinzufügen.
Berechtigung: **Contents: Read and write**, sonst nichts.

## 4. Im Rechner eintragen

Seite öffnen → **Setup** → *Datenablage*: Benutzer, `naehrwert-daten`, Branch `main`,
Unterordner `naehrwerte`, Token. **Verbindung prüfen** (warnt, falls das Repository
öffentlich ist), dann **Ablage speichern**. Schon lokal Erfasstes schiebt **Lokale Daten
hochladen** einmalig hinüber.

## 5. Fotos auslesen und Websuche

Setup → *Claude*: eigener Anthropic-Schlüssel (console.anthropic.com, Abrechnung nach
Verbrauch). Modell-Vorgabe `claude-opus-5-5`. Ein Etikett kostet grob einige Cent. Die Anfrage bittet um den serverseitigen Fallback: lehnt das Modell eine Anfrage
ab, springt automatisch ein anderes ein.

Der Schlüssel liegt im `localStorage` dieses Browsers und geht nur an
`api.anthropic.com`. Für eine private Seite mit einem Nutzer vertretbar; auf fremden
Rechnern nicht eintragen.

USDA läuft ohne Schlüssel mit `DEMO_KEY` (wenige Abfragen pro Stunde). Ein kostenloser
Schlüssel von <https://api.data.gov/signup/> hebt die Grenze.

## Zweites Gerät

Seite öffnen, Setup, GitHub-Felder und Schlüssel eintragen. Alles andere kommt aus dem
Repository.

## Wenn etwas klemmt

- **„lokal gespeichert, GitHub nicht erreicht“** — die Eingabe ist im Browser sicher;
  meist ist der Token abgelaufen. Neuen eintragen, dann speichert die nächste Änderung
  hoch.
- **Foto wird nicht gelesen** — Tabelle schärfer und gerader fotografieren, Blendung
  vermeiden; im Zweifel Werte im Editor von Hand korrigieren.
- **Open Food Facts findet nichts** — die Suche dort ist zeitweise überlastet;
  Barcode-Abfrage oder Claude-Websuche nehmen.
