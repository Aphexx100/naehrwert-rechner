/* Ablage im Browser. Immer verfuegbar, immer sofort, nie synchronisiert.
   Zugleich Zwischenspeicher der entfernten Ablage: was hier liegt, ist
   auch ohne Netz sichtbar. Fotos liegen bewusst nicht hier — sie wuerden
   den localStorage (etwa 5 MB) schnell fuellen. */

const K_CFG = 'nwr.cfg.v1';
const K_PROD = 'nwr.produkte.v1';
const K_TAGE = 'nwr.tage.v1';

const lese = (k, fallback) => {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const schreibe = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
};

export const localStore = {
  id: 'local',

  async init() {
    try {
      localStorage.setItem('nwr.probe', '1');
      localStorage.removeItem('nwr.probe');
      return true;
    } catch {
      return false;
    }
  },

  async loadConfig() { return lese(K_CFG, null); },
  async saveConfig(cfg) {
    if (!schreibe(K_CFG, cfg)) throw new Error('localStorage');
  },

  async loadProdukte() { return lese(K_PROD, {}); },
  async saveProdukte(alle) {
    if (!schreibe(K_PROD, alle)) throw new Error('localStorage');
  },

  async loadTage() { return lese(K_TAGE, {}); },
  async saveTag(datum, tag) {
    const alle = lese(K_TAGE, {});
    if (tag) alle[datum] = tag; else delete alle[datum];
    if (!schreibe(K_TAGE, alle)) throw new Error('localStorage');
  },
  /** Tage aus der entfernten Ablage einmischen (entfernt gewinnt). */
  async mergeTage(neu) {
    const alle = lese(K_TAGE, {});
    Object.assign(alle, neu);
    schreibe(K_TAGE, alle);
    return alle;
  }
};
