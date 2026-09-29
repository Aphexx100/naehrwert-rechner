/* Open Food Facts — freie Produktdatenbank, stark bei deutschen
   Supermarktprodukten, per Barcode oder Suchbegriff. Kein Schluessel noetig.
   Naehrwerte stehen dort je 100 g/ml in Gramm (auch Vitamine) — umgerechnet
   wird in die Katalogeinheiten. */

import { NAEHRSTOFFE, umrechnen, ergaenzeAbgeleitete, runde } from '../naehrstoffe.js';

const BASIS = 'https://world.openfoodfacts.org';
const FELDER = 'code,product_name,product_name_de,product_name_en,brands,quantity,product_quantity,product_quantity_unit,nutriments,nutrition_data_per,serving_size,serving_quantity,image_front_small_url';

/** OFF-Produkt -> Produktentwurf im eigenen Format. */
export function ausOff(p, lang = 'de') {
  if (!p) return null;
  const nm = p.nutriments || {};
  const naehrwerte = {};
  NAEHRSTOFFE.forEach((n) => {
    const roh = nm[`${n.off}_100g`];
    if (roh === undefined || roh === null || roh === '' || isNaN(Number(roh))) return;
    /* OFF speichert Energie in kcal/kJ, alles andere in g. */
    const von = n.unit === 'kcal' || n.unit === 'kJ' ? n.unit : 'g';
    naehrwerte[n.key] = runde(umrechnen(Number(roh), von, n.key), 3);
  });
  ergaenzeAbgeleitete(naehrwerte);
  /* "nutrition_data_per" ist meist 100g; Getraenke tragen ml in der Menge. */
  const unit = String(p.product_quantity_unit || '').toLowerCase();
  const basis = unit === 'ml' || /\bml\b|\bl\b/i.test(p.quantity || '') ? 'ml' : 'g';
  const menge = Number(p.product_quantity) > 0 ? Number(p.product_quantity) : null;
  const portionen = Number(p.serving_quantity) > 0 ? [{ name: p.serving_size || 'Portion', g: Number(p.serving_quantity) }] : [];
  return {
    name: p[`product_name_${lang}`] || p.product_name_de || p.product_name || p.product_name_en || '',
    marke: (p.brands || '').split(',')[0].trim(),
    ean: p.code || '',
    basis,
    packung: menge ? { menge, einheit: basis } : null,
    portionen,
    naehrwerte,
    quelle: { art: 'openfoodfacts', ref: p.code ? `${BASIS}/product/${p.code}` : '', datum: new Date().toISOString().slice(0, 10) },
    vorschau: p.image_front_small_url || ''
  };
}

export async function offBarcode(ean, lang) {
  const r = await fetch(`${BASIS}/api/v2/product/${encodeURIComponent(ean)}.json?fields=${FELDER}`);
  if (!r.ok) return null;
  const j = await r.json();
  return j && j.status === 1 ? ausOff(j.product, lang) : null;
}

export async function offSuche(begriff, lang) {
  const q = new URLSearchParams({
    search_terms: begriff, search_simple: '1', action: 'process', json: '1', page_size: '20', fields: FELDER
  });
  const r = await fetch(`${BASIS}/cgi/search.pl?${q}`);
  if (!r.ok) throw new Error(`Open Food Facts ${r.status}`);
  const j = await r.json();
  return (j.products || [])
    .map((p) => ausOff(p, lang))
    .filter((p) => p && p.name && Object.keys(p.naehrwerte).length);
}
