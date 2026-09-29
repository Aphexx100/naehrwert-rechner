/* Naehrstoffe als Zeilen mit Balken: Menge absolut UND Anteil am Tagesziel.

   Ehrlichkeit bei Luecken: Packungen nennen meist nur die sieben
   Pflichtangaben. Fehlt ein Wert bei einem Teil der Zutaten, steht vor der
   Summe ein "≥" und darunter, wie viele Zutaten ohne Angabe sind — sonst
   saehe ein halb erfasster Vitamin-Wert wie ein echter Mangel aus. */

import { el } from '../util/dom.js';
import { fmt } from '../util/format.js';
import { t, nName } from '../i18n.js';
import { NAEHRSTOFFE, GRUPPEN, PFLICHT } from '../naehrstoffe.js';
import { bewertung } from '../rechnen.js';

/** Wie viele der Eintraege einen Wert fuer key haben. */
export function abdeckung(eintraege) {
  const a = {};
  NAEHRSTOFFE.forEach((n) => {
    a[n.key] = eintraege.filter((e) => e.n && e.n[n.key] !== undefined && e.n[n.key] !== null).length;
  });
  return a;
}

function zeile(n, wert, ziel, abgedeckt, gesamt) {
  const prozent = ziel && wert !== undefined ? (wert / ziel) * 100 : null;
  const bw = bewertung(n.key, prozent);
  const luecke = gesamt > 0 && abgedeckt < gesamt;
  const keine = abgedeckt === 0;
  const breite = prozent === null ? 0 : Math.min(100, prozent);
  return el('div', { class: `nz ${n.unter ? 'unter' : ''} ${keine ? 'keine' : ''}`, dataset: { key: n.key } }, [
    el('div', { class: 'nz-kopf' }, [
      el('span', { class: 'nz-name', text: nName(n) }),
      el('span', { class: 'nz-wert mono' }, [
        keine ? t('naehr.keineAngabe') : `${luecke ? '≥ ' : ''}${fmt(wert)} ${n.unit}`,
        ziel && !keine ? el('span', { class: `nz-proz ${bw}`, text: ` · ${fmt(prozent, 0)} %` }) : null
      ])
    ]),
    ziel && !keine ? el('div', { class: `balken ${bw}`, role: 'presentation' }, [
      el('span', { style: `width:${breite}%` }),
      prozent > 100 ? el('i', { class: 'ueberlauf' }) : null
    ]) : null,
    luecke && !keine ? el('div', { class: 'nz-luecke', text: t('naehr.luecke', { n: gesamt - abgedeckt, m: gesamt }) }) : null
  ]);
}

/**
 * @param {object} summe    key -> Wert
 * @param {object} ziele    key -> Tagesziel
 * @param {object[]} eintraege  fuer die Abdeckung
 * @param {{alle?:boolean}} opt  alle = auch Vitamine/Mineralien
 */
export function naehrTabelle(summe, ziele, eintraege, opt = {}) {
  const ab = abdeckung(eintraege);
  const gesamt = eintraege.length;
  const teile = [];
  GRUPPEN.forEach((g) => {
    let liste = NAEHRSTOFFE.filter((n) => n.group === g && n.key !== 'energy_kj');
    if (!opt.alle) liste = liste.filter((n) => PFLICHT.includes(n.key) || n.key === 'fiber');
    /* Energie steht schon gross darueber; leere "davon"-Zeilen sind nur Rauschen. */
    liste = liste.filter((n) => n.key !== 'energy_kcal' && !(n.unter && !ab[n.key]));
    if (!liste.length) return;
    if (opt.alle) teile.push(el('h3', { class: 'gruppe', text: t(`gruppe.${g}`) }));
    liste.forEach((n) => teile.push(zeile(n, summe[n.key], ziele[n.key], ab[n.key], gesamt)));
  });
  return el('div', { class: 'naehrtabelle' }, teile);
}
