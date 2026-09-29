/* Setup: Ablage, Schluessel, Tagesziele, Haushaltsmasse, Mahlzeiten,
   Vitalwert-Auswahl, Sicherung. */

import { $, el, fuelle } from '../util/dom.js';
import { fmt, zahl } from '../util/format.js';
import { t, nName, vName } from '../i18n.js';
import { state, CFG_VORGABE } from '../state.js';
import { settings, saveSettings } from '../settings.js';
import { NAEHRSTOFFE } from '../naehrstoffe.js';
import { VITALWERTE } from '../vitalwerte.js';
import { MASS_VORGABE } from '../masse.js';
import { testeGithub } from '../storage/github.js';
import { pushAlles, saveProdukte, saveTag } from '../storage/index.js';
import { speichereCfg, mahlzeitTitel } from '../aktionen.js';
import { renderStatus } from './status.js';

const melde = (id, text, art = '') => {
  $(id).textContent = text;
  $(id).className = `meldung ${art}`;
};

function fuelleAblage() {
  const s = settings();
  $('sBackend').value = s.backend;
  $('sOwner').value = s.gh.owner;
  $('sRepo').value = s.gh.repo;
  $('sBranch').value = s.gh.branch;
  $('sPfad').value = s.gh.pfad;
  $('sToken').value = s.gh.token;
  $('aKey').value = s.anthropic.key;
  $('aModel').value = s.anthropic.model;
  $('uKey').value = s.usda.key;
}

/* Nimmt auch eine eingefuegte Adresse wie github.com/Aphexx100/naehrwert-daten
   oder "Aphexx100/naehrwert-daten" im Repository-Feld. Leere Felder fallen
   auf die Vorgabe zurueck und werden sichtbar wieder eingetragen. */
function ablageAusFeldern() {
  let owner = $('sOwner').value.trim().replace(/^@/, '');
  let repo = $('sRepo').value.trim().replace(/\.git$/, '').replace(/^(https?:\/\/)?(www\.)?github\.com\//, '').replace(/\/+$/, '');
  if (repo.includes('/')) {
    const [o, r] = repo.split('/');
    if (!owner) owner = o;
    repo = r;
  }
  const s = saveSettings({
    backend: $('sBackend').value,
    gh: {
      owner,
      repo: repo || 'naehrwert-daten',
      branch: $('sBranch').value.trim() || 'main',
      pfad: $('sPfad').value.trim().replace(/^\/|\/$/g, '') || 'naehrwerte',
      token: $('sToken').value.trim()
    }
  });
  fuelleAblage();
  return s;
}

function renderZiele() {
  fuelle($('zielTabelle'), NAEHRSTOFFE.filter((n) => n.key !== 'energy_kj').map((n) => el('div', { class: 'nw-zeile' }, [
    el('label', { for: `ziel-${n.key}`, text: `${nName(n)}${n.art === 'max' ? ` (${t('setup.hoechstens')})` : ''}` }),
    el('input', {
      type: 'text', inputmode: 'decimal', id: `ziel-${n.key}`, dataset: { ziel: n.key },
      value: state.cfg.ziele[n.key] !== undefined ? String(state.cfg.ziele[n.key]) : '',
      placeholder: n.ziel ? fmt(n.ziel) : '—'
    }),
    el('span', { class: 'mono einheit', text: n.unit })
  ])));
}

function renderMasse() {
  const m = state.cfg.masse;
  fuelle($('masseFelder'), Object.keys(MASS_VORGABE).map((k) => el('div', { class: 'field' }, [
    el('label', { class: 'fl', for: `mass-${k}`, text: t(`mass.${k}`) }),
    el('input', { type: 'text', inputmode: 'decimal', id: `mass-${k}`, dataset: { mass: k }, value: String(m[k] ?? MASS_VORGABE[k]) })
  ])));
  $('mahlzeitNamen').value = state.cfg.mahlzeiten.map(mahlzeitTitel).join(', ');
  fuelle($('vitalAuswahl'), VITALWERTE.map((v) => el('label', { class: 'check' }, [
    el('input', { type: 'checkbox', dataset: { vitalwahl: v.key }, checked: state.cfg.vital.includes(v.key) }),
    ` ${vName(v)}`
  ])));
}

export function renderSetup() {
  fuelleAblage();
  renderZiele();
  renderMasse();
}

/** Uebersetzte Vorgabenamen zurueck in ihre Schluessel ("Frühstück" -> fruehstueck). */
function mahlzeitSchluessel(name) {
  const k = CFG_VORGABE.mahlzeiten.find((x) => mahlzeitTitel(x).toLowerCase() === name.toLowerCase());
  return k || name;
}

export function initSetup(nachAblageWechsel) {
  $('sTesten').addEventListener('click', async () => {
    ablageAusFeldern();
    melde('sMeldung', t('setup.prueft'), 'laeuft');
    const r = await testeGithub();
    melde('sMeldung', t(`gh.${r.code}`, { name: r.name || '', text: r.text || '', fehlt: (r.fehlt || []).map((k) => t(`setup.${k}`)).join(', ') }), r.ok && r.code === 'privat' ? 'gut' : 'fehler');
  });
  $('sSpeichern').addEventListener('click', async () => {
    ablageAusFeldern();
    melde('sMeldung', t('setup.verbindet'), 'laeuft');
    await nachAblageWechsel();
    melde('sMeldung', t('setup.gespeichert'), 'gut');
  });
  $('sPush').addEventListener('click', async () => {
    try {
      const n = await pushAlles((i, m) => melde('sMeldung', t('setup.laedt', { i, m }), 'laeuft'));
      melde('sMeldung', t('setup.hochgeladen', { n }), 'gut');
    } catch (err) {
      melde('sMeldung', `${t('fehler.error')} (${err.message})`, 'fehler');
    }
  });
  $('aSpeichern').addEventListener('click', () => {
    saveSettings({
      anthropic: { key: $('aKey').value.trim(), model: $('aModel').value.trim() || 'claude-opus-5-5' },
      usda: { key: $('uKey').value.trim() }
    });
    renderStatus();
    melde('aMeldung', t('setup.schluesselGespeichert'), 'gut');
  });
  $('zielSpeichern').addEventListener('click', async () => {
    const z = {};
    document.querySelectorAll('[data-ziel]').forEach((i) => {
      const v = zahl(i.value);
      if (v !== null && v > 0) z[i.dataset.ziel] = v;
    });
    state.cfg.ziele = z;
    const r = await speichereCfg();
    melde('zielMeldung', r.ok ? t('setup.zieleGespeichert') : t('speichern.fehler'), r.ok ? 'gut' : 'fehler');
  });
  $('zielZurueck').addEventListener('click', () => {
    document.querySelectorAll('[data-ziel]').forEach((i) => { i.value = ''; });
  });
  $('cfgSpeichern').addEventListener('click', async () => {
    const m = {};
    document.querySelectorAll('[data-mass]').forEach((i) => {
      const v = zahl(i.value);
      m[i.dataset.mass] = v > 0 ? v : MASS_VORGABE[i.dataset.mass];
    });
    state.cfg.masse = m;
    const namen = $('mahlzeitNamen').value.split(',').map((x) => x.trim()).filter(Boolean);
    if (namen.length) state.cfg.mahlzeiten = namen.map(mahlzeitSchluessel);
    state.cfg.vital = [...document.querySelectorAll('[data-vitalwahl]')].filter((i) => i.checked).map((i) => i.dataset.vitalwahl);
    const r = await speichereCfg();
    melde('cfgMeldung', r.ok ? t('setup.cfgGespeichert') : t('speichern.fehler'), r.ok ? 'gut' : 'fehler');
  });

  $('exportJson').addEventListener('click', () => {
    const daten = { schema: 'naehrwert/sicherung/1', erstellt: new Date().toISOString(), config: state.cfg, produkte: state.produkte, tage: state.tage };
    const a = el('a', {
      href: URL.createObjectURL(new Blob([JSON.stringify(daten, null, 2)], { type: 'application/json' })),
      download: `naehrwert-sicherung_${new Date().toISOString().slice(0, 10)}.json`
    });
    document.body.append(a);
    a.click();
    a.remove();
  });
  $('importJson').addEventListener('change', async (ev) => {
    const f = ev.target.files[0];
    ev.target.value = '';
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (d.schema !== 'naehrwert/sicherung/1') throw new Error(t('setup.keineSicherung'));
      if (!window.confirm(t('setup.importFrage', { p: Object.keys(d.produkte || {}).length, t: Object.keys(d.tage || {}).length }))) return;
      Object.assign(state.produkte, d.produkte || {});
      Object.assign(state.tage, d.tage || {});
      if (d.config) state.cfg = { ...state.cfg, ...d.config };
      await speichereCfg();
      await saveProdukte(state.produkte, 'Sicherung eingespielt');
      for (const [k, v] of Object.entries(d.tage || {})) {
        // eslint-disable-next-line no-await-in-loop
        await saveTag(k, v);
      }
      melde('sichMeldung', t('setup.importiert'), 'gut');
      await nachAblageWechsel();
    } catch (err) {
      melde('sichMeldung', `${t('fehler.error')} (${err.message})`, 'fehler');
    }
  });
}
