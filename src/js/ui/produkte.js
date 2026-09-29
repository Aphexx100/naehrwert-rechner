/* Produkte: Foto auslesen, recherchieren, Liste, Editor.

   Jeder Weg endet im Editor. Was Claude, Open Food Facts oder USDA liefern,
   ist ein Entwurf — gespeichert wird erst, wenn man ihn gesehen hat. */

import { $, el, fuelle } from '../util/dom.js';
import { fmt, zahl } from '../util/format.js';
import { t, nName, sprache } from '../i18n.js';
import { state } from '../state.js';
import { NAEHRSTOFFE, GRUPPEN, ergaenzeAbgeleitete } from '../naehrstoffe.js';
import { verkleinere, leseBarcode } from '../quellen/bild.js';
import { leseEtikett, recherchiere, claudeVerfuegbar } from '../quellen/claude.js';
import { offBarcode, offSuche } from '../quellen/openfoodfacts.js';
import { usdaSuche } from '../quellen/usda.js';
import { speichereProdukt, loescheProdukt } from '../aktionen.js';
import { loadBild } from '../storage/index.js';
import { produktLabel, renderTag } from './tag.js';

let fotos = [];      /* { datei, url } der aktuellen Aufnahme */
let barcode = null;

const melde = (id, text, art = '') => {
  const m = $(id);
  m.textContent = text;
  m.className = `meldung ${art}`;
};

const fehlerText = (err) => {
  const k = `fehler.${err && err.code ? err.code : 'error'}`;
  const x = t(k);
  return x === k ? `${t('fehler.error')} (${err && err.message ? err.message : err})` : x;
};

/* ---------------- Foto ---------------- */

function renderFotos() {
  fuelle($('fotoLeiste'), fotos.map((f, i) => el('figure', { class: 'foto' }, [
    el('img', { src: f.url, alt: t('prod.fotoNr', { n: i + 1 }) }),
    el('button', {
      type: 'button', class: 'foto-weg', 'aria-label': t('prod.fotoEntfernen'), text: '×',
      onclick: () => { URL.revokeObjectURL(f.url); fotos.splice(i, 1); renderFotos(); }
    })
  ])));
  $('fotoAktion').hidden = fotos.length === 0;
}

async function fotosDazu(dateien) {
  for (const d of dateien) {
    fotos.push({ datei: d, url: URL.createObjectURL(d) });
    // eslint-disable-next-line no-await-in-loop
    if (!barcode) barcode = await leseBarcode(d);
  }
  fotos = fotos.slice(-4);
  renderFotos();
  melde('fotoMeldung', claudeVerfuegbar() ? t('prod.fotoBereit', { n: fotos.length }) : t('prod.ohneClaude'));
}

function fotosVerwerfen() {
  fotos.forEach((f) => URL.revokeObjectURL(f.url));
  fotos = [];
  barcode = null;
  renderFotos();
  melde('fotoMeldung', '');
}

async function fotosLesen() {
  if (!fotos.length) return;
  if (!claudeVerfuegbar()) {
    /* Ohne Claude: Foto trotzdem am Produkt ablegen, Werte von Hand. */
    const vorschau = await verkleinere(fotos[0].datei, 480, 0.7);
    oeffneEditor({ name: '', basis: 'g', naehrwerte: {}, ean: barcode || '', quelle: { art: 'manuell' } }, vorschau);
    fotosVerwerfen();
    return;
  }
  $('fotoLesen').disabled = true;
  melde('fotoMeldung', t('prod.liest'), 'laeuft');
  try {
    const bilder = await Promise.all(fotos.map((f) => verkleinere(f.datei)));
    const vorschau = await verkleinere(fotos[0].datei, 480, 0.7);
    const entwurf = await leseEtikett(bilder);
    if (!entwurf.ean && barcode) entwurf.ean = barcode;
    /* Mit Barcode fehlende Werte aus Open Food Facts ergaenzen — die
       fotografierte Packung gewinnt bei allem, was sie selbst angibt. */
    let ergaenzt = 0;
    if (entwurf.ean) {
      try {
        const off = await offBarcode(entwurf.ean, sprache());
        if (off) ergaenzt = mische(entwurf, off);
      } catch { /* ohne Netz zu OFF: egal */ }
    }
    oeffneEditor(entwurf, vorschau);
    fotosVerwerfen();
    melde('fotoMeldung', ergaenzt ? t('prod.gelesenErgaenzt', { n: ergaenzt }) : t('prod.gelesen'), 'gut');
  } catch (err) {
    melde('fotoMeldung', fehlerText(err), 'fehler');
  } finally {
    $('fotoLesen').disabled = false;
  }
}

/** Fehlende Naehrwerte aus einer zweiten Quelle uebernehmen. Gibt die Zahl zurueck. */
export function mische(ziel, quelle) {
  let n = 0;
  Object.entries(quelle.naehrwerte || {}).forEach(([k, v]) => {
    if (ziel.naehrwerte[k] === undefined && v !== null && v !== undefined) {
      ziel.naehrwerte[k] = v;
      n += 1;
    }
  });
  if (!ziel.packung && quelle.packung) ziel.packung = quelle.packung;
  if (n) ziel.quelle = { ...ziel.quelle, ergaenzt: quelle.quelle };
  return n;
}

/* ---------------- Recherche ---------------- */

function ergebnisKarte(p) {
  const nw = p.naehrwerte;
  return el('div', { class: 'ergebnis' }, [
    p.vorschau ? el('img', { src: p.vorschau, alt: '', loading: 'lazy' }) : null,
    el('div', { class: 'ergebnis-text' }, [
      el('strong', { text: p.name || '—' }),
      el('span', { class: 'hint', text: [p.marke, p.ean, t(`quelle.${p.quelle.art}`)].filter(Boolean).join(' · ') }),
      el('span', {
        class: 'mono klein',
        text: `${t('prod.je100', { e: p.basis })}: ${fmt(nw.energy_kcal)} kcal · ${t('kurz.protein')} ${fmt(nw.protein)} · ${t('kurz.fett')} ${fmt(nw.fat)} · ${t('kurz.kh')} ${fmt(nw.carbs)} · ${t('prod.anzahlWerte', { n: Object.keys(nw).length })}`
      })
    ]),
    el('button', { type: 'button', class: 'btn small', text: t('prod.uebernehmen'), onclick: () => oeffneEditor(p) })
  ]);
}

async function suche() {
  const begriff = $('rBegriff').value.trim();
  const quelle = $('rQuelle').value;
  if (!begriff) return;
  $('rStart').disabled = true;
  fuelle($('rErgebnisse'), []);
  melde('rMeldung', t('prod.sucht'), 'laeuft');
  try {
    let treffer = [];
    if (quelle === 'off') treffer = await offSuche(begriff, sprache());
    else if (quelle === 'usda') treffer = await usdaSuche(begriff);
    else if (quelle === 'ean') {
      const p = await offBarcode(begriff.replace(/\D/g, ''), sprache());
      treffer = p ? [p] : [];
    } else if (quelle === 'claude') {
      if (!claudeVerfuegbar()) throw Object.assign(new Error(''), { code: 'not_granted' });
      treffer = [await recherchiere(begriff, { lang: sprache() })];
    }
    melde('rMeldung', treffer.length ? t('prod.treffer', { n: treffer.length }) : t('prod.keineTreffer'), treffer.length ? 'gut' : '');
    fuelle($('rErgebnisse'), treffer.map(ergebnisKarte));
  } catch (err) {
    melde('rMeldung', fehlerText(err), 'fehler');
  } finally {
    $('rStart').disabled = false;
  }
}

/* ---------------- Liste ---------------- */

export function renderProduktliste() {
  const f = $('prodFilter').value.trim().toLowerCase();
  const liste = Object.values(state.produkte)
    .filter((p) => !f || `${p.name} ${p.marke || ''} ${p.ean || ''}`.toLowerCase().includes(f))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (!liste.length) {
    fuelle($('prodListe'), [el('p', { class: 'hint', text: Object.keys(state.produkte).length ? t('prod.nichtsGefunden') : t('prod.leer') })]);
    return;
  }
  fuelle($('prodListe'), liste.map((p) => el('button', {
    type: 'button', class: 'produkt', dataset: { id: p.id }, onclick: () => oeffneEditor(p)
  }, [
    el('span', { class: 'produkt-name', text: produktLabel(p) }),
    el('span', {
      class: 'produkt-info mono',
      text: `${fmt((p.naehrwerte || {}).energy_kcal)} kcal/100 ${p.basis} · ${t(`quelle.${(p.quelle || {}).art || 'manuell'}`)}`
    })
  ])));
}

/* ---------------- Editor ---------------- */

const feld = (label, eingabe, id) => el('div', { class: 'field' }, [
  el('label', { class: 'fl', for: id, text: label }), eingabe
]);

function naehrEingaben(nw, basis) {
  const bloecke = GRUPPEN.map((g) => {
    const zeilen = NAEHRSTOFFE.filter((n) => n.group === g).map((n) => el('div', { class: `nw-zeile ${n.unter ? 'unter' : ''}` }, [
      el('label', { for: `nw-${n.key}`, text: nName(n) }),
      el('input', {
        type: 'text', inputmode: 'decimal', id: `nw-${n.key}`, dataset: { nw: n.key },
        value: zt(nw[n.key])
      }),
      el('span', { class: 'mono einheit', text: n.unit })
    ]));
    const hatWerte = NAEHRSTOFFE.some((n) => n.group === g && nw[n.key] !== undefined);
    const offen = g === 'energie' || g === 'makro' || hatWerte;
    return el('details', { class: 'nw-gruppe', open: offen }, [
      el('summary', { text: `${t(`gruppe.${g}`)} — ${t('prod.je100', { e: basis })}` }),
      ...zeilen
    ]);
  });
  return el('div', { class: 'nw-eingaben' }, bloecke);
}

/** Zahl fuer ein Eingabefeld, mit dem Dezimalzeichen der Sprache. */
const zt = (v) => (v === null || v === undefined || v === '' ? '' : String(v).replace('.', sprache() === 'de' ? ',' : '.'));

const portionenText = (ps) => (ps || []).map((p) => `${p.name}=${zt(p.g)}`).join('; ');
const portionenLesen = (s) => s.split(';').map((x) => x.split('=')).filter((x) => x.length === 2)
  .map(([n, g]) => ({ name: n.trim(), g: zahl(g) })).filter((p) => p.name && p.g > 0);

export async function oeffneEditor(p, foto) {
  const dlg = $('editor');
  const form = $('edForm');
  const neu = !p.id;
  const w = (id) => form.querySelector(`#${id}`);
  let fotoUrl = foto || null;

  const kopf = el('div', { class: 'kopfzeile' }, [
    el('h2', { id: 'edTitel', text: neu ? t('ed.neu') : t('ed.bearbeiten') }),
    el('button', { type: 'button', class: 'btn ghost small', value: 'abbrechen', text: '×', 'aria-label': t('ed.abbrechen'), onclick: () => dlg.close() })
  ]);
  const bild = el('img', { class: 'ed-foto', alt: '', hidden: !fotoUrl, src: fotoUrl || undefined });

  fuelle(form, [
    kopf,
    p.hinweise ? el('p', { class: 'meldung warn', text: `${t('ed.hinweise')}: ${p.hinweise}` }) : null,
    el('p', { class: 'hint', text: `${t('ed.quelle')}: ${t(`quelle.${(p.quelle || {}).art || 'manuell'}`)}${p.quelle && p.quelle.ref ? ` — ${p.quelle.ref}` : ''}` }),
    bild,
    feld(t('ed.name'), el('input', { type: 'text', id: 'edName', value: p.name || '', required: true }), 'edName'),
    el('div', { class: 'grid2' }, [
      feld(t('ed.marke'), el('input', { type: 'text', id: 'edMarke', value: p.marke || '' }), 'edMarke'),
      feld('EAN', el('input', { type: 'text', inputmode: 'numeric', id: 'edEan', value: p.ean || '' }), 'edEan')
    ]),
    el('div', { class: 'grid3' }, [
      feld(t('ed.basis'), el('select', { id: 'edBasis' }, [
        el('option', { value: 'g', selected: p.basis !== 'ml', text: t('ed.je100g') }),
        el('option', { value: 'ml', selected: p.basis === 'ml', text: t('ed.je100ml') })
      ]), 'edBasis'),
      feld(t('ed.packung'), el('input', { type: 'text', inputmode: 'decimal', id: 'edPackung', value: p.packung ? zt(p.packung.menge) : '', placeholder: '250' }), 'edPackung'),
      feld(t('ed.dichte'), el('input', { type: 'text', inputmode: 'decimal', id: 'edDichte', value: zt(p.dichte), placeholder: '1,0' }), 'edDichte')
    ]),
    el('div', { class: 'grid3' }, [
      feld(t('ed.elG'), el('input', { type: 'text', inputmode: 'decimal', id: 'edEl', value: zt(p.el_g), placeholder: t('ed.autoMl', { ml: state.cfg.masse.el_ml }) }), 'edEl'),
      feld(t('ed.tlG'), el('input', { type: 'text', inputmode: 'decimal', id: 'edTl', value: zt(p.tl_g), placeholder: t('ed.autoMl', { ml: state.cfg.masse.tl_ml }) }), 'edTl'),
      feld(t('ed.portionen'), el('input', { type: 'text', id: 'edPortionen', value: portionenText(p.portionen), placeholder: t('ed.portionenPh') }), 'edPortionen')
    ]),
    naehrEingaben(p.naehrwerte || {}, p.basis || 'g'),
    el('p', { class: 'meldung', id: 'edMeldung', role: 'status' }),
    el('div', { class: 'zeile-knoepfe' }, [
      el('button', { type: 'button', class: 'btn', id: 'edSpeichern', text: t('ed.speichern') }),
      el('button', { type: 'button', class: 'btn ghost', id: 'edOff', text: t('ed.offErgaenzen') }),
      !neu ? el('button', { type: 'button', class: 'btn ghost gefahr', id: 'edLoeschen', text: t('ed.loeschen') }) : null
    ])
  ]);

  const lesen = () => {
    const nw = {};
    form.querySelectorAll('[data-nw]').forEach((i) => {
      const v = zahl(i.value);
      if (v !== null) nw[i.dataset.nw] = v;
    });
    ergaenzeAbgeleitete(nw);
    const basis = w('edBasis').value;
    const pk = zahl(w('edPackung').value);
    return {
      ...p,
      name: w('edName').value.trim(),
      marke: w('edMarke').value.trim(),
      ean: w('edEan').value.replace(/\D/g, ''),
      basis,
      packung: pk > 0 ? { menge: pk, einheit: basis } : null,
      dichte: zahl(w('edDichte').value) || null,
      el_g: zahl(w('edEl').value) || null,
      tl_g: zahl(w('edTl').value) || null,
      portionen: portionenLesen(w('edPortionen').value),
      naehrwerte: nw
    };
  };

  w('edSpeichern').addEventListener('click', async () => {
    const d = lesen();
    if (!d.name) { w('edMeldung').textContent = t('ed.nameFehlt'); return; }
    w('edSpeichern').disabled = true;
    await speichereProdukt(d, foto);
    dlg.close();
    renderProduktliste();
    renderTag();
  });
  w('edOff').addEventListener('click', async () => {
    const ean = w('edEan').value.replace(/\D/g, '');
    if (!ean) { w('edMeldung').textContent = t('ed.eanFehlt'); return; }
    w('edMeldung').textContent = t('prod.sucht');
    try {
      const off = await offBarcode(ean, sprache());
      if (!off) { w('edMeldung').textContent = t('prod.keineTreffer'); return; }
      const d = lesen();
      const n = mische(d, off);
      if (!d.name) d.name = off.name;
      if (!d.marke) d.marke = off.marke;
      oeffneEditor(d, fotoUrl);
      $('edMeldung').textContent = t('ed.ergaenzt', { n });
    } catch (err) {
      w('edMeldung').textContent = fehlerText(err);
    }
  });
  if (!neu) {
    w('edLoeschen').addEventListener('click', async () => {
      if (!window.confirm(t('ed.loeschenFrage', { name: p.name }))) return;
      await loescheProdukt(p.id);
      dlg.close();
      renderProduktliste();
      renderTag();
    });
  }

  if (!dlg.open) dlg.showModal();
  /* Gespeichertes Foto nachladen, ohne das Oeffnen aufzuhalten. */
  if (!fotoUrl && p.id && p.bild) {
    loadBild(p.id).then((u) => { if (u) { fotoUrl = u; bild.src = u; bild.hidden = false; } });
  }
}

export function initProdukte() {
  $('fotoKamera').addEventListener('change', (ev) => { fotosDazu([...ev.target.files]); ev.target.value = ''; });
  $('fotoDatei').addEventListener('change', (ev) => { fotosDazu([...ev.target.files]); ev.target.value = ''; });
  $('fotoLesen').addEventListener('click', fotosLesen);
  $('fotoVerwerfen').addEventListener('click', fotosVerwerfen);
  $('rStart').addEventListener('click', suche);
  $('rBegriff').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') suche(); });
  $('prodFilter').addEventListener('input', renderProduktliste);
  $('prodNeu').addEventListener('click', () => oeffneEditor({ name: '', basis: 'g', naehrwerte: {}, quelle: { art: 'manuell' } }));
}

