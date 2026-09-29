/* USDA FoodData Central — amtliche US-Datenbank fuer Grundnahrungsmittel,
   mit vollstaendigen Vitaminen und Mineralien (was Packungen selten haben).
   Suche auf Englisch ("spinach raw", "oats"). Ohne eigenen Schluessel laeuft
   sie mit DEMO_KEY (knapp bemessen); ein kostenloser Schluessel von
   api.data.gov hebt die Grenze. Werte je 100 g. */

import { NAEHRSTOFFE, umrechnen, ergaenzeAbgeleitete, runde } from '../naehrstoffe.js';
import { settings } from '../settings.js';

const URL_SUCHE = 'https://api.nal.usda.gov/fdc/v1/foods/search';

/* Naehrstoffnummer -> Katalogschluessel. Bei mehreren Nummern gewinnt die
   erste in der Katalogliste (etwa Folat als DFE vor Folat gesamt). */
const NACH_NUMMER = {};
NAEHRSTOFFE.forEach((n) => (n.usda || []).forEach((nr, i) => { NACH_NUMMER[nr] = { key: n.key, rang: i }; }));

export function ausUsda(f) {
  const naehrwerte = {};
  const rang = {};
  (f.foodNutrients || []).forEach((x) => {
    const treffer = NACH_NUMMER[String(x.nutrientNumber)];
    if (!treffer || x.value === undefined || x.value === null) return;
    if (rang[treffer.key] !== undefined && rang[treffer.key] <= treffer.rang) return;
    const unit = String(x.unitName || '').toLowerCase();
    naehrwerte[treffer.key] = runde(umrechnen(Number(x.value), unit === 'kcal' ? 'kcal' : unit === 'kj' ? 'kJ' : unit, treffer.key), 3);
    rang[treffer.key] = treffer.rang;
  });
  ergaenzeAbgeleitete(naehrwerte);
  return {
    name: f.description ? f.description.charAt(0) + f.description.slice(1).toLowerCase() : '',
    marke: f.brandOwner || '',
    ean: f.gtinUpc || '',
    basis: 'g',
    packung: null,
    portionen: [],
    naehrwerte,
    quelle: { art: 'usda', ref: `https://fdc.nal.usda.gov/food-details/${f.fdcId}/nutrients`, datum: new Date().toISOString().slice(0, 10), typ: f.dataType }
  };
}

export async function usdaSuche(begriff) {
  const q = new URLSearchParams({
    query: begriff,
    pageSize: '15',
    dataType: 'Foundation,SR Legacy,Survey (FNDDS)',
    api_key: settings().usda.key || 'DEMO_KEY'
  });
  const r = await fetch(`${URL_SUCHE}?${q}`);
  if (r.status === 429) throw Object.assign(new Error('USDA: Abfragegrenze erreicht'), { code: 'rate_limited' });
  if (!r.ok) throw new Error(`USDA ${r.status}`);
  const j = await r.json();
  return (j.foods || []).map(ausUsda).filter((p) => Object.keys(p.naehrwerte).length);
}
