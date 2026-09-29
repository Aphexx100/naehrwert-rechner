/** Kurzform fuer getElementById. */
export const $ = (id) => document.getElementById(id);

/** Element bauen: el('div', {class:'x', onclick: fn}, [kinder|text]). */
export function el(tag, attrs = {}, kinder = []) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (v === null || v === undefined || v === false) return;
    if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  });
  (Array.isArray(kinder) ? kinder : [kinder]).forEach((c) => {
    if (c === null || c === undefined || c === false) return;
    e.append(c instanceof Node ? c : document.createTextNode(String(c)));
  });
  return e;
}

/** Inhalt ersetzen. */
export function fuelle(ziel, kinder) {
  ziel.replaceChildren(...(Array.isArray(kinder) ? kinder : [kinder]).filter(Boolean));
}
