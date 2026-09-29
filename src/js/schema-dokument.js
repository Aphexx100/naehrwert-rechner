/* schema.json im Datenrepository: macht die Daten selbstbeschreibend.
   Ein fremder Leser (der Wochenbogen) findet hier Schluessel, Einheiten,
   Namen und Vorgabeziele, ohne diesen Code zu kennen.

   version: bei einer inkompatiblen Aenderung des Tagesformats erhoehen. */

import { NAEHRSTOFFE } from './naehrstoffe.js';
import { VITALWERTE } from './vitalwerte.js';

export const FORMAT_VERSION = 1;

export function schemaDokument() {
  return {
    schema: 'naehrwert/schema/1',
    version: FORMAT_VERSION,
    beschreibung: 'Nährwert-Rechner — Datenformat. Siehe docs/SCHNITTSTELLE.md im Code-Repository.',
    dateien: {
      config: 'config.json',
      produkte: 'produkte.json',
      tag: 'tage/{YYYY}/{YYYY-MM-DD}.json',
      bild: 'bilder/{produkt-id}.jpg'
    },
    naehrstoffe: NAEHRSTOFFE.map((n) => ({
      key: n.key, unit: n.unit, de: n.de, en: n.en, group: n.group, ziel: n.ziel, art: n.art
    })),
    vitalwerte: VITALWERTE.map((v) => ({ key: v.key, unit: v.unit, de: v.de, en: v.en }))
  };
}
