/* Ablage in einem privaten GitHub-Repository ueber die Contents-API.

   Aufbau im Datenrepository (Einzelheiten: docs/SCHNITTSTELLE.md):
     <pfad>/schema.json                 Naehrstoffkatalog + Formatversion
     <pfad>/config.json                 Ziele, Haushaltsmasse, Mahlzeiten
     <pfad>/produkte.json               alle Produkte, ohne Fotos
     <pfad>/bilder/<produkt-id>.jpg     Foto je Produkt (optional)
     <pfad>/tage/YYYY/YYYY-MM-DD.json   ein Tag je Datei

   Eine Datei je Tag, damit jeder Tag als eigener Commit lesbar bleibt und ein
   fehlerhafter Schreibvorgang hoechstens einen Tag beschaedigt. Jahresordner,
   weil die Contents-API je Verzeichnis nur 1000 Eintraege auflistet.

   Das Datenrepository muss privat sein. Der Zugriffsschluessel steht im
   localStorage des Browsers, nie im Repository. */

import { settings, ghKomplett } from '../settings.js';

const API = 'https://api.github.com';

/* Base64 mit korrekter UTF-8-Behandlung — btoa allein verschluckt Umlaute. */
export const enc = (str) => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
};

export const dec = (b64) => {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

/* Bekannte Datei-SHAs — GitHub verlangt beim Ueberschreiben den SHA der
   Vorgaengerversion. */
const shas = new Map();
/* Schreibvorgaenge je Pfad nacheinander, sonst ueberholt ein zweiter
   Schreibvorgang den ersten mit einem veralteten SHA. */
const schlangen = new Map();

function cfgOrThrow() {
  const g = settings().gh;
  if (!ghKomplett(g)) throw new Error('GitHub ist nicht eingerichtet');
  return g;
}

async function api(pfad, opts = {}) {
  const g = cfgOrThrow();
  const res = await fetch(`${API}${pfad}`, {
    ...opts,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${g.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.headers || {})
    }
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json()).message || '';
    } catch { /* ohne JSON-Koerper */ }
    throw Object.assign(new Error(`GitHub ${res.status}${detail ? `: ${detail}` : ''}`), { status: res.status });
  }
  return res.status === 204 ? null : res.json();
}

const repoPfad = () => {
  const g = cfgOrThrow();
  return `/repos/${g.owner}/${g.repo}`;
};
const basis = () => `${repoPfad()}/contents/${settings().gh.pfad || 'naehrwerte'}`;
const refQuery = () => {
  const g = settings().gh;
  return g.branch ? `?ref=${encodeURIComponent(g.branch)}` : '';
};

/* Datei lesen. Ueber 1 MB liefert die Contents-API keinen Inhalt mehr —
   dann ueber die Blob-API (bis 100 MB). */
async function leseRoh(pfad) {
  const r = await api(`${pfad}${refQuery()}`);
  if (!r || Array.isArray(r)) return null;
  shas.set(pfad, r.sha);
  if (r.content) return r.content;
  if (r.sha) {
    const b = await api(`${repoPfad()}/git/blobs/${r.sha}`);
    return b && b.content ? b.content : null;
  }
  return null;
}

async function leseJson(pfad) {
  const b64 = await leseRoh(pfad);
  if (!b64) return null;
  try {
    return JSON.parse(dec(b64));
  } catch {
    return null;
  }
}

async function schreibeRoh(pfad, b64, nachricht) {
  const g = cfgOrThrow();
  if (!shas.has(pfad)) {
    const vorhanden = await api(`${pfad}${refQuery()}`);
    if (vorhanden && vorhanden.sha) shas.set(pfad, vorhanden.sha);
  }
  const body = {
    message: nachricht,
    content: b64,
    ...(g.branch ? { branch: g.branch } : {}),
    ...(shas.has(pfad) ? { sha: shas.get(pfad) } : {})
  };
  let r;
  try {
    r = await api(pfad, { method: 'PUT', body: JSON.stringify(body) });
  } catch (err) {
    /* 409/422: die Datei hat sich inzwischen geaendert. Einmal mit frischem
       SHA wiederholen, statt den Schreibvorgang zu verlieren. */
    if (err.status === 409 || err.status === 422) {
      shas.delete(pfad);
      const vorhanden = await api(`${pfad}${refQuery()}`);
      if (vorhanden && vorhanden.sha) body.sha = vorhanden.sha; else delete body.sha;
      r = await api(pfad, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      throw err;
    }
  }
  if (r && r.content && r.content.sha) shas.set(pfad, r.content.sha);
}

function eingereiht(pfad, arbeit) {
  const vorher = schlangen.get(pfad) || Promise.resolve();
  const jetzt = vorher.catch(() => {}).then(arbeit);
  schlangen.set(pfad, jetzt);
  return jetzt;
}

const schreibeJson = (pfad, obj, nachricht) =>
  eingereiht(pfad, () => schreibeRoh(pfad, enc(`${JSON.stringify(obj, null, 2)}\n`), nachricht));

async function loescheDatei(pfad, nachricht) {
  return eingereiht(pfad, async () => {
    const g = cfgOrThrow();
    const vorhanden = await api(`${pfad}${refQuery()}`);
    if (!vorhanden || !vorhanden.sha) return;
    await api(pfad, {
      method: 'DELETE',
      body: JSON.stringify({ message: nachricht, sha: vorhanden.sha, ...(g.branch ? { branch: g.branch } : {}) })
    });
    shas.delete(pfad);
  });
}

const tagPfad = (datum) => `${basis()}/tage/${datum.slice(0, 4)}/${datum}.json`;

export const githubStore = {
  id: 'github',

  async init() {
    if (!ghKomplett()) return false;
    try {
      return !!(await api(repoPfad()));
    } catch {
      return false;
    }
  },

  loadConfig: () => leseJson(`${basis()}/config.json`),
  saveConfig: (cfg) => schreibeJson(`${basis()}/config.json`, cfg, 'Einstellungen'),

  loadSchema: () => leseJson(`${basis()}/schema.json`),
  saveSchema: (s) => schreibeJson(`${basis()}/schema.json`, s, 'Schema'),

  async loadProdukte() {
    const p = await leseJson(`${basis()}/produkte.json`);
    return p && p.produkte ? p.produkte : {};
  },
  saveProdukte: (alle, nachricht) =>
    schreibeJson(`${basis()}/produkte.json`, { schema: 'naehrwert/produkte/1', produkte: alle }, nachricht || 'Produkte'),

  /** Tage im Zeitraum [von, bis] laden. Liest nur die Jahresordner, die
      der Zeitraum beruehrt, und nur die Dateien darin, die passen. */
  async loadTage(von, bis) {
    const out = {};
    const jahre = [];
    for (let j = Number(von.slice(0, 4)); j <= Number(bis.slice(0, 4)); j++) jahre.push(j);
    const dateien = [];
    for (const j of jahre) {
      // eslint-disable-next-line no-await-in-loop
      const liste = await api(`${basis()}/tage/${j}${refQuery()}`);
      if (!Array.isArray(liste)) continue;
      liste.forEach((f) => {
        const d = f.name.replace(/\.json$/, '');
        if (f.type === 'file' && d >= von && d <= bis) {
          shas.set(`${basis()}/tage/${j}/${f.name}`, f.sha);
          dateien.push(d);
        }
      });
    }
    for (let i = 0; i < dateien.length; i += 8) {
      // eslint-disable-next-line no-await-in-loop
      const teil = await Promise.all(dateien.slice(i, i + 8).map(async (d) => [d, await leseJson(tagPfad(d))]));
      teil.forEach(([d, v]) => { if (v) out[d] = v; });
    }
    return out;
  },

  saveTag(datum, tag) {
    if (!tag) return loescheDatei(tagPfad(datum), `Tag ${datum} geleert`);
    return schreibeJson(tagPfad(datum), tag, `Tag ${datum}`);
  },

  async loadBild(id) {
    const b64 = await leseRoh(`${basis()}/bilder/${id}.jpg`);
    return b64 ? `data:image/jpeg;base64,${b64.replace(/\n/g, '')}` : null;
  },
  saveBild(id, dataUrl) {
    const pfad = `${basis()}/bilder/${id}.jpg`;
    return eingereiht(pfad, () => schreibeRoh(pfad, dataUrl.split(',')[1], `Foto ${id}`));
  },
  loescheBild: (id) => loescheDatei(`${basis()}/bilder/${id}.jpg`, `Foto ${id} entfernt`)
};

/** Zugangsdaten pruefen, ohne etwas zu schreiben. */
export async function testeGithub() {
  const g = settings().gh;
  if (!ghKomplett(g)) return { ok: false, code: 'unvollstaendig' };
  try {
    const r = await api(`/repos/${g.owner}/${g.repo}`);
    if (!r) return { ok: false, code: 'nicht_gefunden' };
    if (!r.permissions || !r.permissions.push) return { ok: false, code: 'kein_schreibrecht' };
    return { ok: true, code: r.private ? 'privat' : 'oeffentlich', name: r.full_name };
  } catch (err) {
    return { ok: false, code: 'fehler', text: String(err.message || err) };
  }
}
