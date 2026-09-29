/* Vitalwerte des gewaehlten Tages. Welche Felder erscheinen, steht in der
   Konfiguration (Setup); die Liste selbst in vitalwerte.js. */

import { $, el, fuelle } from '../util/dom.js';
import { fmt, zahl } from '../util/format.js';
import { t, vName } from '../i18n.js';
import { state } from '../state.js';
import { VITALWERTE } from '../vitalwerte.js';
import { holeTag, setzeVital } from '../aktionen.js';

export function renderVital() {
  const tag = holeTag(state.datum);
  const v = tag.vital || {};
  const aktiv = VITALWERTE.filter((x) => state.cfg.vital.includes(x.key));
  fuelle($('vitalFelder'), aktiv.map((x) => {
    const inp = el('input', {
      type: 'text', inputmode: 'decimal', id: `vital-${x.key}`, dataset: { vital: x.key },
      value: v[x.key] !== undefined ? fmt(v[x.key], 2).replace(/\s/g, '') : ''
    });
    inp.addEventListener('change', () => {
      const w = zahl(inp.value);
      if (w !== null && (w < x.bereich[0] || w > x.bereich[1])) {
        $('vitalMeldung').textContent = t('vital.bereich', { name: vName(x), von: x.bereich[0], bis: x.bereich[1] });
        $('vitalMeldung').className = 'meldung fehler';
        return;
      }
      $('vitalMeldung').textContent = '';
      setzeVital(state.datum, x.key, w);
    });
    return el('div', { class: 'field vital' }, [
      el('label', { class: 'fl', for: `vital-${x.key}`, text: `${vName(x)}${x.unit ? ` (${x.unit})` : ''}` }),
      inp
    ]);
  }));
}
