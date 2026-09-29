const pad = (n) => String(n).padStart(2, '0');

export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const heute = () => iso(new Date());

/** Datum um n Tage verschieben (YYYY-MM-DD). */
export function plusTage(d, n) {
  const t = new Date(`${d}T12:00:00`);
  t.setDate(t.getDate() + n);
  return iso(t);
}

/** Alle Tage von..bis einschliesslich. */
export function tageZwischen(von, bis) {
  const out = [];
  for (let d = von; d <= bis; d = plusTage(d, 1)) out.push(d);
  return out;
}

export const jetztZeit = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
