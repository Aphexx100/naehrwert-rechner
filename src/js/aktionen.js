/* Aenderungen an Tagen und Produkten — an genau einer Stelle, damit Tag-,
   Vital- und Produktansicht dieselben Regeln benutzen.

   Tage werden sofort lokal gespeichert und entfernt mit kurzer Verzoegerung:
   wer drei Zutaten hintereinander eintraegt, erzeugt einen Commit statt drei. */

import { state } from './state.js';
import { t } from './i18n.js';
import { tagDurchrechnen, naehrstoffeFuer } from './rechnen.js';
import { saveTag, saveProdukte, saveConfig, saveBild, loescheBild } from './storage/index.js';
import { zeigeSpeicherstand } from './ui/status.js';
import { FORMAT_VERSION } from './schema-dokument.js';

const VERZOEGERUNG = 1200;
const offen = new Map();

export const neueId = (praefix) => `${praefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function slug(s) {
  return String(s || '').toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

/** Anzeigename einer Mahlzeit: Schluessel der Vorgabe oder freier Name. */
export const mahlzeitTitel = (name) => {
  const k = `mz.${name}`;
  const x = t(k);
  return x === k ? name : x;
};

/** Tag holen oder leer anlegen (noch nicht gespeichert). */
export function holeTag(datum) {
  if (!state.tage[datum]) {
    state.tage[datum] = {
      schema: 'naehrwert/tag/1',
      version: FORMAT_VERSION,
      datum,
      mahlzeiten: state.cfg.mahlzeiten.map((name) => ({ id: neueId('m'), name, eintraege: [] })),
      vital: {},
      notiz: ''
    };
  }
  return state.tage[datum];
}

/** Tag durchrechnen, lokal sofort, entfernt verzoegert speichern. */
export function speichereTag(datum) {
  const tag = tagDurchrechnen(holeTag(datum), state.cfg.ziele);
  tag.geaendert = new Date().toISOString();
  /* Titel in der aktuellen Sprache mitschreiben — fuer fremde Leser. */
  tag.mahlzeiten = tag.mahlzeiten.map((m) => ({ ...m, titel: mahlzeitTitel(m.name) }));
  state.tage[datum] = tag;
  zeigeSpeicherstand('laeuft');
  clearTimeout(offen.get(datum));
  offen.set(datum, setTimeout(async () => {
    offen.delete(datum);
    const r = await saveTag(datum, state.tage[datum]);
    zeigeSpeicherstand(r.ok ? r.text : 'fehler', r.detail);
  }, VERZOEGERUNG));
  return tag;
}

/** Ausstehende Schreibvorgaenge sofort ausfuehren (Seitenwechsel, Test). */
export async function speichereSofort() {
  const ds = [...offen.keys()];
  ds.forEach((d) => clearTimeout(offen.get(d)));
  offen.clear();
  for (const d of ds) {
    // eslint-disable-next-line no-await-in-loop
    const r = await saveTag(d, state.tage[d]);
    zeigeSpeicherstand(r.ok ? r.text : 'fehler', r.detail);
  }
}
export const hatOffene = () => offen.size > 0;

/** Zutat in eine Mahlzeit eintragen. */
export function zutatHinzu(datum, mahlzeitId, produktId, menge, einheit) {
  const p = state.produkte[produktId];
  if (!p) return null;
  const r = naehrstoffeFuer(p, menge, einheit, state.cfg.masse);
  if (!r) return null;
  const tag = holeTag(datum);
  const m = tag.mahlzeiten.find((x) => x.id === mahlzeitId);
  if (!m) return null;
  m.eintraege.push({
    id: neueId('e'),
    produkt: p.id,
    name: p.name,
    marke: p.marke || '',
    menge: Number(menge),
    einheit,
    gramm: r.gramm,
    ml: r.ml,
    n: r.n
  });
  return speichereTag(datum);
}

/** Menge/Einheit eines Eintrags aendern — neu gerechnet mit dem aktuellen Produkt. */
export function zutatAendern(datum, mahlzeitId, eintragId, menge, einheit) {
  const tag = holeTag(datum);
  const m = tag.mahlzeiten.find((x) => x.id === mahlzeitId);
  const e = m && m.eintraege.find((x) => x.id === eintragId);
  if (!e) return null;
  const p = state.produkte[e.produkt];
  if (p) {
    const r = naehrstoffeFuer(p, menge, einheit, state.cfg.masse);
    if (!r) return null;
    Object.assign(e, { menge: Number(menge), einheit, gramm: r.gramm, ml: r.ml, n: r.n });
  } else {
    /* Produkt geloescht: Momentaufnahme proportional skalieren. */
    const f = Number(menge) / (e.menge || 1);
    Object.keys(e.n).forEach((k) => { e.n[k] *= f; });
    Object.assign(e, { menge: Number(menge), gramm: e.gramm * f, ml: e.ml * f });
  }
  return speichereTag(datum);
}

export function zutatEntfernen(datum, mahlzeitId, eintragId) {
  const tag = holeTag(datum);
  const m = tag.mahlzeiten.find((x) => x.id === mahlzeitId);
  if (!m) return null;
  m.eintraege = m.eintraege.filter((x) => x.id !== eintragId);
  return speichereTag(datum);
}

export function mahlzeitHinzu(datum, name) {
  const tag = holeTag(datum);
  tag.mahlzeiten.push({ id: neueId('m'), name, eintraege: [] });
  return speichereTag(datum);
}

export function mahlzeitEntfernen(datum, mahlzeitId) {
  const tag = holeTag(datum);
  tag.mahlzeiten = tag.mahlzeiten.filter((x) => x.id !== mahlzeitId);
  return speichereTag(datum);
}

export function setzeVital(datum, key, wert) {
  const tag = holeTag(datum);
  tag.vital = { ...(tag.vital || {}) };
  if (wert === null) delete tag.vital[key]; else tag.vital[key] = wert;
  return speichereTag(datum);
}

export function setzeNotiz(datum, text) {
  holeTag(datum).notiz = text;
  return speichereTag(datum);
}

/* ---------- Produkte ---------- */

/** Produkt anlegen oder ersetzen. Das Foto (data-URL) geht getrennt ins Repository. */
export async function speichereProdukt(p, foto) {
  const jetzt = new Date().toISOString();
  const neu = !p.id || !state.produkte[p.id];
  const id = p.id || `p-${slug(`${p.name} ${p.marke || ''}`) || 'produkt'}-${Math.random().toString(36).slice(2, 6)}`;
  const eintrag = {
    schema: 'naehrwert/produkt/1',
    ...p,
    id,
    angelegt: p.angelegt || jetzt,
    geaendert: jetzt
  };
  delete eintrag.vorschau;
  delete eintrag.hinweise;
  if (foto) eintrag.bild = true;
  state.produkte[id] = eintrag;
  zeigeSpeicherstand('laeuft');
  const r = await saveProdukte(state.produkte, `${neu ? 'Neu' : 'Geändert'}: ${eintrag.name}`);
  if (foto) await saveBild(id, foto);
  zeigeSpeicherstand(r.ok ? r.text : 'fehler', r.detail);
  return eintrag;
}

export async function loescheProdukt(id) {
  const p = state.produkte[id];
  if (!p) return;
  delete state.produkte[id];
  const r = await saveProdukte(state.produkte, `Gelöscht: ${p.name}`);
  if (p.bild) await loescheBild(id);
  zeigeSpeicherstand(r.ok ? r.text : 'fehler', r.detail);
}

export async function speichereCfg() {
  const r = await saveConfig(state.cfg);
  zeigeSpeicherstand(r.ok ? r.text : 'fehler', r.detail);
  return r;
}
