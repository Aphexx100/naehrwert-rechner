/* Unit-Tests der reinen Rechnung und der Umsetzer — ohne Browser.

   Die Zahlen stammen von echten Packungen (Speisequark Magerstufe,
   fettarme H-Milch 1,5 %), damit die Umrechnung an etwas Greifbarem
   geprueft wird.

   Aufruf:  node scripts/unit-test.mjs */

import assert from 'node:assert/strict';
import { naehrstoffeFuer, summe, tagDurchrechnen, rezeptAusMahlzeit, ziele, bewertung } from '../src/js/rechnen.js';
import { inGrammUndMl, einheitenFuer } from '../src/js/masse.js';
import { umrechnen, ergaenzeAbgeleitete, NAEHRSTOFFE } from '../src/js/naehrstoffe.js';
import { ausOff } from '../src/js/quellen/openfoodfacts.js';
import { ausUsda } from '../src/js/quellen/usda.js';
import { entwurfAusAntwort, jsonAusText } from '../src/js/quellen/claude.js';
import { fehlendeSchluessel } from '../src/js/i18n.js';
import { naehrwertQuelle, fasseZusammen } from '../schnittstelle/naehrwert-quelle.js';
import { schemaDokument } from '../src/js/schema-dokument.js';
import { githubAttrappe } from './github-attrappe.mjs';

let fehl = 0;
let n = 0;
async function pruefe(name, fn) {
  n += 1;
  try {
    await fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    fehl += 1;
    console.log(` FEHL  ${name} — ${err.message}`);
  }
}
const nah = (a, b, tol = 0.05) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

const QUARK = {
  id: 'p-quark', name: 'Speisequark Magerstufe', basis: 'g', dichte: 1.05, el_g: 20,
  packung: { menge: 250, einheit: 'g' },
  naehrwerte: { energy_kcal: 65, energy_kj: 274, fat: 0.2, sat_fat: 0.1, carbs: 3.7, sugar: 3.7, protein: 12, salt: 0.1 }
};
const MILCH = {
  id: 'p-milch', name: 'Bio Fettarme H-Milch 1,5 %', basis: 'ml', dichte: 1.03,
  naehrwerte: { energy_kcal: 47, energy_kj: 197, fat: 1.5, sat_fat: 0.9, carbs: 4.9, sugar: 4.9, protein: 3.4, salt: 0.13, calcium: 120 }
};

console.log('\nMaße');
await pruefe('3 EL Quark mit hinterlegtem Löffelgewicht = 60 g', () => {
  assert.equal(inGrammUndMl(3, 'EL', QUARK).g, 60);
});
await pruefe('EL ohne Löffelgewicht: 15 ml × Dichte', () => {
  nah(inGrammUndMl(1, 'EL', { dichte: 0.92 }).g, 13.8);
});
await pruefe('TL leitet sich aus dem EL-Gewicht ab', () => {
  nah(inGrammUndMl(3, 'TL', QUARK).g, 20);
});
await pruefe('Tasse = 200 ml, einstellbar', () => {
  assert.equal(inGrammUndMl(1, 'Tasse', {}).ml, 200);
  assert.equal(inGrammUndMl(1, 'Tasse', {}, { tasse_ml: 250 }).ml, 250);
});
await pruefe('Packung nur, wenn Füllmenge bekannt', () => {
  assert.equal(inGrammUndMl(1, 'Packung', QUARK).g, 250);
  assert.equal(inGrammUndMl(1, 'Packung', MILCH), null);
  assert.ok(einheitenFuer(QUARK).includes('Packung'));
  assert.ok(!einheitenFuer(MILCH).includes('Packung'));
});
await pruefe('Eigene Portionen', () => {
  const p = { portionen: [{ name: 'Scheibe', g: 25 }] };
  assert.equal(inGrammUndMl(2, 'portion:Scheibe', p).g, 50);
  assert.ok(einheitenFuer(p).includes('portion:Scheibe'));
});
await pruefe('Unsinnige Menge -> null', () => {
  assert.equal(inGrammUndMl(-1, 'g', {}), null);
  assert.equal(inGrammUndMl(1, 'Eimer', {}), null);
});

console.log('\nRechnung');
await pruefe('3 EL Quark: 39 kcal, 7,2 g Eiweiß', () => {
  const r = naehrstoffeFuer(QUARK, 3, 'EL');
  nah(r.n.energy_kcal, 39);
  nah(r.n.protein, 7.2);
});
await pruefe('Milch je 100 ml: 1 Tasse = 200 ml = 94 kcal', () => {
  const r = naehrstoffeFuer(MILCH, 1, 'Tasse');
  nah(r.n.energy_kcal, 94);
  nah(r.gramm, 206);
});
await pruefe('Milch in Gramm angegeben: über die Dichte in ml', () => {
  nah(naehrstoffeFuer(MILCH, 103, 'g').n.energy_kcal, 47);
});
await pruefe('Tag durchrechnen: Summe, Ziele, Anteil', () => {
  const q = naehrstoffeFuer(QUARK, 3, 'EL');
  const m = naehrstoffeFuer(MILCH, 1, 'Tasse');
  const tag = tagDurchrechnen({ datum: '2026-09-29', mahlzeiten: [{ name: 'fruehstueck', eintraege: [{ gramm: q.gramm, n: q.n }, { gramm: m.gramm, n: m.n }] }] }, {});
  nah(tag.summe.energy_kcal, 133);
  nah(tag.anteil.energy_kcal, 6.7);
  nah(tag.anteil.calcium, 30);
  assert.equal(tag.ziele.fiber, 30);
  nah(tag.gramm, 266);
});
await pruefe('Eigene Ziele überschreiben die Vorgabe', () => {
  assert.equal(ziele({ vit_d: 20 }).vit_d, 20);
  assert.equal(ziele({}).vit_d, 5);
});
await pruefe('Summe ignoriert Lücken', () => {
  assert.deepEqual(summe([{ a: 1 }, { a: 2, b: 3 }, {}]), { a: 3, b: 3 });
});
await pruefe('Rezept: Werte je 100 g des Ganzen', () => {
  const q = naehrstoffeFuer(QUARK, 100, 'g');
  const r = rezeptAusMahlzeit({ eintraege: [{ gramm: 100, n: q.n }, { gramm: 100, n: { energy_kcal: 0 } }] }, 'Test');
  nah(r.naehrwerte.energy_kcal, 32.5);
  assert.equal(r.packung.menge, 200);
});
await pruefe('Bewertung: Salz über Ziel = ueber, Vitamin C voll = erreicht', () => {
  assert.equal(bewertung('salt', 120), 'ueber');
  assert.equal(bewertung('vit_c', 100), 'erreicht');
  assert.equal(bewertung('energy_kcal', 50), 'ref');
});

console.log('\nUmrechnung und Quellen');
await pruefe('Einheiten: g -> mg/µg, kJ -> kcal', () => {
  nah(umrechnen(0.0012, 'g', 'calcium'), 1.2);
  nah(umrechnen(0.000005, 'g', 'vit_d'), 5);
  nah(umrechnen(418.4, 'kJ', 'energy_kcal'), 100);
});
await pruefe('Salz <-> Natrium, kJ <-> kcal ergänzen', () => {
  const x = ergaenzeAbgeleitete({ salt: 1, energy_kj: 418.4 });
  nah(x.sodium, 400);
  nah(x.energy_kcal, 100);
});
await pruefe('Open Food Facts: Gramm-Werte in Katalogeinheiten', () => {
  const p = ausOff({
    code: '22124456', product_name: 'Speisequark Magerstufe', brands: 'Milfina,DMK', product_quantity: '500', product_quantity_unit: 'g',
    nutriments: { 'energy-kj_100g': 288, fat_100g: 0.3, proteins_100g: 12, 'calcium_100g': 0.12, 'vitamin-b12_100g': 0.0000008 }
  });
  assert.equal(p.marke, 'Milfina');
  nah(p.naehrwerte.calcium, 120);
  nah(p.naehrwerte.vit_b12, 0.8);
  nah(p.naehrwerte.energy_kcal, 68.8, 0.1);
  assert.equal(p.packung.menge, 500);
});
await pruefe('USDA: Nährstoffnummern und Einheiten', () => {
  const p = ausUsda({
    fdcId: 168462, description: 'SPINACH, RAW', dataType: 'SR Legacy',
    foodNutrients: [
      { nutrientNumber: '208', unitName: 'KCAL', value: 23 },
      { nutrientNumber: '301', unitName: 'MG', value: 99 },
      { nutrientNumber: '320', unitName: 'UG', value: 469 },
      { nutrientNumber: '417', unitName: 'UG', value: 194 },
      { nutrientNumber: '435', unitName: 'UG', value: 194 },
      { nutrientNumber: '324', unitName: 'IU', value: 0 }
    ]
  });
  assert.equal(p.name, 'Spinach, raw');
  assert.equal(p.naehrwerte.energy_kcal, 23);
  assert.equal(p.naehrwerte.calcium, 99);
  assert.equal(p.naehrwerte.folate, 194);
  assert.equal(p.naehrwerte.vit_d, undefined);
});
await pruefe('Claude-Antwort -> Entwurf; fremde Schlüssel fliegen raus', () => {
  const e = entwurfAusAntwort({
    name: 'Speisequark', marke: 'Gut & Günstig', ean: '0 000000 000000', basis: 'g', packung_menge: 250, packung_einheit: 'g',
    portion_name: '', portion_g: 0, dichte: 1.05, el_g: 20,
    naehrwerte: [{ key: 'energy_kcal', wert: 65 }, { key: 'erfunden', wert: 3 }, { key: 'salt', wert: 0.1 }], hinweise: ''
  }, 'foto');
  assert.equal(e.naehrwerte.erfunden, undefined);
  nah(e.naehrwerte.sodium, 40);
  assert.equal(e.packung.menge, 250);
  assert.deepEqual(e.portionen, []);
});
await pruefe('JSON aus Text mit Codeblock', () => {
  assert.equal(jsonAusText('Hier:\n```json\n{"name":"Hafer"}\n```\nQuelle: x').name, 'Hafer');
});

console.log('\nSprachen');
await pruefe('Deutsch und Englisch haben dieselben Schlüssel', () => {
  const f = fehlendeSchluessel();
  assert.deepEqual(f, { en: [], de: [] }, JSON.stringify(f));
});
await pruefe('Jeder Nährstoff hat Namen in beiden Sprachen', () => {
  NAEHRSTOFFE.forEach((x) => assert.ok(x.de && x.en, x.key));
});

console.log('\nSchnittstelle (Wochenbogen)');
await pruefe('naehrwertQuelle liest Tage und fasst eine Woche zusammen', async () => {
  const gh = githubAttrappe();
  const put = (p, obj) => gh.bearbeite('PUT', `https://api.github.com/repos/test/naehrwert-daten/contents/${p}`, 'Bearer test-token',
    JSON.stringify({ message: 'x', content: Buffer.from(JSON.stringify(obj)).toString('base64') }));
  put('naehrwerte/schema.json', schemaDokument());
  const tag = (datum, kcal, cu, vital = {}) => ({
    datum, mahlzeiten: [{ name: 'fruehstueck', eintraege: [{ gramm: 1, n: {} }] }],
    summe: { energy_kcal: kcal, copper: cu }, ziele: { energy_kcal: 2000, copper: 1 }, vital
  });
  put('naehrwerte/tage/2026/2026-09-28.json', tag('2026-09-28', 1800, 0.8, { gewicht: 82 }));
  put('naehrwerte/tage/2026/2026-09-29.json', tag('2026-09-29', 2200, 1.2, { gewicht: 81 }));
  put('naehrwerte/tage/2026/2026-09-10.json', tag('2026-09-10', 9999, 9));
  const q = naehrwertQuelle({ owner: 'test', repo: 'naehrwert-daten', token: 'test-token', fetch: gh.fetch });
  const w = await q.woche('2026-10-03');
  assert.equal(w.tageErfasst, 2);
  assert.equal(w.mittel.energy_kcal, 2000);
  nah(w.anteilMittel.copper, 100);
  assert.equal(w.vitalMittel.gewicht, 81.5);
  assert.deepEqual(w.vitalLetzter.gewicht, { datum: '2026-09-29', wert: 81 });
  assert.equal((await q.tag('2026-09-10')).summe.energy_kcal, 9999);
  assert.equal((await q.schema()).naehrstoffe.length, NAEHRSTOFFE.length);
});
await pruefe('Leere Tage zählen in keinem Mittel', () => {
  const z = fasseZusammen({ '2026-01-01': { datum: '2026-01-01', mahlzeiten: [{ eintraege: [] }], vital: {} } }, '2026-01-01', '2026-01-07');
  assert.equal(z.tageErfasst, 0);
});
await pruefe('Neueres Datenformat wird abgelehnt statt falsch gelesen', async () => {
  const gh = githubAttrappe();
  gh.bearbeite('PUT', 'https://api.github.com/repos/test/naehrwert-daten/contents/naehrwerte/schema.json', 'Bearer test-token',
    JSON.stringify({ message: 'x', content: Buffer.from(JSON.stringify({ version: 99 })).toString('base64') }));
  const q = naehrwertQuelle({ owner: 'test', repo: 'naehrwert-daten', token: 'test-token', fetch: gh.fetch });
  await assert.rejects(() => q.tag('2026-01-01'), /Datenformat 99/);
});

console.log(`\n${n - fehl}/${n} bestanden`);
process.exit(fehl ? 1 : 0);
