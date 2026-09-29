/* Nährwert-Quelle — Lesezugriff auf die Daten des Nährwert-Rechners.

   Für den Peptid-Wochenbogen (oder jedes andere Programm) gedacht: diese
   eine Datei kopieren, importieren, fertig. Keine Abhängigkeiten, läuft im
   Browser und in Node ab Version 18 (fetch, atob, TextDecoder).

   Nur lesend. Geschrieben wird ausschließlich vom Nährwert-Rechner selbst,
   damit es genau eine Stelle gibt, die das Format verantwortet.

   Beispiel (Wochenbogen, gleicher Zugriffsschlüssel):

     import { naehrwertQuelle } from './naehrwert-quelle.js';
     const q = naehrwertQuelle({ owner: 'Aphexx100', repo: 'naehrwert-daten', token });
     const w = await q.woche('2026-10-03');   // Wochenschlüssel = letzter Tag
     w.mittel.copper        // mg Kupfer je erfasstem Tag
     w.anteilMittel.copper  // % des Tagesziels
     w.vitalMittel.gewicht  // kg

   Das Format ist in docs/SCHNITTSTELLE.md beschrieben; schema.json im
   Datenrepository nennt Schlüssel, Einheiten und Vorgabeziele. */

export const UNTERSTUETZTE_VERSION = 1;

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function plusTage(datum, n) {
  const t = new Date(`${datum}T12:00:00`);
  t.setDate(t.getDate() + n);
  return iso(t);
}

function dec(b64) {
  const bin = atob(String(b64).replace(/\n/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** Hat der Tag Inhalt? Leere Tage zählen in keinem Mittelwert. */
export const tagErfasst = (tag) => !!tag && (
  (tag.mahlzeiten || []).some((m) => (m.eintraege || []).length > 0)
  || Object.keys(tag.vital || {}).length > 0
);
const hatMahlzeiten = (tag) => !!tag && (tag.mahlzeiten || []).some((m) => (m.eintraege || []).length > 0);

/**
 * Tage zusammenfassen — reine Rechnung, auch ohne GitHub nutzbar.
 * @param {Object<string,object>} tage  datum -> Tag
 */
export function fasseZusammen(tage, von, bis) {
  const liste = Object.keys(tage).filter((d) => d >= von && d <= bis).sort().map((d) => tage[d]).filter(tagErfasst);
  const essen = liste.filter(hatMahlzeiten);
  const summe = {};
  const ziele = {};
  essen.forEach((t) => {
    Object.entries(t.summe || {}).forEach(([k, v]) => { summe[k] = (summe[k] || 0) + Number(v); });
    Object.assign(ziele, t.ziele || {});   /* jüngster Tag gewinnt */
  });
  const mittel = {};
  const anteilMittel = {};
  Object.entries(summe).forEach(([k, v]) => {
    mittel[k] = v / essen.length;
    if (ziele[k]) anteilMittel[k] = (mittel[k] / ziele[k]) * 100;
  });
  const vitalWerte = {};
  const vitalLetzter = {};
  liste.forEach((t) => Object.entries(t.vital || {}).forEach(([k, v]) => {
    (vitalWerte[k] = vitalWerte[k] || []).push(Number(v));
    vitalLetzter[k] = { datum: t.datum, wert: Number(v) };
  }));
  const vitalMittel = {};
  Object.entries(vitalWerte).forEach(([k, arr]) => { vitalMittel[k] = arr.reduce((a, b) => a + b, 0) / arr.length; });
  return {
    von,
    bis,
    tageErfasst: liste.length,
    tageMitMahlzeiten: essen.length,
    summe,
    mittel,
    ziele,
    anteilMittel,
    vitalMittel,
    vitalLetzter,
    tage: liste.map((t) => ({ datum: t.datum, summe: t.summe || {}, anteil: t.anteil || {}, vital: t.vital || {} }))
  };
}

/**
 * @param {{owner:string, repo:string, token:string, branch?:string, pfad?:string, fetch?:Function}} cfg
 */
export function naehrwertQuelle(cfg) {
  const { owner, repo, token } = cfg;
  const branch = cfg.branch || 'main';
  const pfad = (cfg.pfad || 'naehrwerte').replace(/^\/|\/$/g, '');
  const f = cfg.fetch || globalThis.fetch.bind(globalThis);
  if (!owner || !repo || !token) throw new Error('naehrwertQuelle: owner, repo und token angeben');

  async function api(p) {
    const r = await f(`https://api.github.com/repos/${owner}/${repo}${p}`, {
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`GitHub ${r.status}`);
    return r.json();
  }

  async function json(datei) {
    const r = await api(`/contents/${pfad}/${datei}?ref=${encodeURIComponent(branch)}`);
    if (!r || Array.isArray(r)) return null;
    let b64 = r.content;
    if (!b64 && r.sha) {
      const b = await api(`/git/blobs/${r.sha}`);   /* Dateien über 1 MB */
      b64 = b && b.content;
    }
    return b64 ? JSON.parse(dec(b64)) : null;
  }

  let schemaCache = null;
  async function schema() {
    if (!schemaCache) {
      schemaCache = await json('schema.json');
      if (schemaCache && schemaCache.version > UNTERSTUETZTE_VERSION) {
        throw new Error(`naehrwertQuelle: Datenformat ${schemaCache.version}, diese Datei kennt ${UNTERSTUETZTE_VERSION} — neue Fassung kopieren`);
      }
    }
    return schemaCache;
  }

  async function tage(von, bis) {
    await schema();
    const out = {};
    const namen = [];
    for (let j = Number(von.slice(0, 4)); j <= Number(bis.slice(0, 4)); j++) {
      // eslint-disable-next-line no-await-in-loop
      const liste = await api(`/contents/${pfad}/tage/${j}?ref=${encodeURIComponent(branch)}`);
      (Array.isArray(liste) ? liste : []).forEach((x) => {
        const d = x.name.replace(/\.json$/, '');
        if (x.type === 'file' && d >= von && d <= bis) namen.push(d);
      });
    }
    for (let i = 0; i < namen.length; i += 8) {
      // eslint-disable-next-line no-await-in-loop
      const teil = await Promise.all(namen.slice(i, i + 8).map(async (d) => [d, await json(`tage/${d.slice(0, 4)}/${d}.json`)]));
      teil.forEach(([d, v]) => { if (v) out[d] = v; });
    }
    return out;
  }

  return {
    schema,
    tage,
    async tag(datum) {
      await schema();
      return json(`tage/${datum.slice(0, 4)}/${datum}.json`);
    },
    async zusammenfassung(von, bis) {
      return fasseZusammen(await tage(von, bis), von, bis);
    },
    /** Sieben Tage bis einschließlich schluessel — passt zum Wochenschlüssel des Wochenbogens. */
    async woche(schluessel) {
      const von = plusTage(schluessel, -6);
      return fasseZusammen(await tage(von, schluessel), von, schluessel);
    },
    async produkte() {
      const p = await json('produkte.json');
      return p && p.produkte ? p.produkte : {};
    },
    async config() { return json('config.json'); }
  };
}
