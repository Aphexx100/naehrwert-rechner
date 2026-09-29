/* Tagesansicht: Summe mit Tagesbedarf oben, darunter die Mahlzeiten mit
   ihren Zutaten. Eine Zutat = Produkt + Menge + Einheit (g, ml, EL, TL,
   Tasse, …); die Naehrstoffe rechnet rechnen.js. */

import { $, el, fuelle } from '../util/dom.js';
import { fmt, zahl } from '../util/format.js';
import { t } from '../i18n.js';
import { state } from '../state.js';
import { einheitenFuer } from '../masse.js';
import { mahlzeitSumme, rezeptAusMahlzeit, ziele as zieleVon } from '../rechnen.js';
import {
  holeTag, zutatHinzu, zutatAendern, zutatEntfernen, mahlzeitHinzu, mahlzeitEntfernen,
  setzeNotiz, mahlzeitTitel, speichereProdukt
} from '../aktionen.js';
import { naehrTabelle } from './naehrtabelle.js';

let alleZeigen = false;

export const einheitText = (e) => (e.startsWith('portion:') ? e.slice(8) : t(`einheit.${e}`));

/** Produktname fuer Listen: "Name · Marke". */
export const produktLabel = (p) => (p.marke ? `${p.name} · ${p.marke}` : p.name);

function einheitenSelect(produkt, gewaehlt, attrs = {}) {
  return el('select', attrs, einheitenFuer(produkt).map((e) =>
    el('option', { value: e, selected: e === gewaehlt, text: einheitText(e) })));
}

function renderSumme() {
  const tag = state.tage[state.datum];
  const eintraege = tag ? tag.mahlzeiten.flatMap((m) => m.eintraege) : [];
  const s = (tag && tag.summe) || {};
  const z = zieleVon(state.cfg.ziele);
  const kcal = s.energy_kcal || 0;
  fuelle($('tagSumme'), [
    el('div', { class: 'kopfzeile' }, [
      el('h2', { text: t('tag.summe') }),
      el('span', { class: 'mono gewicht', text: tag && tag.gramm ? t('tag.gesamtGewicht', { g: fmt(tag.gramm, 0) }) : '' })
    ]),
    el('div', { class: 'energie' }, [
      el('span', { class: 'energie-zahl mono', text: fmt(kcal, 0) }),
      el('span', { class: 'energie-einheit', text: `kcal · ${fmt(s.energy_kj || 0, 0)} kJ` }),
      el('span', { class: 'energie-proz mono', text: z.energy_kcal && kcal ? `${fmt((kcal / z.energy_kcal) * 100, 0)} % ${t('tag.vomBedarf')}` : '' })
    ]),
    eintraege.length
      ? naehrTabelle(s, z, eintraege, { alle: alleZeigen })
      : el('p', { class: 'hint', text: t('tag.leer') }),
    eintraege.length ? el('button', {
      type: 'button',
      class: 'btn ghost small',
      id: 'alleNaehrstoffe',
      'aria-expanded': alleZeigen ? 'true' : 'false',
      text: alleZeigen ? t('tag.wenigerZeigen') : t('tag.alleZeigen'),
      onclick: () => { alleZeigen = !alleZeigen; renderSumme(); }
    }) : null
  ]);
}

function eintragZeile(m, e) {
  const p = state.produkte[e.produkt];
  const menge = el('input', {
    type: 'text', inputmode: 'decimal', class: 'menge', value: fmt(e.menge, 2).replace(/\s/g, ''),
    'aria-label': t('tag.menge')
  });
  const einheit = p ? einheitenSelect(p, e.einheit, { 'aria-label': t('tag.einheit') }) : el('span', { class: 'mono', text: einheitText(e.einheit) });
  const aendern = () => {
    const x = zahl(menge.value);
    if (x === null || x <= 0) return;
    zutatAendern(state.datum, m.id, e.id, x, p ? einheit.value : e.einheit);
    renderTag();
  };
  menge.addEventListener('change', aendern);
  if (p) einheit.addEventListener('change', aendern);
  return el('li', { class: 'eintrag', dataset: { id: e.id } }, [
    el('div', { class: 'eintrag-name' }, [
      el('span', { text: e.name }),
      el('span', { class: 'eintrag-info mono', text: `≈ ${fmt(e.gramm, 0)} g · ${fmt((e.n || {}).energy_kcal || 0, 0)} kcal` })
    ]),
    el('div', { class: 'eintrag-menge' }, [
      menge,
      einheit,
      el('button', {
        type: 'button', class: 'btn ghost small entfernen', 'aria-label': t('tag.entfernen'), text: '×',
        onclick: () => { zutatEntfernen(state.datum, m.id, e.id); renderTag(); }
      })
    ])
  ]);
}

/** Eingabezeile: Produkt suchen, Menge, Einheit, hinzufuegen. */
function eingabe(m) {
  const liste = Object.values(state.produkte).sort((a, b) => a.name.localeCompare(b.name));
  const dlId = `dl-${m.id}`;
  const suche = el('input', { type: 'text', class: 'produktsuche', list: dlId, placeholder: t('tag.produktPh'), autocomplete: 'off', 'aria-label': t('tag.produkt') });
  const dl = el('datalist', { id: dlId }, liste.map((p) => el('option', { value: produktLabel(p) })));
  const menge = el('input', { type: 'text', inputmode: 'decimal', class: 'menge', placeholder: '1', 'aria-label': t('tag.menge') });
  let einheit = einheitenSelect({}, 'EL', { 'aria-label': t('tag.einheit') });
  const meldung = el('span', { class: 'meldung klein', role: 'status' });

  const gefunden = () => liste.find((p) => produktLabel(p) === suche.value.trim())
    || liste.find((p) => p.name.toLowerCase() === suche.value.trim().toLowerCase());

  suche.addEventListener('change', () => {
    const p = gefunden();
    if (!p) return;
    /* Einheiten des Produkts (Portionen, Packung) anbieten; Vorgabe je
       Basis: Fluessiges in ml, Festes in EL. */
    const neu = einheitenSelect(p, einheit.value && einheitenFuer(p).includes(einheit.value) ? einheit.value : (p.basis === 'ml' ? 'ml' : 'g'), { 'aria-label': t('tag.einheit') });
    einheit.replaceWith(neu);
    einheit = neu;
    menge.focus();
  });

  const hinzu = () => {
    const p = gefunden();
    const x = zahl(menge.value) ?? 1;
    if (!p) { meldung.textContent = t('tag.produktFehlt'); return; }
    if (!(x > 0)) { meldung.textContent = t('tag.mengeFehlt'); return; }
    if (!zutatHinzu(state.datum, m.id, p.id, x, einheit.value)) { meldung.textContent = t('tag.einheitGehtNicht'); return; }
    renderTag();
    const neueSuche = document.querySelector(`[data-mahlzeit="${m.id}"] .produktsuche`);
    if (neueSuche) neueSuche.focus();
  };
  menge.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); hinzu(); } });

  return el('div', { class: 'eingabe' }, [
    suche, dl,
    el('div', { class: 'eingabe-zeile' }, [
      menge,
      einheit,
      el('button', { type: 'button', class: 'btn small hinzu', text: t('tag.hinzu'), onclick: hinzu })
    ]),
    meldung
  ]);
}

function mahlzeitKarte(m) {
  const { gramm, n } = mahlzeitSumme(m);
  return el('div', { class: 'card mahlzeit', dataset: { mahlzeit: m.id } }, [
    el('div', { class: 'kopfzeile' }, [
      el('h2', { text: mahlzeitTitel(m.name) }),
      m.eintraege.length
        ? el('span', { class: 'mono mz-summe', text: `${fmt(gramm, 0)} g · ${fmt(n.energy_kcal || 0, 0)} kcal · ${t('kurz.protein')} ${fmt(n.protein || 0)} · ${t('kurz.fett')} ${fmt(n.fat || 0)} · ${t('kurz.kh')} ${fmt(n.carbs || 0)}` })
        : el('button', {
          type: 'button', class: 'btn ghost small', 'aria-label': t('tag.mahlzeitEntfernen'), title: t('tag.mahlzeitEntfernen'), text: '×',
          onclick: () => { mahlzeitEntfernen(state.datum, m.id); renderTag(); }
        })
    ]),
    m.eintraege.length ? el('ul', { class: 'eintraege' }, m.eintraege.map((e) => eintragZeile(m, e))) : null,
    Object.keys(state.produkte).length ? eingabe(m) : el('p', { class: 'hint', text: t('tag.keineProdukte') }),
    el('div', { class: 'mz-fuss' }, [
      m.eintraege.length > 1 ? el('button', {
        type: 'button', class: 'btn ghost small', text: t('tag.alsRezept'),
        onclick: async () => {
          const name = prompt(t('tag.rezeptName'), mahlzeitTitel(m.name));
          if (!name) return;
          const r = rezeptAusMahlzeit(m, name);
          if (r) await speichereProdukt(r);
          renderTag();
        }
      }) : null
    ])
  ]);
}

export function renderTag() {
  /* Ein leerer Tag liegt nur im Speicher; geschrieben wird er erst,
     wenn etwas eingetragen ist. */
  const tag = holeTag(state.datum);
  renderSumme();
  fuelle($('mahlzeiten'), tag.mahlzeiten.map(mahlzeitKarte));
  $('tagNotiz').value = tag.notiz || '';
}

export function initTag() {
  $('mahlzeitNeu').addEventListener('click', () => {
    const name = prompt(t('tag.mahlzeitName'));
    if (!name) return;
    mahlzeitHinzu(state.datum, name.trim());
    renderTag();
  });
  $('tagNotiz').addEventListener('change', (ev) => {
    setzeNotiz(state.datum, ev.target.value);
  });
}
