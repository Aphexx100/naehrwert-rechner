/* Der gemeinsame Laufzeitzustand — ein Objekt, damit jedes Modul ihn
   setzen kann (ES-Module exportieren Bindungen schreibgeschuetzt). */

import { MASS_VORGABE } from './masse.js';

export const CFG_VORGABE = {
  ziele: {},                 /* Abweichungen von den Katalog-Zielen */
  masse: { ...MASS_VORGABE },
  mahlzeiten: ['fruehstueck', 'mittag', 'abend', 'snack'],
  vital: ['gewicht', 'rr_sys', 'rr_dia', 'puls', 'schlaf', 'wasser']
};

export const state = {
  cfg: structuredClone(CFG_VORGABE),
  produkte: {},   /* id -> Produkt */
  tage: {},       /* 'YYYY-MM-DD' -> Tag */
  datum: ''       /* welcher Tag gerade offen ist */
};
