/* Die Vitalwerte eines Tages — Daten, keine Programmierung.
   Neue Messgroesse: Zeile ergaenzen. key NIE umbenennen (steht in den Tagen).

   bereich: Plausibilitaetsgrenzen fuer die Eingabe, keine medizinische Norm. */

export const VITALWERTE = [
  { key: 'gewicht', unit: 'kg', de: 'Gewicht', en: 'Weight', schritt: 0.1, bereich: [20, 350] },
  { key: 'koerperfett', unit: '%', de: 'Körperfett', en: 'Body fat', schritt: 0.1, bereich: [2, 70] },
  { key: 'bauchumfang', unit: 'cm', de: 'Bauchumfang', en: 'Waist', schritt: 0.5, bereich: [40, 250] },
  { key: 'rr_sys', unit: 'mmHg', de: 'Blutdruck systolisch', en: 'Blood pressure systolic', schritt: 1, bereich: [60, 260] },
  { key: 'rr_dia', unit: 'mmHg', de: 'Blutdruck diastolisch', en: 'Blood pressure diastolic', schritt: 1, bereich: [30, 160] },
  { key: 'puls', unit: '/min', de: 'Ruhepuls', en: 'Resting pulse', schritt: 1, bereich: [25, 220] },
  { key: 'glukose', unit: 'mg/dl', de: 'Blutzucker nüchtern', en: 'Fasting glucose', schritt: 1, bereich: [20, 600] },
  { key: 'temperatur', unit: '°C', de: 'Körpertemperatur', en: 'Body temperature', schritt: 0.1, bereich: [33, 43] },
  { key: 'spo2', unit: '%', de: 'Sauerstoffsättigung', en: 'SpO₂', schritt: 1, bereich: [60, 100] },
  { key: 'schlaf', unit: 'h', de: 'Schlaf', en: 'Sleep', schritt: 0.25, bereich: [0, 24] },
  { key: 'wasser', unit: 'ml', de: 'Getrunken (Wasser)', en: 'Water drunk', schritt: 50, bereich: [0, 10000] },
  { key: 'schritte', unit: '', de: 'Schritte', en: 'Steps', schritt: 100, bereich: [0, 100000] }
];

export const VITAL_NACH_KEY = Object.fromEntries(VITALWERTE.map((v) => [v.key, v]));
