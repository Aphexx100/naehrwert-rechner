/* Geraetegebundene Einstellungen: Datenablage, GitHub-Zugang,
   Anthropic- und USDA-Schluessel.

   Diese Werte liegen bewusst NUR im localStorage des jeweiligen Browsers und
   niemals im Repository. Sie sind Zugangsdaten, keine Ernaehrungsdaten. */

const KEY = 'nwr.settings.v1';

const LEER = {
  backend: 'auto',       /* auto | local | github */
  gh: { owner: '', repo: 'naehrwert-daten', branch: 'main', pfad: 'naehrwerte', token: '' },
  anthropic: { key: '', model: 'claude-opus-5-5' },
  usda: { key: '' }
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(LEER);
    const v = JSON.parse(raw);
    return {
      backend: v.backend || LEER.backend,
      gh: { ...LEER.gh, ...(v.gh || {}) },
      anthropic: { ...LEER.anthropic, ...(v.anthropic || {}) },
      usda: { ...LEER.usda, ...(v.usda || {}) }
    };
  } catch {
    return structuredClone(LEER);
  }
}

let cache = null;

export function settings() {
  if (!cache) cache = read();
  return cache;
}

/** Teilaenderung speichern. Gibt den neuen Stand zurueck. */
export function saveSettings(patch) {
  const s = settings();
  cache = {
    backend: patch.backend !== undefined ? patch.backend : s.backend,
    gh: { ...s.gh, ...(patch.gh || {}) },
    anthropic: { ...s.anthropic, ...(patch.anthropic || {}) },
    usda: { ...s.usda, ...(patch.usda || {}) }
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch { /* privater Modus — die Sitzung laeuft trotzdem */ }
  return cache;
}

export const ghKomplett = (g = settings().gh) => !!(g.owner && g.repo && g.token);

/** Welche Pflichtfelder fehlen — fuer eine Meldung, die das Feld beim Namen nennt. */
export const ghFehlt = (g = settings().gh) => ['owner', 'repo', 'token'].filter((k) => !g[k]);
