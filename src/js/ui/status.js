/* Kopfzeile: Ablage und letzter Speicherstand. */

import { $, el, fuelle } from '../util/dom.js';
import { t } from '../i18n.js';
import { hatRemote } from '../storage/index.js';
import { claudeVerfuegbar } from '../quellen/claude.js';

let stand = { code: '', detail: '' };

export function renderStatus() {
  const chips = [
    el('span', { class: `chip ${hatRemote() ? 'good' : 'warn'}`, text: hatRemote() ? t('status.github') : t('status.lokal') }),
    el('span', { class: `chip ${claudeVerfuegbar() ? 'acc' : ''}`, text: claudeVerfuegbar() ? t('status.claudeAn') : t('status.claudeAus') })
  ];
  if (stand.code) {
    const cls = stand.code === 'fehler' ? 'warn' : stand.code === 'laeuft' ? '' : 'good';
    chips.push(el('span', { class: `chip ${cls}`, id: 'speicherstand', title: stand.detail || '', text: t(`speichern.${stand.code}`) }));
  }
  fuelle($('statusrow'), chips);
  $('offline').hidden = hatRemote();
}

export function zeigeSpeicherstand(code, detail) {
  stand = { code, detail: detail || '' };
  renderStatus();
}
