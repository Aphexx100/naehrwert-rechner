/* Verlauf: eine Groesse (Naehrstoff oder Vitalwert) ueber N Tage als
   Saeulen, mit Ziellinie; darunter der Tagesdurchschnitt aller
   Naehrstoffe im Zeitraum, bezogen auf den Bedarf. */

import { $, el, fuelle } from '../util/dom.js';
import { fmt, datumKurz } from '../util/format.js';
import { t, nName, vName } from '../i18n.js';
import { state } from '../state.js';
import { NAEHRSTOFFE, NACH_KEY } from '../naehrstoffe.js';
import { VITALWERTE, VITAL_NACH_KEY } from '../vitalwerte.js';
import { ziele as zieleVon } from '../rechnen.js';
import { heute, plusTage, tageZwischen } from '../util/date.js';
import { loadTage } from '../storage/index.js';
import { naehrTabelle } from './naehrtabelle.js';

const SVG = 'http://www.w3.org/2000/svg';
const svg = (tag, a = {}) => {
  const e = document.createElementNS(SVG, tag);
  Object.entries(a).forEach(([k, v]) => e.setAttribute(k, v));
  return e;
};

/** Tage, an denen tatsaechlich etwas erfasst ist. */
export const erfasst = (tag) => !!tag && ((tag.mahlzeiten || []).some((m) => (m.eintraege || []).length)
  || Object.keys(tag.vital || {}).length > 0);

let geladenAb = null;

function zeitraum() {
  const n = Number($('vlZeitraum').value);
  const bis = heute();
  return { von: plusTage(bis, -(n - 1)), bis };
}

function wertAm(datum, groesse) {
  const tag = state.tage[datum];
  if (!erfasst(tag)) return null;
  const [art, key] = groesse.split(':');
  if (art === 'v') return tag.vital && tag.vital[key] !== undefined ? tag.vital[key] : null;
  return tag.summe && tag.summe[key] !== undefined ? tag.summe[key] : 0;
}

function grafik(tage, werte, ziel) {
  const B = 640; const H = 220; const L = 44; const U = 26; const O = 12;
  const max = Math.max(ziel || 0, ...werte.filter((w) => w !== null)) * 1.1 || 1;
  const s = svg('svg', { viewBox: `0 0 ${B} ${H}`, class: 'saeulen', role: 'img' });
  const y = (w) => O + (H - O - U) * (1 - w / max);
  [0, 0.5, 1].forEach((f) => {
    s.append(svg('line', { x1: L, x2: B, y1: y(max * f / 1.1), y2: y(max * f / 1.1), class: 'raster' }));
    const tx = svg('text', { x: L - 6, y: y(max * f / 1.1) + 4, class: 'achse', 'text-anchor': 'end' });
    tx.textContent = fmt(max * f / 1.1, 0);
    s.append(tx);
  });
  const breite = (B - L) / tage.length;
  tage.forEach((d, i) => {
    const w = werte[i];
    if (w !== null) {
      const r = svg('rect', {
        x: L + i * breite + breite * 0.15, width: Math.max(1, breite * 0.7),
        y: y(w), height: Math.max(0, H - U - y(w)), class: 'saeule', rx: 1.5
      });
      const tt = svg('title');
      tt.textContent = `${datumKurz(d)}: ${fmt(w)}`;
      r.append(tt);
      s.append(r);
    }
    const jede = Math.ceil(tage.length / 10);
    if (i % jede === 0) {
      const tx = svg('text', { x: L + i * breite + breite / 2, y: H - 8, class: 'achse', 'text-anchor': 'middle' });
      tx.textContent = datumKurz(d);
      s.append(tx);
    }
  });
  if (ziel) {
    s.append(svg('line', { x1: L, x2: B, y1: y(ziel), y2: y(ziel), class: 'ziellinie' }));
  }
  return s;
}

export async function renderVerlauf() {
  const { von, bis } = zeitraum();
  /* Aeltere Tage erst holen, wenn der Zeitraum sie braucht. */
  if (!geladenAb || von < geladenAb) {
    state.tage = { ...(await loadTage(von, bis)), ...state.tage };
    geladenAb = von;
  }
  const tage = tageZwischen(von, bis);
  const groesse = $('vlGroesse').value;
  const [art, key] = groesse.split(':');
  const werte = tage.map((d) => wertAm(d, groesse));
  const z = zieleVon(state.cfg.ziele);
  const ziel = art === 'n' ? z[key] : null;
  const einheit = art === 'n' ? NACH_KEY[key].unit : VITAL_NACH_KEY[key].unit;
  const vorhanden = werte.filter((w) => w !== null);
  const mittel = vorhanden.length ? vorhanden.reduce((a, b) => a + b, 0) / vorhanden.length : null;

  fuelle($('vlGrafik'), vorhanden.length ? [grafik(tage, werte, ziel)] : [el('p', { class: 'hint', text: t('verlauf.leer') })]);
  fuelle($('vlKennzahlen'), vorhanden.length ? [
    el('span', { class: 'chip', text: t('verlauf.tageErfasst', { n: vorhanden.length, m: tage.length }) }),
    el('span', { class: 'chip', text: `Ø ${fmt(mittel)} ${einheit}` }),
    ziel ? el('span', { class: 'chip acc', text: `${fmt((mittel / ziel) * 100, 0)} % ${t('tag.vomBedarf')}` }) : null,
    el('span', { class: 'chip', text: `min ${fmt(Math.min(...vorhanden))} · max ${fmt(Math.max(...vorhanden))}` })
  ] : []);

  /* Durchschnitt aller Naehrstoffe ueber die erfassten Tage. */
  const erfassteTage = tage.map((d) => state.tage[d]).filter((tg) => erfasst(tg) && (tg.mahlzeiten || []).some((m) => m.eintraege.length));
  if (!erfassteTage.length) {
    fuelle($('vlMittel'), [el('p', { class: 'hint', text: t('verlauf.leer') })]);
    return;
  }
  const mittelN = {};
  NAEHRSTOFFE.forEach((n) => {
    const s = erfassteTage.reduce((a, tg) => a + ((tg.summe || {})[n.key] || 0), 0);
    if (s) mittelN[n.key] = s / erfassteTage.length;
  });
  const eintraege = erfassteTage.flatMap((tg) => tg.mahlzeiten.flatMap((m) => m.eintraege));
  fuelle($('vlMittel'), [
    el('p', { class: 'hint', text: t('verlauf.ueberTage', { n: erfassteTage.length }) }),
    naehrTabelle(mittelN, z, eintraege, { alle: true })
  ]);
}

function csv() {
  const { von, bis } = zeitraum();
  const kopf = ['datum', ...NAEHRSTOFFE.map((n) => `${n.key}_${n.unit}`), ...VITALWERTE.map((v) => `${v.key}${v.unit ? `_${v.unit}` : ''}`)];
  const zeilen = tageZwischen(von, bis).filter((d) => erfasst(state.tage[d])).map((d) => {
    const tg = state.tage[d];
    return [d, ...NAEHRSTOFFE.map((n) => (tg.summe || {})[n.key] ?? ''), ...VITALWERTE.map((v) => (tg.vital || {})[v.key] ?? '')];
  });
  const text = [kopf, ...zeilen].map((z) => z.join(';')).join('\n');
  const a = el('a', { href: URL.createObjectURL(new Blob([`﻿${text}`], { type: 'text/csv' })), download: `naehrwerte_${von}_${bis}.csv` });
  document.body.append(a);
  a.click();
  a.remove();
}

export function fuelleGroessen() {
  const alt = $('vlGroesse').value || 'n:energy_kcal';
  fuelle($('vlGroesse'), [
    el('optgroup', { label: t('verlauf.naehrstoffe') }, NAEHRSTOFFE.map((n) => el('option', { value: `n:${n.key}`, text: `${nName(n)} (${n.unit})` }))),
    el('optgroup', { label: t('tab.vital') }, VITALWERTE.map((v) => el('option', { value: `v:${v.key}`, text: `${vName(v)}${v.unit ? ` (${v.unit})` : ''}` })))
  ]);
  $('vlGroesse').value = alt;
}

export function initVerlauf() {
  fuelleGroessen();
  $('vlGroesse').addEventListener('change', renderVerlauf);
  $('vlZeitraum').addEventListener('change', renderVerlauf);
  $('vlCsv').addEventListener('click', csv);
}
