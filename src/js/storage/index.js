/* Die eine Ablage, die der Rest der Anwendung kennt.

   localStorage ist immer dabei und haelt eine Kopie. Zusaetzlich kann ein
   privates GitHub-Repository aktiv sein. Geschrieben wird immer zuerst lokal
   (kann nicht fehlschlagen) und danach entfernt (kann fehlschlagen, wird
   gemeldet). Gelesen wird umgekehrt: die entfernte Ablage gewinnt. */

import { localStore } from './local.js';
import { githubStore } from './github.js';
import { settings } from '../settings.js';
import { schemaDokument } from '../schema-dokument.js';

let remote = null;

export async function initStorage() {
  await localStore.init();
  remote = null;
  if (settings().backend !== 'local' && (await githubStore.init())) remote = githubStore;
  if (remote) {
    /* Das Schema beschreibt das Datenformat fuer fremde Leser (Wochenbogen).
       Fehlt es oder ist es aelter, wird es neu geschrieben. */
    try {
      const s = await remote.loadSchema();
      const neu = schemaDokument();
      if (!s || s.version !== neu.version || (s.naehrstoffe || []).length !== neu.naehrstoffe.length) {
        await remote.saveSchema(neu);
      }
    } catch { /* nicht kritisch */ }
  }
  return { remote: remote ? remote.id : null };
}

export const hatRemote = () => !!remote;

const ok = (text) => ({ ok: true, text });
const halb = (err) => ({ ok: false, text: 'lokal', detail: err && err.message ? err.message : String(err) });

async function beide(lokal, entfernt) {
  await lokal();
  if (!remote) return ok('lokal');
  try {
    await entfernt();
    return ok('github');
  } catch (err) {
    return halb(err);
  }
}

export async function loadConfig() {
  if (remote) {
    try {
      const c = await remote.loadConfig();
      if (c) { await localStore.saveConfig(c); return c; }
    } catch { /* lokale Kopie */ }
  }
  return localStore.loadConfig();
}

export const saveConfig = (cfg) => beide(() => localStore.saveConfig(cfg), () => remote.saveConfig(cfg));

export async function loadProdukte() {
  if (remote) {
    try {
      const p = await remote.loadProdukte();
      if (p && Object.keys(p).length) { await localStore.saveProdukte(p); return p; }
    } catch { /* lokale Kopie */ }
  }
  return localStore.loadProdukte();
}

export const saveProdukte = (alle, nachricht) =>
  beide(() => localStore.saveProdukte(alle), () => remote.saveProdukte(alle, nachricht));

/** Tage laden: lokale Kopie, darueber die entfernten Tage des Zeitraums. */
export async function loadTage(von, bis) {
  let alle = await localStore.loadTage();
  if (remote) {
    try {
      const neu = await remote.loadTage(von, bis);
      alle = await localStore.mergeTage(neu);
    } catch { /* lokale Kopie */ }
  }
  return alle;
}

export const saveTag = (datum, tag) =>
  beide(() => localStore.saveTag(datum, tag), () => remote.saveTag(datum, tag));

/* Fotos nur entfernt; ohne Repository bleibt das Foto in der Sitzung. */
export async function saveBild(id, dataUrl) {
  if (!remote) return ok('sitzung');
  try { await remote.saveBild(id, dataUrl); return ok('github'); } catch (err) { return halb(err); }
}
export async function loadBild(id) {
  if (!remote) return null;
  try { return await remote.loadBild(id); } catch { return null; }
}
export async function loescheBild(id) {
  if (remote) { try { await remote.loescheBild(id); } catch { /* egal */ } }
}

/** Alle lokalen Daten einmalig in das Repository schieben. */
export async function pushAlles(onFortschritt) {
  if (!remote) throw new Error('keine entfernte Ablage');
  const cfg = await localStore.loadConfig();
  if (cfg) await remote.saveConfig(cfg);
  await remote.saveSchema(schemaDokument());
  await remote.saveProdukte(await localStore.loadProdukte(), 'Produkte hochgeladen');
  const tage = await localStore.loadTage();
  const ks = Object.keys(tage).sort();
  let n = 0;
  for (const k of ks) {
    // eslint-disable-next-line no-await-in-loop
    await remote.saveTag(k, tage[k]);
    n += 1;
    if (onFortschritt) onFortschritt(n, ks.length);
  }
  return n;
}
