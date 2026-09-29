/* Der Naehrstoffkatalog — die eine Liste, aus der Tabellen, Foto-Auslesen,
   Recherche, Tagessummen und die Schnittstelle zum Wochenbogen lesen.

   Jeder Eintrag:
     key     stabiler Schluessel; steht so in den JSON-Dateien. NIE umbenennen,
             sonst finden alte Tage ihre Werte nicht mehr.
     unit    Einheit, in der der Wert gespeichert wird (je 100 g bzw. 100 ml
             im Produkt, absolut im Tag).
     de, en  Anzeigename
     group   energie | makro | vitamin | mineral
     ziel    Tagesbezug. Vorgabe ist die Referenzmenge der LMIV (EU 1169/2011,
             Anhang XIII) — dieselbe Basis wie das "% RM" auf den Packungen.
             Ausnahmen: Ballaststoffe (DGE, 30 g), Natrium und Cholesterin.
     art     min  = erreichen (Vitamine, Mineralien, Ballaststoffe)
             max  = nicht ueberschreiten (Salz, Zucker, gesaettigte Fette)
             ref  = Richtwert ohne Wertung (Energie, Fett, Kohlenhydrate)
     off     Feldname bei Open Food Facts (dort immer in g bzw. kcal/kJ)
     usda    Naehrstoffnummer in der USDA FoodData Central

   Neue Naehrstoffe: Zeile ergaenzen, fertig. Die Oberflaeche liest die Liste. */

export const NAEHRSTOFFE = [
  { key: 'energy_kcal', unit: 'kcal', de: 'Energie', en: 'Energy', group: 'energie', ziel: 2000, art: 'ref', off: 'energy-kcal', usda: ['208', '957', '958'] },
  { key: 'energy_kj', unit: 'kJ', de: 'Energie (kJ)', en: 'Energy (kJ)', group: 'energie', ziel: 8400, art: 'ref', off: 'energy-kj', usda: ['268'] },

  { key: 'fat', unit: 'g', de: 'Fett', en: 'Fat', group: 'makro', ziel: 70, art: 'ref', off: 'fat', usda: ['204'] },
  { key: 'sat_fat', unit: 'g', de: 'davon gesättigte Fettsäuren', en: 'of which saturates', group: 'makro', ziel: 20, art: 'max', off: 'saturated-fat', usda: ['606'], unter: 'fat' },
  { key: 'mono_fat', unit: 'g', de: 'davon einfach ungesättigte', en: 'of which mono-unsaturates', group: 'makro', ziel: null, art: 'ref', off: 'monounsaturated-fat', usda: ['645'], unter: 'fat' },
  { key: 'poly_fat', unit: 'g', de: 'davon mehrfach ungesättigte', en: 'of which polyunsaturates', group: 'makro', ziel: null, art: 'ref', off: 'polyunsaturated-fat', usda: ['646'], unter: 'fat' },
  { key: 'carbs', unit: 'g', de: 'Kohlenhydrate', en: 'Carbohydrate', group: 'makro', ziel: 260, art: 'ref', off: 'carbohydrates', usda: ['205'] },
  { key: 'sugar', unit: 'g', de: 'davon Zucker', en: 'of which sugars', group: 'makro', ziel: 90, art: 'max', off: 'sugars', usda: ['269'], unter: 'carbs' },
  { key: 'polyols', unit: 'g', de: 'davon mehrwertige Alkohole', en: 'of which polyols', group: 'makro', ziel: null, art: 'ref', off: 'polyols', usda: [], unter: 'carbs' },
  { key: 'starch', unit: 'g', de: 'davon Stärke', en: 'of which starch', group: 'makro', ziel: null, art: 'ref', off: 'starch', usda: ['209'], unter: 'carbs' },
  { key: 'fiber', unit: 'g', de: 'Ballaststoffe', en: 'Fibre', group: 'makro', ziel: 30, art: 'min', off: 'fiber', usda: ['291'] },
  { key: 'protein', unit: 'g', de: 'Eiweiß', en: 'Protein', group: 'makro', ziel: 50, art: 'ref', off: 'proteins', usda: ['203'] },
  { key: 'salt', unit: 'g', de: 'Salz', en: 'Salt', group: 'makro', ziel: 6, art: 'max', off: 'salt', usda: [] },
  { key: 'cholesterol', unit: 'mg', de: 'Cholesterin', en: 'Cholesterol', group: 'makro', ziel: 300, art: 'max', off: 'cholesterol', usda: ['601'] },

  { key: 'vit_a', unit: 'µg', de: 'Vitamin A', en: 'Vitamin A', group: 'vitamin', ziel: 800, art: 'min', off: 'vitamin-a', usda: ['320'] },
  { key: 'vit_d', unit: 'µg', de: 'Vitamin D', en: 'Vitamin D', group: 'vitamin', ziel: 5, art: 'min', off: 'vitamin-d', usda: ['328'] },
  { key: 'vit_e', unit: 'mg', de: 'Vitamin E', en: 'Vitamin E', group: 'vitamin', ziel: 12, art: 'min', off: 'vitamin-e', usda: ['323'] },
  { key: 'vit_k', unit: 'µg', de: 'Vitamin K', en: 'Vitamin K', group: 'vitamin', ziel: 75, art: 'min', off: 'vitamin-k', usda: ['430'] },
  { key: 'vit_c', unit: 'mg', de: 'Vitamin C', en: 'Vitamin C', group: 'vitamin', ziel: 80, art: 'min', off: 'vitamin-c', usda: ['401'] },
  { key: 'vit_b1', unit: 'mg', de: 'Thiamin (B1)', en: 'Thiamin (B1)', group: 'vitamin', ziel: 1.1, art: 'min', off: 'vitamin-b1', usda: ['404'] },
  { key: 'vit_b2', unit: 'mg', de: 'Riboflavin (B2)', en: 'Riboflavin (B2)', group: 'vitamin', ziel: 1.4, art: 'min', off: 'vitamin-b2', usda: ['405'] },
  { key: 'niacin', unit: 'mg', de: 'Niacin (B3)', en: 'Niacin (B3)', group: 'vitamin', ziel: 16, art: 'min', off: 'vitamin-pp', usda: ['406'] },
  { key: 'pantothen', unit: 'mg', de: 'Pantothensäure (B5)', en: 'Pantothenic acid (B5)', group: 'vitamin', ziel: 6, art: 'min', off: 'pantothenic-acid', usda: ['410'] },
  { key: 'vit_b6', unit: 'mg', de: 'Vitamin B6', en: 'Vitamin B6', group: 'vitamin', ziel: 1.4, art: 'min', off: 'vitamin-b6', usda: ['415'] },
  { key: 'biotin', unit: 'µg', de: 'Biotin (B7)', en: 'Biotin (B7)', group: 'vitamin', ziel: 50, art: 'min', off: 'biotin', usda: ['416'] },
  { key: 'folate', unit: 'µg', de: 'Folsäure (B9)', en: 'Folate (B9)', group: 'vitamin', ziel: 200, art: 'min', off: 'vitamin-b9', usda: ['435', '417'] },
  { key: 'vit_b12', unit: 'µg', de: 'Vitamin B12', en: 'Vitamin B12', group: 'vitamin', ziel: 2.5, art: 'min', off: 'vitamin-b12', usda: ['418'] },

  { key: 'potassium', unit: 'mg', de: 'Kalium', en: 'Potassium', group: 'mineral', ziel: 2000, art: 'min', off: 'potassium', usda: ['306'] },
  { key: 'chloride', unit: 'mg', de: 'Chlorid', en: 'Chloride', group: 'mineral', ziel: 800, art: 'min', off: 'chloride', usda: [] },
  { key: 'sodium', unit: 'mg', de: 'Natrium', en: 'Sodium', group: 'mineral', ziel: 2400, art: 'max', off: 'sodium', usda: ['307'] },
  { key: 'calcium', unit: 'mg', de: 'Calcium', en: 'Calcium', group: 'mineral', ziel: 800, art: 'min', off: 'calcium', usda: ['301'] },
  { key: 'phosphorus', unit: 'mg', de: 'Phosphor', en: 'Phosphorus', group: 'mineral', ziel: 700, art: 'min', off: 'phosphorus', usda: ['305'] },
  { key: 'magnesium', unit: 'mg', de: 'Magnesium', en: 'Magnesium', group: 'mineral', ziel: 375, art: 'min', off: 'magnesium', usda: ['304'] },
  { key: 'iron', unit: 'mg', de: 'Eisen', en: 'Iron', group: 'mineral', ziel: 14, art: 'min', off: 'iron', usda: ['303'] },
  { key: 'zinc', unit: 'mg', de: 'Zink', en: 'Zinc', group: 'mineral', ziel: 10, art: 'min', off: 'zinc', usda: ['309'] },
  { key: 'copper', unit: 'mg', de: 'Kupfer', en: 'Copper', group: 'mineral', ziel: 1, art: 'min', off: 'copper', usda: ['312'] },
  { key: 'manganese', unit: 'mg', de: 'Mangan', en: 'Manganese', group: 'mineral', ziel: 2, art: 'min', off: 'manganese', usda: ['315'] },
  { key: 'fluoride', unit: 'mg', de: 'Fluorid', en: 'Fluoride', group: 'mineral', ziel: 3.5, art: 'min', off: 'fluoride', usda: ['313'] },
  { key: 'selenium', unit: 'µg', de: 'Selen', en: 'Selenium', group: 'mineral', ziel: 55, art: 'min', off: 'selenium', usda: ['317'] },
  { key: 'chromium', unit: 'µg', de: 'Chrom', en: 'Chromium', group: 'mineral', ziel: 40, art: 'min', off: 'chromium', usda: [] },
  { key: 'molybdenum', unit: 'µg', de: 'Molybdän', en: 'Molybdenum', group: 'mineral', ziel: 50, art: 'min', off: 'molybdenum', usda: [] },
  { key: 'iodine', unit: 'µg', de: 'Jod', en: 'Iodine', group: 'mineral', ziel: 150, art: 'min', off: 'iodine', usda: ['314'] }
];

export const GRUPPEN = ['energie', 'makro', 'vitamin', 'mineral'];

export const NACH_KEY = Object.fromEntries(NAEHRSTOFFE.map((n) => [n.key, n]));

/** Die sieben Pflichtangaben der Nährwerttabelle — immer sichtbar. */
export const PFLICHT = ['energy_kcal', 'fat', 'sat_fat', 'carbs', 'sugar', 'protein', 'salt'];

/** Faktor von Gramm in die Katalogeinheit. */
export const AUS_GRAMM = { g: 1, mg: 1000, 'µg': 1e6, kcal: 1, kJ: 1 };

/** Beliebige Masseneinheit in die Katalogeinheit eines Naehrstoffs umrechnen. */
export function umrechnen(wert, vonEinheit, key) {
  const ziel = NACH_KEY[key] && NACH_KEY[key].unit;
  if (!ziel || wert === null || wert === undefined || isNaN(wert)) return null;
  const e = String(vonEinheit || '').trim().toLowerCase().replace('mcg', 'µg').replace(/^ug$/, 'µg');
  if (ziel === 'kcal' || ziel === 'kJ') {
    if (e === 'kj' && ziel === 'kcal') return wert / 4.184;
    if (e === 'kcal' && ziel === 'kJ') return wert * 4.184;
    return wert;
  }
  const inGramm = { g: 1, mg: 1e-3, 'µg': 1e-6 }[e];
  if (inGramm === undefined) return wert;
  return wert * inGramm * AUS_GRAMM[ziel];
}

/** Fehlende Werte aus vorhandenen ableiten: kJ<->kcal, Salz<->Natrium.
    Veraendert das Objekt und gibt es zurueck. */
export function ergaenzeAbgeleitete(n) {
  if (n.energy_kcal == null && n.energy_kj != null) n.energy_kcal = runde(n.energy_kj / 4.184);
  if (n.energy_kj == null && n.energy_kcal != null) n.energy_kj = runde(n.energy_kcal * 4.184);
  /* Salz = Natrium × 2,5 (so rechnet auch die LMIV). */
  if (n.salt == null && n.sodium != null) n.salt = runde(n.sodium * 2.5 / 1000, 3);
  if (n.sodium == null && n.salt != null) n.sodium = runde(n.salt / 2.5 * 1000, 1);
  return n;
}

export function runde(x, stellen = 2) {
  if (x === null || x === undefined || isNaN(x)) return null;
  const f = 10 ** stellen;
  return Math.round(x * f) / f;
}
