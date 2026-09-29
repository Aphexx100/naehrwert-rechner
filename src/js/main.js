/* Einstieg: Sprache, Ablage, Daten laden, Ansichten verdrahten. */

import { $ } from './util/dom.js';
import { heute, plusTage } from './util/date.js';
import { state, CFG_VORGABE } from './state.js';
import { initSprache, setzeSprache, wendeAn, sprache } from './i18n.js';
import { initStorage, loadConfig, loadProdukte, loadTage } from './storage/index.js';
import { speichereSofort, hatOffene } from './aktionen.js';
import { renderStatus } from './ui/status.js';
import { initTag, renderTag } from './ui/tag.js';
import { initProdukte, renderProduktliste } from './ui/produkte.js';
import { renderVital } from './ui/vital.js';
import { initVerlauf, renderVerlauf, fuelleGroessen } from './ui/verlauf.js';
import { initSetup, renderSetup } from './ui/setup.js';
import { datumLang } from './util/format.js';

const TAGE_VORAUS_LADEN = 60;

function aktiverTab() {
  const a = document.querySelector('[role="tab"][aria-selected="true"]');
  return a ? a.id : 'tab-tag';
}

/** Alles neu zeichnen, was vom Datum oder der Sprache abhaengt. */
function renderAlles() {
  $('dFeld').value = state.datum;
  $('dFeld').title = datumLang(state.datum);
  $('dHeute').hidden = state.datum === heute();
  /* Das Datum gilt fuer Tag und Vitalwerte, nicht fuer Produkte/Verlauf/Setup. */
  $('datumswahl').hidden = !['tab-tag', 'tab-vital'].includes(aktiverTab());
  renderStatus();
  renderTag();
  renderVital();
  renderProduktliste();
  if (aktiverTab() === 'tab-verlauf') renderVerlauf();
  if (aktiverTab() === 'tab-setup') renderSetup();
}

function initTabs() {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  tabs.forEach((tb) => tb.addEventListener('click', () => {
    tabs.forEach((o) => {
      const an = o === tb;
      o.setAttribute('aria-selected', an ? 'true' : 'false');
      $(o.getAttribute('aria-controls')).hidden = !an;
    });
    window.scrollTo({ top: 0, behavior: 'instant' });
    renderAlles();
  }));
}

async function wechsleDatum(d) {
  if (!d) return;
  state.datum = d;
  /* Ausserhalb des geladenen Fensters: den Tag nachholen. */
  if (!state.tage[d]) {
    const neu = await loadTage(d, d);
    if (neu[d]) state.tage[d] = neu[d];
  }
  renderAlles();
}

function initDatum() {
  $('dZurueck').addEventListener('click', () => wechsleDatum(plusTage(state.datum, -1)));
  $('dVor').addEventListener('click', () => wechsleDatum(plusTage(state.datum, 1)));
  $('dHeute').addEventListener('click', () => wechsleDatum(heute()));
  $('dFeld').addEventListener('change', (ev) => wechsleDatum(ev.target.value));
}

function initSprachwahl() {
  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
    setzeSprache(b.dataset.lang);
    fuelleGroessen();
    renderAlles();
  }));
}

/** Daten (neu) laden — beim Start und nach einem Wechsel der Ablage. */
async function ladeDaten() {
  await initStorage();
  const cfg = await loadConfig();
  state.cfg = {
    ...structuredClone(CFG_VORGABE),
    ...(cfg || {}),
    masse: { ...CFG_VORGABE.masse, ...((cfg && cfg.masse) || {}) }
  };
  state.produkte = await loadProdukte();
  state.tage = await loadTage(plusTage(heute(), -TAGE_VORAUS_LADEN), heute());
  renderAlles();
}

async function start() {
  initSprache();
  wendeAn();
  document.documentElement.lang = sprache();
  state.datum = heute();
  initTabs();
  initDatum();
  initSprachwahl();
  initTag();
  initProdukte();
  initVerlauf();
  initSetup(ladeDaten);
  renderAlles();
  await ladeDaten();
  document.body.dataset.bereit = '1';
}

/* Beim Verlassen ausstehende Schreibvorgaenge nicht verlieren. */
window.addEventListener('pagehide', () => { if (hatOffene()) speichereSofort(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && hatOffene()) speichereSofort(); });

/* Fuer den Rauchtest: ausstehende Schreibvorgaenge abwarten. */
window.__nwr = { speichereSofort, state };

start();
