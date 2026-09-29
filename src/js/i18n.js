/* Zweisprachigkeit Deutsch/Englisch.

   Statisches HTML traegt data-i18n (Text), data-i18n-ph (Platzhalter) und
   data-i18n-aria (aria-label); wendeAn() setzt sie. Alles Dynamische ruft
   t(key, {var}) beim Zeichnen. Fehlt ein Schluessel, kommt der Schluessel
   selbst zurueck — auffaellig genug, um ihn zu bemerken.

   Die Daten selbst sind sprachneutral (Schluessel wie "vit_c", "fruehstueck");
   nur die Anzeige wechselt. */

const K_LANG = 'nwr.lang';

const DE = {
  'app.titel': 'Nährwert-Rechner',
  'tab.tag': 'Tag', 'tab.produkte': 'Produkte', 'tab.vital': 'Vitalwerte', 'tab.verlauf': 'Verlauf', 'tab.setup': 'Setup',
  'status.offlineHinweis': 'Keine Synchronisierung aktiv. Die Daten liegen nur in diesem Browser — unter Setup lässt sich ein privates GitHub-Repository als Ablage eintragen.',
  'status.github': 'GitHub-Ablage', 'status.lokal': 'nur dieses Gerät', 'status.claudeAn': 'Claude bereit', 'status.claudeAus': 'Claude aus',
  'speichern.laeuft': 'speichert …', 'speichern.lokal': 'gespeichert (Gerät)', 'speichern.github': 'gespeichert · GitHub',
  'speichern.sitzung': 'Foto nur in dieser Sitzung', 'speichern.fehler': 'lokal gespeichert, GitHub nicht erreicht',
  'datum.frueher': 'Früherer Tag', 'datum.spaeter': 'Späterer Tag', 'datum.heute': 'Heute',

  'tag.summe': 'Tagessumme', 'tag.gesamtGewicht': '{g} g gegessen', 'tag.vomBedarf': 'des Tagesbedarfs',
  'tag.leer': 'Noch nichts eingetragen. Unten eine Zutat wählen, Menge und Einheit angeben.',
  'tag.alleZeigen': 'Vitamine und Mineralstoffe zeigen', 'tag.wenigerZeigen': 'Nur Hauptnährwerte zeigen',
  'tag.menge': 'Menge', 'tag.einheit': 'Einheit', 'tag.entfernen': 'Zutat entfernen', 'tag.produkt': 'Produkt',
  'tag.produktPh': 'Zutat suchen …', 'tag.produktFehlt': 'Produkt aus der Liste wählen.', 'tag.mengeFehlt': 'Menge angeben.',
  'tag.einheitGehtNicht': 'Diese Einheit passt nicht zum Produkt.', 'tag.hinzu': 'Hinzufügen',
  'tag.keineProdukte': 'Noch keine Produkte angelegt — unter „Produkte“ fotografieren oder recherchieren.',
  'tag.alsRezept': 'Als Rezept speichern', 'tag.rezeptName': 'Name des Rezepts:', 'tag.mahlzeitEntfernen': 'Mahlzeit entfernen',
  'tag.mahlzeitNeu': '+ Mahlzeit', 'tag.mahlzeitName': 'Name der Mahlzeit:', 'tag.notiz': 'Notiz', 'tag.notizPh': 'Besonderheiten des Tages …',
  'mz.fruehstueck': 'Frühstück', 'mz.mittag': 'Mittagessen', 'mz.abend': 'Abendessen', 'mz.snack': 'Zwischendurch',

  'einheit.g': 'g', 'einheit.kg': 'kg', 'einheit.ml': 'ml', 'einheit.l': 'l', 'einheit.EL': 'EL', 'einheit.TL': 'TL',
  'einheit.Tasse': 'Tasse', 'einheit.Glas': 'Glas', 'einheit.Prise': 'Prise', 'einheit.Packung': 'Packung',

  'kurz.protein': 'E', 'kurz.fett': 'F', 'kurz.kh': 'KH',
  'naehr.keineAngabe': 'keine Angabe', 'naehr.luecke': '{n} von {m} Zutaten ohne Angabe',
  'gruppe.energie': 'Energie', 'gruppe.makro': 'Nährwerte', 'gruppe.vitamin': 'Vitamine', 'gruppe.mineral': 'Mineralstoffe',

  'prod.foto': 'Packung fotografieren',
  'prod.fotoHinweis': 'Nährwerttabelle scharf und gerade fotografieren, gern dazu die Vorderseite (Name) und den Barcode — bis zu vier Fotos. Claude liest die Werte aus; du prüfst sie vor dem Speichern.',
  'prod.kamera': 'Kamera', 'prod.datei': 'Fotos wählen', 'prod.lesen': 'Werte auslesen', 'prod.verwerfen': 'Verwerfen',
  'prod.fotoNr': 'Foto {n}', 'prod.fotoEntfernen': 'Foto entfernen', 'prod.fotoBereit': '{n} Foto(s) bereit.',
  'prod.ohneClaude': 'Ohne Anthropic-Schlüssel wird das Foto nur abgelegt; die Werte trägst du selbst ein.',
  'prod.liest': 'Claude liest die Packung … (etwa 10–30 Sekunden)', 'prod.gelesen': 'Gelesen — bitte prüfen und speichern.',
  'prod.gelesenErgaenzt': 'Gelesen, {n} fehlende Werte aus Open Food Facts ergänzt — bitte prüfen.',
  'prod.recherche': 'Recherchieren',
  'prod.rechercheHinweis': 'Open Food Facts: Markenprodukte (auch per Barcode). USDA: Grundnahrungsmittel mit Vitaminen und Mineralstoffen, Suche auf Englisch („oats“, „spinach raw“). Claude-Websuche: alles andere, mit Quellenangabe.',
  'prod.recherchePh': 'z. B. Haferflocken, Kölln Köllnflocken, 4 000 000 000 000', 'prod.quelleClaude': 'Claude-Websuche', 'prod.quelleEan': 'Barcode (EAN)',
  'prod.suchen': 'Suchen', 'prod.sucht': 'Sucht …', 'prod.treffer': '{n} Treffer', 'prod.keineTreffer': 'Nichts gefunden.',
  'prod.je100': 'je 100 {e}', 'prod.anzahlWerte': '{n} Werte', 'prod.uebernehmen': 'Übernehmen',
  'prod.liste': 'Meine Produkte', 'prod.manuell': '+ Manuell', 'prod.filterPh': 'Filtern …',
  'prod.leer': 'Noch keine Produkte.', 'prod.nichtsGefunden': 'Kein Produkt passt zum Filter.',
  'quelle.foto': 'Foto (Claude)', 'quelle.openfoodfacts': 'Open Food Facts', 'quelle.usda': 'USDA', 'quelle.claude-recherche': 'Claude-Websuche',
  'quelle.manuell': 'manuell', 'quelle.rezept': 'Rezept',

  'ed.neu': 'Neues Produkt', 'ed.bearbeiten': 'Produkt bearbeiten', 'ed.abbrechen': 'Schließen', 'ed.hinweise': 'Unsicher',
  'ed.quelle': 'Quelle', 'ed.name': 'Name', 'ed.marke': 'Marke', 'ed.basis': 'Angaben', 'ed.je100g': 'je 100 g', 'ed.je100ml': 'je 100 ml',
  'ed.packung': 'Packung (g/ml)', 'ed.dichte': 'Dichte (g/ml)', 'ed.elG': '1 EL in g', 'ed.tlG': '1 TL in g', 'ed.autoMl': 'aus {ml} ml',
  'ed.portionen': 'Portionen', 'ed.portionenPh': 'Scheibe=25; Stück=60', 'ed.speichern': 'Speichern',
  'ed.offErgaenzen': 'Mit Open Food Facts ergänzen', 'ed.loeschen': 'Löschen', 'ed.nameFehlt': 'Bitte einen Namen angeben.',
  'ed.eanFehlt': 'Erst einen Barcode (EAN) eintragen.', 'ed.ergaenzt': '{n} Werte ergänzt.', 'ed.loeschenFrage': '„{name}“ löschen? Bereits eingetragene Tage behalten ihre Werte.',

  'vital.titel': 'Vitalwerte', 'vital.hinweis': 'Gilt für den oben gewählten Tag. Leere Felder bleiben leer; welche Werte hier stehen, legst du unter Setup fest.',
  'vital.bereich': '{name}: bitte einen Wert zwischen {von} und {bis}.',

  'verlauf.titel': 'Verlauf', 'verlauf.groesse': 'Größe', 'verlauf.zeitraum': 'Tage', 'verlauf.mittel': 'Durchschnitt je Tag',
  'verlauf.mittelHinweis': 'Mittel über die Tage mit eingetragenen Mahlzeiten, bezogen auf den Tagesbedarf.',
  'verlauf.csv': 'CSV exportieren', 'verlauf.leer': 'In diesem Zeitraum ist nichts erfasst.',
  'verlauf.tageErfasst': '{n} von {m} Tagen erfasst', 'verlauf.ueberTage': 'Über {n} Tag(e).', 'verlauf.naehrstoffe': 'Nährstoffe',

  'setup.ablage': 'Datenablage',
  'setup.ablageHinweis': 'Ohne Eintrag bleibt alles in diesem Browser. Mit einem privaten GitHub-Repository sind die Daten gesichert, auf allen Geräten gleich und für den Peptid-Wochenbogen lesbar. Der Schlüssel bleibt in diesem Browser.',
  'setup.backend': 'Ablage', 'setup.backendAuto': 'GitHub, wenn eingerichtet', 'setup.backendGithub': 'GitHub-Repository', 'setup.backendLokal': 'Nur dieses Gerät',
  'setup.owner': 'GitHub-Benutzer', 'setup.ownerPh': 'dein GitHub-Name', 'setup.repo': 'Daten-Repository', 'setup.pfad': 'Unterordner', 'setup.token': 'Zugriffsschlüssel',
  'setup.testen': 'Verbindung prüfen', 'setup.speichern': 'Ablage speichern', 'setup.push': 'Lokale Daten hochladen',
  'setup.prueft': 'Prüft …', 'setup.verbindet': 'Verbindet und lädt …', 'setup.gespeichert': 'Gespeichert, Daten neu geladen.',
  'setup.laedt': 'Lädt hoch … {i}/{m}', 'setup.hochgeladen': 'Hochgeladen: Einstellungen, Produkte und {n} Tage.',
  'setup.ki': 'Claude (Fotos lesen, Websuche)',
  'setup.kiHinweis': 'Ein eigener Anthropic-Schlüssel (console.anthropic.com, Abrechnung nach Verbrauch) — er bleibt in diesem Browser und geht nur an api.anthropic.com. Auf fremden Rechnern besser nicht eintragen.',
  'setup.kiKey': 'Anthropic-Schlüssel', 'setup.kiModell': 'Modell', 'setup.usdaKey': 'USDA-Schlüssel (optional, sonst DEMO_KEY)',
  'setup.schluesselSpeichern': 'Schlüssel speichern', 'setup.schluesselGespeichert': 'Gespeichert.',
  'setup.ziele': 'Tagesziele',
  'setup.zieleHinweis': 'Vorgabe sind die Referenzmengen der EU-Lebensmittelinformationsverordnung — dieselben, auf die sich „% RM“ auf den Packungen bezieht; Ballaststoffe nach DGE (30 g). Leere Felder = Vorgabe. Deine Werte gelten für neue Einträge; frühere Tage behalten ihre Ziele.',
  'setup.zieleSpeichern': 'Ziele speichern', 'setup.zieleVorgabe': 'Auf Vorgabe zurück', 'setup.zieleGespeichert': 'Ziele gespeichert.', 'setup.hoechstens': 'höchstens',
  'setup.masse': 'Haushaltsmaße',
  'setup.masseHinweis': 'Womit EL, TL, Tasse und Glas umgerechnet werden, wenn das Produkt kein eigenes Löffelgewicht hat. Über die Dichte des Produkts wird aus Millilitern Gramm.',
  'setup.mahlzeiten': 'Mahlzeiten', 'setup.mahlzeitenHinweis': 'Mit Komma getrennt; gilt für neue Tage.',
  'setup.vitalAuswahl': 'Angezeigte Vitalwerte', 'setup.cfgSpeichern': 'Einstellungen speichern', 'setup.cfgGespeichert': 'Gespeichert.',
  'setup.sicherung': 'Sicherung', 'setup.sicherungHinweis': 'Eine Datei mit Einstellungen, allen Produkten und allen geladenen Tagen — zum Aufheben oder für ein anderes Gerät.',
  'setup.export': 'Alles als JSON sichern', 'setup.import': 'JSON einspielen', 'setup.keineSicherung': 'keine Sicherungsdatei dieses Rechners',
  'setup.importFrage': '{p} Produkte und {t} Tage einspielen? Gleichnamige Einträge werden ersetzt.', 'setup.importiert': 'Eingespielt.',
  'mass.el_ml': 'Esslöffel (ml)', 'mass.tl_ml': 'Teelöffel (ml)', 'mass.tasse_ml': 'Tasse (ml)', 'mass.glas_ml': 'Glas (ml)', 'mass.prise_g': 'Prise (g)',
  'gh.unvollstaendig': 'Es fehlt: {fehlt}.', 'gh.nicht_gefunden': 'Repository nicht gefunden. Name oder Rechte des Schlüssels prüfen.',
  'gh.kein_schreibrecht': 'Gefunden, aber kein Schreibrecht. Der Schlüssel braucht „Contents: Read and write“.',
  'gh.privat': 'Verbunden mit {name} (privat).', 'gh.oeffentlich': 'Verbunden mit {name} — ACHTUNG: öffentlich! Gesundheitsdaten gehören in ein privates Repository.',
  'gh.fehler': 'Fehler: {text}',

  'fehler.not_granted': 'Kein gültiger Schlüssel — unter Setup eintragen.', 'fehler.rate_limited': 'Zu viele Anfragen, bitte kurz warten.',
  'fehler.network': 'Keine Verbindung.', 'fehler.refusal': 'Die Anfrage wurde abgelehnt.', 'fehler.parse': 'Die Antwort war nicht lesbar — noch einmal versuchen.',
  'fehler.cancelled': 'Abgebrochen.', 'fehler.error': 'Fehler'
};

const EN = {
  'app.titel': 'Nutrient Calculator',
  'tab.tag': 'Day', 'tab.produkte': 'Products', 'tab.vital': 'Vitals', 'tab.verlauf': 'History', 'tab.setup': 'Setup',
  'status.offlineHinweis': 'No sync active. Your data lives only in this browser — under Setup you can add a private GitHub repository as storage.',
  'status.github': 'GitHub storage', 'status.lokal': 'this device only', 'status.claudeAn': 'Claude ready', 'status.claudeAus': 'Claude off',
  'speichern.laeuft': 'saving …', 'speichern.lokal': 'saved (device)', 'speichern.github': 'saved · GitHub',
  'speichern.sitzung': 'photo kept for this session only', 'speichern.fehler': 'saved locally, GitHub unreachable',
  'datum.frueher': 'Previous day', 'datum.spaeter': 'Next day', 'datum.heute': 'Today',

  'tag.summe': 'Daily total', 'tag.gesamtGewicht': '{g} g eaten', 'tag.vomBedarf': 'of daily need',
  'tag.leer': 'Nothing logged yet. Pick an ingredient below and enter amount and unit.',
  'tag.alleZeigen': 'Show vitamins and minerals', 'tag.wenigerZeigen': 'Show main nutrients only',
  'tag.menge': 'Amount', 'tag.einheit': 'Unit', 'tag.entfernen': 'Remove ingredient', 'tag.produkt': 'Product',
  'tag.produktPh': 'Find ingredient …', 'tag.produktFehlt': 'Pick a product from the list.', 'tag.mengeFehlt': 'Enter an amount.',
  'tag.einheitGehtNicht': 'This unit does not fit the product.', 'tag.hinzu': 'Add',
  'tag.keineProdukte': 'No products yet — photograph or look one up under “Products”.',
  'tag.alsRezept': 'Save as recipe', 'tag.rezeptName': 'Recipe name:', 'tag.mahlzeitEntfernen': 'Remove meal',
  'tag.mahlzeitNeu': '+ Meal', 'tag.mahlzeitName': 'Meal name:', 'tag.notiz': 'Note', 'tag.notizPh': 'Anything notable today …',
  'mz.fruehstueck': 'Breakfast', 'mz.mittag': 'Lunch', 'mz.abend': 'Dinner', 'mz.snack': 'Snacks',

  'einheit.g': 'g', 'einheit.kg': 'kg', 'einheit.ml': 'ml', 'einheit.l': 'l', 'einheit.EL': 'tbsp', 'einheit.TL': 'tsp',
  'einheit.Tasse': 'cup', 'einheit.Glas': 'glass', 'einheit.Prise': 'pinch', 'einheit.Packung': 'pack',

  'kurz.protein': 'P', 'kurz.fett': 'F', 'kurz.kh': 'C',
  'naehr.keineAngabe': 'no data', 'naehr.luecke': '{n} of {m} ingredients without data',
  'gruppe.energie': 'Energy', 'gruppe.makro': 'Nutrients', 'gruppe.vitamin': 'Vitamins', 'gruppe.mineral': 'Minerals',

  'prod.foto': 'Photograph a pack',
  'prod.fotoHinweis': 'Take a sharp, straight photo of the nutrition table, ideally also the front (name) and the barcode — up to four photos. Claude reads the values; you check them before saving.',
  'prod.kamera': 'Camera', 'prod.datei': 'Choose photos', 'prod.lesen': 'Read values', 'prod.verwerfen': 'Discard',
  'prod.fotoNr': 'Photo {n}', 'prod.fotoEntfernen': 'Remove photo', 'prod.fotoBereit': '{n} photo(s) ready.',
  'prod.ohneClaude': 'Without an Anthropic key the photo is only stored; you enter the values yourself.',
  'prod.liest': 'Claude is reading the pack … (about 10–30 seconds)', 'prod.gelesen': 'Read — please check and save.',
  'prod.gelesenErgaenzt': 'Read, {n} missing values added from Open Food Facts — please check.',
  'prod.recherche': 'Look up',
  'prod.rechercheHinweis': 'Open Food Facts: branded products (also by barcode). USDA: staple foods with vitamins and minerals. Claude web search: anything else, with sources.',
  'prod.recherchePh': 'e.g. rolled oats, Quaker oats, 4 000 000 000 000', 'prod.quelleClaude': 'Claude web search', 'prod.quelleEan': 'Barcode (EAN)',
  'prod.suchen': 'Search', 'prod.sucht': 'Searching …', 'prod.treffer': '{n} results', 'prod.keineTreffer': 'Nothing found.',
  'prod.je100': 'per 100 {e}', 'prod.anzahlWerte': '{n} values', 'prod.uebernehmen': 'Use',
  'prod.liste': 'My products', 'prod.manuell': '+ Manual', 'prod.filterPh': 'Filter …',
  'prod.leer': 'No products yet.', 'prod.nichtsGefunden': 'No product matches the filter.',
  'quelle.foto': 'Photo (Claude)', 'quelle.openfoodfacts': 'Open Food Facts', 'quelle.usda': 'USDA', 'quelle.claude-recherche': 'Claude web search',
  'quelle.manuell': 'manual', 'quelle.rezept': 'Recipe',

  'ed.neu': 'New product', 'ed.bearbeiten': 'Edit product', 'ed.abbrechen': 'Close', 'ed.hinweise': 'Uncertain',
  'ed.quelle': 'Source', 'ed.name': 'Name', 'ed.marke': 'Brand', 'ed.basis': 'Values', 'ed.je100g': 'per 100 g', 'ed.je100ml': 'per 100 ml',
  'ed.packung': 'Pack (g/ml)', 'ed.dichte': 'Density (g/ml)', 'ed.elG': '1 tbsp in g', 'ed.tlG': '1 tsp in g', 'ed.autoMl': 'from {ml} ml',
  'ed.portionen': 'Portions', 'ed.portionenPh': 'Slice=25; Piece=60', 'ed.speichern': 'Save',
  'ed.offErgaenzen': 'Complete from Open Food Facts', 'ed.loeschen': 'Delete', 'ed.nameFehlt': 'Please enter a name.',
  'ed.eanFehlt': 'Enter a barcode (EAN) first.', 'ed.ergaenzt': '{n} values added.', 'ed.loeschenFrage': 'Delete “{name}”? Days already logged keep their values.',

  'vital.titel': 'Vitals', 'vital.hinweis': 'For the day selected above. Empty fields stay empty; choose which values appear under Setup.',
  'vital.bereich': '{name}: please enter a value between {von} and {bis}.',

  'verlauf.titel': 'History', 'verlauf.groesse': 'Measure', 'verlauf.zeitraum': 'Days', 'verlauf.mittel': 'Average per day',
  'verlauf.mittelHinweis': 'Mean over the days with logged meals, relative to daily need.',
  'verlauf.csv': 'Export CSV', 'verlauf.leer': 'Nothing logged in this period.',
  'verlauf.tageErfasst': '{n} of {m} days logged', 'verlauf.ueberTage': 'Over {n} day(s).', 'verlauf.naehrstoffe': 'Nutrients',

  'setup.ablage': 'Storage',
  'setup.ablageHinweis': 'Without an entry everything stays in this browser. With a private GitHub repository your data is backed up, the same on every device and readable by the peptide weekly sheet. The token stays in this browser.',
  'setup.backend': 'Storage', 'setup.backendAuto': 'GitHub when configured', 'setup.backendGithub': 'GitHub repository', 'setup.backendLokal': 'This device only',
  'setup.owner': 'GitHub user', 'setup.ownerPh': 'your GitHub name', 'setup.repo': 'Data repository', 'setup.pfad': 'Subfolder', 'setup.token': 'Access token',
  'setup.testen': 'Test connection', 'setup.speichern': 'Save storage', 'setup.push': 'Upload local data',
  'setup.prueft': 'Checking …', 'setup.verbindet': 'Connecting and loading …', 'setup.gespeichert': 'Saved, data reloaded.',
  'setup.laedt': 'Uploading … {i}/{m}', 'setup.hochgeladen': 'Uploaded: settings, products and {n} days.',
  'setup.ki': 'Claude (reading photos, web search)',
  'setup.kiHinweis': 'Your own Anthropic key (console.anthropic.com, pay per use) — it stays in this browser and is only sent to api.anthropic.com. Better not to enter it on shared computers.',
  'setup.kiKey': 'Anthropic key', 'setup.kiModell': 'Model', 'setup.usdaKey': 'USDA key (optional, otherwise DEMO_KEY)',
  'setup.schluesselSpeichern': 'Save keys', 'setup.schluesselGespeichert': 'Saved.',
  'setup.ziele': 'Daily targets',
  'setup.zieleHinweis': 'Defaults are the EU reference intakes — the same ones “% RI” on packs refers to; fibre per DGE (30 g). Empty = default. Your values apply to new entries; past days keep their targets.',
  'setup.zieleSpeichern': 'Save targets', 'setup.zieleVorgabe': 'Reset to defaults', 'setup.zieleGespeichert': 'Targets saved.', 'setup.hoechstens': 'at most',
  'setup.masse': 'Household measures',
  'setup.masseHinweis': 'Used to convert tbsp, tsp, cup and glass when the product has no own spoon weight. The product density turns millilitres into grams.',
  'setup.mahlzeiten': 'Meals', 'setup.mahlzeitenHinweis': 'Comma-separated; applies to new days.',
  'setup.vitalAuswahl': 'Vitals shown', 'setup.cfgSpeichern': 'Save settings', 'setup.cfgGespeichert': 'Saved.',
  'setup.sicherung': 'Backup', 'setup.sicherungHinweis': 'One file with settings, all products and all loaded days — to keep or to move to another device.',
  'setup.export': 'Back up everything as JSON', 'setup.import': 'Restore JSON', 'setup.keineSicherung': 'not a backup file of this calculator',
  'setup.importFrage': 'Restore {p} products and {t} days? Entries with the same key are replaced.', 'setup.importiert': 'Restored.',
  'mass.el_ml': 'Tablespoon (ml)', 'mass.tl_ml': 'Teaspoon (ml)', 'mass.tasse_ml': 'Cup (ml)', 'mass.glas_ml': 'Glass (ml)', 'mass.prise_g': 'Pinch (g)',
  'gh.unvollstaendig': 'Missing: {fehlt}.', 'gh.nicht_gefunden': 'Repository not found. Check the name or the token’s access.',
  'gh.kein_schreibrecht': 'Found, but no write access. The token needs “Contents: Read and write”.',
  'gh.privat': 'Connected to {name} (private).', 'gh.oeffentlich': 'Connected to {name} — WARNING: public! Health data belongs in a private repository.',
  'gh.fehler': 'Error: {text}',

  'fehler.not_granted': 'No valid key — add one under Setup.', 'fehler.rate_limited': 'Too many requests, please wait a moment.',
  'fehler.network': 'No connection.', 'fehler.refusal': 'The request was declined.', 'fehler.parse': 'The answer could not be read — please try again.',
  'fehler.cancelled': 'Cancelled.', 'fehler.error': 'Error'
};

const TEXTE = { de: DE, en: EN };
let lang = 'de';

export const sprache = () => lang;

export function initSprache() {
  let gewaehlt = '';
  try { gewaehlt = localStorage.getItem(K_LANG) || ''; } catch { /* egal */ }
  const browser = (navigator.language || 'de').toLowerCase().startsWith('de') ? 'de' : 'en';
  lang = TEXTE[gewaehlt] ? gewaehlt : browser;
}

export function t(key, vars) {
  let s = TEXTE[lang][key] ?? DE[key] ?? key;
  if (vars) Object.entries(vars).forEach(([k, v]) => { s = s.split(`{${k}}`).join(String(v)); });
  return s;
}

/** Statische Texte im Dokument setzen. */
export function wendeAn(wurzel = document) {
  wurzel.querySelectorAll('[data-i18n]').forEach((e) => { e.textContent = t(e.dataset.i18n); });
  wurzel.querySelectorAll('[data-i18n-ph]').forEach((e) => { e.placeholder = t(e.dataset.i18nPh); });
  wurzel.querySelectorAll('[data-i18n-aria]').forEach((e) => { e.setAttribute('aria-label', t(e.dataset.i18nAria)); });
  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.lang === lang ? 'true' : 'false'));
  document.title = t('app.titel');
}

export function setzeSprache(l) {
  if (!TEXTE[l]) return;
  lang = l;
  try { localStorage.setItem(K_LANG, l); } catch { /* egal */ }
  document.documentElement.lang = l;
  wendeAn();
}

/** Anzeigename eines Naehrstoffs oder Vitalwerts. */
export const nName = (n) => (lang === 'en' ? n.en : n.de);
export const vName = (v) => (lang === 'en' ? v.en : v.de);

/** Fuer den Test: fehlen Schluessel in einer Sprache? */
export const fehlendeSchluessel = () => ({
  en: Object.keys(DE).filter((k) => !(k in EN)),
  de: Object.keys(EN).filter((k) => !(k in DE))
});
