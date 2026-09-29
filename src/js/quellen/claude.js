/* Claude als Leser und Rechercheur — direkt gegen die Anthropic-API.

   1. leseEtikett(): Fotos einer Packung -> Produktentwurf. Die Antwort ist per
      Structured Output auf ein festes JSON-Schema gezwungen, damit nichts
      geraten geparst werden muss.
   2. recherchiere(): ein Lebensmittel per Websuche nachschlagen. Die Websuche
      liefert Zitate, die sich nicht mit Structured Output vertragen — hier
      kommt das JSON deshalb als Codeblock im Text und wird ausgeschnitten.

   Wie im Wochenbogen: roher fetch statt SDK, weil die Seite ohne Build und
   ohne Laufzeitabhaengigkeit starten soll. Der Schluessel liegt im
   localStorage dieses Browsers und geht nur an api.anthropic.com. Fuer eine
   private Seite mit einem Nutzer vertretbar, fuer eine oeffentliche nicht.

   Ein Ergebnis wird NIE ungesehen gespeichert — die Oberflaeche zeigt es
   immer erst im Produkt-Editor zur Kontrolle. */

import { settings } from '../settings.js';
import { NAEHRSTOFFE, ergaenzeAbgeleitete, runde } from '../naehrstoffe.js';

const URL_MESSAGES = 'https://api.anthropic.com/v1/messages';
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

const KEYS = NAEHRSTOFFE.map((n) => n.key);
const KATALOG_TEXT = NAEHRSTOFFE.map((n) => `${n.key} (${n.unit}) — ${n.de} / ${n.en}`).join('\n');

export const claudeVerfuegbar = () => !!settings().anthropic.key;

const fehler = (text, code) => Object.assign(new Error(text), { code });

/* Ein Aufruf. Mit serverseitigem Fallback bei Ablehnung durch die
   Sicherheitsklassifikatoren; lehnt die API den Parameter ab, einmal ohne. */
async function rufe(body, signal, mitFallback = true) {
  const a = settings().anthropic;
  if (!a.key) throw fehler('kein Schlüssel', 'not_granted');
  const kopf = {
    'content-type': 'application/json',
    'x-api-key': a.key,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true'
  };
  if (mitFallback) kopf['anthropic-beta'] = FALLBACK_BETA;
  let res;
  try {
    res = await fetch(URL_MESSAGES, {
      method: 'POST',
      signal,
      headers: kopf,
      body: JSON.stringify({ model: a.model || 'claude-opus-5-5', ...body, ...(mitFallback ? { fallbacks: 'default' } : {}) })
    });
  } catch (err) {
    if (err && err.name === 'AbortError') throw fehler('abgebrochen', 'cancelled');
    throw fehler(err.message || 'Netzfehler', 'network');
  }
  if (!res.ok) {
    let detail = '';
    try { detail = ((await res.json()).error || {}).message || ''; } catch { /* ohne Koerper */ }
    if (res.status === 400 && mitFallback && /fallback|beta/i.test(detail)) return rufe(body, signal, false);
    const code = res.status === 401 || res.status === 403 ? 'not_granted' : res.status === 429 ? 'rate_limited' : 'error';
    throw fehler(detail || `HTTP ${res.status}`, code);
  }
  const msg = await res.json();
  if (msg.stop_reason === 'refusal') throw fehler('Anfrage abgelehnt', 'refusal');
  return msg;
}

const textVon = (msg) => (msg.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');

/* Antwort (ob Structured Output oder Codeblock) -> Produktentwurf. */
export function entwurfAusAntwort(j, art) {
  const naehrwerte = {};
  (j.naehrwerte || []).forEach((x) => {
    if (KEYS.includes(x.key) && x.wert !== null && x.wert !== undefined && !isNaN(Number(x.wert))) {
      naehrwerte[x.key] = runde(Number(x.wert), 4);
    }
  });
  ergaenzeAbgeleitete(naehrwerte);
  const pos = (v) => (Number(v) > 0 ? Number(v) : null);
  return {
    name: j.name || '',
    marke: j.marke || '',
    ean: String(j.ean || '').replace(/\D/g, ''),
    basis: j.basis === 'ml' ? 'ml' : 'g',
    packung: pos(j.packung_menge) ? { menge: pos(j.packung_menge), einheit: j.packung_einheit === 'ml' ? 'ml' : 'g' } : null,
    portionen: pos(j.portion_g) && j.portion_name ? [{ name: j.portion_name, g: pos(j.portion_g) }] : [],
    dichte: pos(j.dichte),
    el_g: pos(j.el_g),
    naehrwerte,
    hinweise: j.hinweise || '',
    quelle: {
      art,
      ref: (j.quellen || []).join(' '),
      datum: new Date().toISOString().slice(0, 10)
    }
  };
}

const SCHEMA_ETIKETT = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    marke: { type: 'string' },
    ean: { type: 'string' },
    basis: { type: 'string', enum: ['g', 'ml'] },
    packung_menge: { type: 'number' },
    packung_einheit: { type: 'string', enum: ['g', 'ml'] },
    portion_name: { type: 'string' },
    portion_g: { type: 'number' },
    dichte: { type: 'number' },
    el_g: { type: 'number' },
    naehrwerte: {
      type: 'array',
      items: {
        type: 'object',
        properties: { key: { type: 'string', enum: KEYS }, wert: { type: 'number' } },
        required: ['key', 'wert'],
        additionalProperties: false
      }
    },
    hinweise: { type: 'string' }
  },
  required: ['name', 'marke', 'ean', 'basis', 'packung_menge', 'packung_einheit', 'portion_name', 'portion_g', 'dichte', 'el_g', 'naehrwerte', 'hinweise'],
  additionalProperties: false
};

const FELDREGELN = `Felder:
- name: Produktname wie auf der Packung (mit Sorte, z. B. "Speisequark Magerstufe, laktosefrei").
- marke: Marke/Hersteller, sonst "".
- ean: Barcode-Ziffern, nur wenn lesbar und nicht nur Nullen, sonst "".
- basis: "g", wenn die Tabelle "pro 100 g" angibt, "ml" bei "pro 100 ml".
- packung_menge / packung_einheit: Füllmenge der Packung (z. B. 250 / "g", 1000 / "ml"), 0 wenn unbekannt.
- portion_name / portion_g: eine auf der Packung genannte Portion in Gramm (z. B. "Portion" / 30), sonst "" / 0.
- dichte: Dichte in g/ml, geschätzt aus der Produktart (Wasser/Milch ≈ 1,03, Öl ≈ 0,92, Honig ≈ 1,4, Mehl ≈ 0,55, Quark ≈ 1,05).
- el_g: typisches Gewicht eines gestrichenen Esslöffels dieses Produkts in Gramm (Quark ≈ 20, Öl ≈ 10, Zucker ≈ 12, Mehl ≈ 8, Milch ≈ 15).
- naehrwerte: je 100 g bzw. 100 ml, NUR aus diesen Schlüsseln und in genau diesen Einheiten (umrechnen, falls die Quelle andere Einheiten nutzt):
${KATALOG_TEXT}
  Energie als kcal UND kJ, wenn beide angegeben sind. "< 0,1 g" als 0,05 eintragen. Keine Prozentwerte (% RM) übernehmen — nur Mengen.
- hinweise: kurz, was unsicher oder schlecht lesbar war; sonst "".`;

/**
 * Nährwertangaben von Packungsfotos lesen.
 * @param {string[]} bilder  data:image/jpeg;base64,... (1 bis 4 Fotos)
 */
export async function leseEtikett(bilder, { signal } = {}) {
  const inhalt = bilder.map((d) => ({
    type: 'image',
    source: { type: 'base64', media_type: d.slice(5, d.indexOf(';')), data: d.split(',')[1] }
  }));
  inhalt.push({
    type: 'text',
    text: `Diese Fotos zeigen ein Lebensmittelprodukt und seine Nährwerttabelle. Lies die Angaben genau ab — Ziffern nicht raten. Fehlt ein Wert in der Tabelle, lass ihn weg statt ihn zu schätzen (nur dichte und el_g sind Schätzungen).

${FELDREGELN}`
  });
  const msg = await rufe({
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA_ETIKETT } },
    messages: [{ role: 'user', content: inhalt }]
  }, signal);
  let j;
  try {
    j = JSON.parse(textVon(msg));
  } catch {
    throw fehler('Antwort nicht lesbar', 'parse');
  }
  return entwurfAusAntwort(j, 'foto');
}

/** JSON aus einem ```json-Block (oder dem letzten {...}) im Text schneiden. */
export function jsonAusText(text) {
  const block = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const kandidat = block ? block[1] : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  return JSON.parse(kandidat);
}

/**
 * Nährwerte eines Lebensmittels per Websuche recherchieren.
 * @param {string} begriff  z. B. "Haferflocken Vollkorn" oder "Kölln Blütenzarte Köllnflocken"
 */
export async function recherchiere(begriff, { signal, lang = 'de' } = {}) {
  const frage = `Recherchiere die Nährwerte je 100 g (bzw. 100 ml bei Getränken) für: "${begriff}".
Bevorzuge die Herstellerangabe, wenn ein Markenprodukt gemeint ist; bei Grundnahrungsmitteln den Bundeslebensmittelschlüssel, USDA oder vergleichbare Tabellen. Nimm Vitamine und Mineralstoffe auf, soweit eine seriöse Quelle sie angibt.

Antworte am Ende mit genau einem \`\`\`json-Codeblock, einem Objekt mit diesen Feldern (plus "quellen": Liste der benutzten URLs):
${FELDREGELN}
Der Name soll auf ${lang === 'en' ? 'Englisch' : 'Deutsch'} sein.`;

  const messages = [{ role: 'user', content: frage }];
  let msg;
  /* Lange Suchen koennen mit pause_turn anhalten — dann fortsetzen. */
  for (let i = 0; i < 4; i++) {
    // eslint-disable-next-line no-await-in-loop
    msg = await rufe({
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 6 }],
      messages
    }, signal);
    if (msg.stop_reason !== 'pause_turn') break;
    messages.push({ role: 'assistant', content: msg.content });
  }
  let j;
  try {
    j = jsonAusText(textVon(msg));
  } catch {
    throw fehler('Antwort nicht lesbar', 'parse');
  }
  return entwurfAusAntwort(j, 'claude-recherche');
}
