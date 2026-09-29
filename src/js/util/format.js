import { sprache } from '../i18n.js';

const loc = () => (sprache() === 'en' ? 'en-GB' : 'de-DE');

/** Zahl in der aktiven Sprache; ohne Stellenangabe nach Groessenordnung. */
export function fmt(n, stellen) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const x = Number(n);
  let d = stellen;
  if (d === undefined) {
    const a = Math.abs(x);
    d = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 1 : a === 0 ? 0 : 2;
  }
  return x.toLocaleString(loc(), { minimumFractionDigits: 0, maximumFractionDigits: d });
}

/** Zahl aus einem Eingabefeld — Komma oder Punkt. Leer -> null. */
export function zahl(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().replace(',', '.');
  if (s === '' || isNaN(Number(s))) return null;
  return Number(s);
}

export const datumLang = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(loc(), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export const datumKurz = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(loc(), { day: 'numeric', month: 'numeric' });
