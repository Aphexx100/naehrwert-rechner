/* Reine Rechnung, ohne DOM und ohne Ablage — deshalb auch in Node testbar.

   Ein Produkt traegt Naehrwerte je 100 g oder je 100 ml (produkt.basis).
   Ein Eintrag im Tag haelt die Menge UND eine Momentaufnahme der daraus
   berechneten Naehrstoffe (eintrag.n). So bleibt ein vergangener Tag stabil,
   auch wenn das Produkt spaeter korrigiert wird — und der Wochenbogen kann
   die Summen lesen, ohne den Produktkatalog zu kennen. */

import { NAEHRSTOFFE, NACH_KEY, runde } from './naehrstoffe.js';
import { inGrammUndMl } from './masse.js';

/** Naehrstoffe fuer eine Menge eines Produkts. */
export function naehrstoffeFuer(produkt, menge, einheit, masse) {
  const gm = inGrammUndMl(menge, einheit, produkt, masse);
  if (!gm) return null;
  const bezug = produkt.basis === 'ml' ? gm.ml : gm.g;
  const f = bezug / 100;
  const n = {};
  Object.entries(produkt.naehrwerte || {}).forEach(([k, v]) => {
    if (v === null || v === undefined || isNaN(v) || !NACH_KEY[k]) return;
    n[k] = runde(Number(v) * f, 4);
  });
  return { gramm: runde(gm.g, 1), ml: runde(gm.ml, 1), n };
}

/** Summe ueber beliebig viele Naehrstoff-Objekte. */
export function summe(liste) {
  const s = {};
  liste.forEach((n) => {
    Object.entries(n || {}).forEach(([k, v]) => {
      if (v === null || v === undefined || isNaN(v)) return;
      s[k] = (s[k] || 0) + Number(v);
    });
  });
  Object.keys(s).forEach((k) => { s[k] = runde(s[k], 4); });
  return s;
}

/** Aktuelle Tagesziele: Katalog-Vorgabe, ueberschrieben von der Konfiguration. */
export function ziele(overrides = {}) {
  const z = {};
  NAEHRSTOFFE.forEach((n) => {
    const o = overrides[n.key];
    const v = o !== undefined && o !== null && o !== '' ? Number(o) : n.ziel;
    if (v) z[n.key] = v;
  });
  return z;
}

/** Anteil am Tagesziel in Prozent, je Naehrstoff. */
export function anteile(s, z) {
  const a = {};
  Object.keys(z).forEach((k) => {
    if (s[k] !== undefined && z[k]) a[k] = runde((s[k] / z[k]) * 100, 1);
  });
  return a;
}

/** Summen einer Mahlzeit: Gewicht und Naehrstoffe. */
export function mahlzeitSumme(m) {
  const e = m.eintraege || [];
  return {
    gramm: runde(e.reduce((a, x) => a + (Number(x.gramm) || 0), 0), 1),
    n: summe(e.map((x) => x.n))
  };
}

/** Einen Tag durchrechnen: summe, ziele, anteil, gramm. Gibt eine Kopie zurueck. */
export function tagDurchrechnen(tag, zielOverrides) {
  const ms = tag.mahlzeiten || [];
  const s = summe(ms.map((m) => mahlzeitSumme(m).n));
  const z = ziele(zielOverrides);
  return {
    ...tag,
    gramm: runde(ms.reduce((a, m) => a + mahlzeitSumme(m).gramm, 0), 1),
    summe: s,
    ziele: z,
    anteil: anteile(s, z)
  };
}

/** Aus einer Mahlzeit ein Rezept-Produkt machen: Werte je 100 g des Ganzen. */
export function rezeptAusMahlzeit(m, name) {
  const { gramm, n } = mahlzeitSumme(m);
  if (!(gramm > 0)) return null;
  const je100 = {};
  Object.entries(n).forEach(([k, v]) => { je100[k] = runde((v / gramm) * 100, 3); });
  return {
    name,
    basis: 'g',
    naehrwerte: je100,
    packung: { menge: gramm, einheit: 'g' },
    portionen: [{ name: 'Rezept', g: gramm }],
    zutaten: (m.eintraege || []).map((e) => ({ produkt: e.produkt, name: e.name, menge: e.menge, einheit: e.einheit, gramm: e.gramm })),
    quelle: { art: 'rezept' }
  };
}

/** Bewertung eines Anteils fuer die Farbe des Balkens. */
export function bewertung(key, prozent) {
  const art = NACH_KEY[key] ? NACH_KEY[key].art : 'ref';
  if (prozent === null || prozent === undefined) return 'leer';
  if (art === 'max') return prozent > 100 ? 'ueber' : prozent > 80 ? 'nah' : 'ok';
  if (art === 'min') return prozent >= 100 ? 'erreicht' : prozent >= 50 ? 'teil' : 'wenig';
  return 'ref';
}
