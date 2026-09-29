/* Haushaltsmasse und ihre Umrechnung in die Bezugsmenge eines Produkts.

   Genau muss das nicht sein — ein Esslöffel Quark wiegt je nach Hand 15 bis
   25 g. Deshalb die Reihenfolge: was das Produkt selbst weiss (eigene
   Löffelgewichte, Portionen, Dichte), schlaegt die allgemeine Vorgabe.

   Vorgaben (in den Einstellungen anpassbar):
     EL 15 ml · TL 5 ml · Tasse 200 ml · Glas 200 ml · Prise 0,4 g */

export const MASS_VORGABE = { el_ml: 15, tl_ml: 5, tasse_ml: 200, glas_ml: 200, prise_g: 0.4 };

/** Einheiten, die jedes Produkt hat. Portionen des Produkts kommen dazu. */
export const EINHEITEN = [
  { id: 'g', art: 'masse', faktor: 1 },
  { id: 'kg', art: 'masse', faktor: 1000 },
  { id: 'ml', art: 'volumen', faktor: 1 },
  { id: 'l', art: 'volumen', faktor: 1000 },
  { id: 'EL', art: 'loeffel' },
  { id: 'TL', art: 'loeffel' },
  { id: 'Tasse', art: 'volumen', mass: 'tasse_ml' },
  { id: 'Glas', art: 'volumen', mass: 'glas_ml' },
  { id: 'Prise', art: 'masse', mass: 'prise_g' },
  { id: 'Packung', art: 'packung' }
];

/** Dichte in g/ml; ohne Angabe wie Wasser. */
export const dichte = (p) => (p && Number(p.dichte) > 0 ? Number(p.dichte) : 1);

/**
 * Menge in einer Einheit -> { g, ml } (beides, aus der Dichte abgeleitet).
 * @param {number} menge
 * @param {string} einheit  g, ml, EL, TL, Tasse, ... oder "portion:<name>"
 * @param {object} produkt  mit dichte, el_g, tl_g, portionen, packung
 * @param {object} masse    Haushaltsmasse aus der Konfiguration
 * @returns {{g:number, ml:number}|null}
 */
export function inGrammUndMl(menge, einheit, produkt = {}, masse = MASS_VORGABE) {
  const m = Number(menge);
  if (!isFinite(m) || m < 0) return null;
  const d = dichte(produkt);
  const mv = { ...MASS_VORGABE, ...(masse || {}) };
  const ausG = (g) => ({ g, ml: g / d });
  const ausMl = (ml) => ({ g: ml * d, ml });

  if (String(einheit).startsWith('portion:')) {
    const name = einheit.slice(8);
    const p = (produkt.portionen || []).find((x) => x.name === name);
    if (!p) return null;
    return ausG(m * Number(p.g));
  }

  switch (einheit) {
    case 'g': return ausG(m);
    case 'kg': return ausG(m * 1000);
    case 'ml': return ausMl(m);
    case 'l': return ausMl(m * 1000);
    /* Loeffel: ein am Produkt hinterlegtes Gewicht gewinnt — Quark, Honig
       und Mehl verhalten sich auf dem Loeffel sehr unterschiedlich. */
    case 'EL': return Number(produkt.el_g) > 0 ? ausG(m * Number(produkt.el_g)) : ausMl(m * mv.el_ml);
    case 'TL':
      if (Number(produkt.tl_g) > 0) return ausG(m * Number(produkt.tl_g));
      if (Number(produkt.el_g) > 0) return ausG(m * Number(produkt.el_g) / 3);
      return ausMl(m * mv.tl_ml);
    case 'Tasse': return ausMl(m * mv.tasse_ml);
    case 'Glas': return ausMl(m * mv.glas_ml);
    case 'Prise': return ausG(m * mv.prise_g);
    case 'Packung': {
      const pk = produkt.packung;
      if (!pk || !(Number(pk.menge) > 0)) return null;
      return pk.einheit === 'ml' ? ausMl(m * Number(pk.menge)) : ausG(m * Number(pk.menge));
    }
    default: return null;
  }
}

/** Welche Einheiten fuer dieses Produkt sinnvoll sind. */
export function einheitenFuer(produkt = {}) {
  const liste = EINHEITEN
    .filter((e) => e.id !== 'Packung' || (produkt.packung && Number(produkt.packung.menge) > 0))
    .map((e) => e.id);
  (produkt.portionen || []).forEach((p) => liste.push(`portion:${p.name}`));
  return liste;
}
