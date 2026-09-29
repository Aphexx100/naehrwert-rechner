/* Ein GitHub-Datenrepository im Speicher — fuer die Tests.

   Bildet die Teile der Contents-API nach, die Rechner und Schnittstelle
   benutzen: Repository lesen, Datei/Verzeichnis lesen, schreiben (mit
   SHA-Pruefung wie das Original), loeschen, Blob lesen. So pruefen die Tests
   das echte Dateiformat im Repository, nicht nur den localStorage. */

import crypto from 'node:crypto';

export function githubAttrappe({ owner = 'test', repo = 'naehrwert-daten', token = 'test-token' } = {}) {
  const dateien = new Map();   /* pfad -> { b64, sha } */
  const commits = [];
  const praefix = `/repos/${owner}/${repo}`;

  const antwort = (status, body) => ({ status, body });

  function bearbeite(methode, url, auth, text) {
    if (auth !== `Bearer ${token}`) return antwort(401, { message: 'Bad credentials' });
    const u = new URL(url);
    let p = decodeURIComponent(u.pathname);
    if (p === praefix) return antwort(200, { full_name: `${owner}/${repo}`, private: true, permissions: { push: true } });
    if (p.startsWith(`${praefix}/git/blobs/`)) {
      const sha = p.split('/').pop();
      const f = [...dateien.values()].find((x) => x.sha === sha);
      return f ? antwort(200, { sha, content: f.b64, encoding: 'base64' }) : antwort(404, { message: 'Not Found' });
    }
    if (!p.startsWith(`${praefix}/contents/`)) return antwort(404, { message: 'Not Found' });
    p = p.slice(`${praefix}/contents/`.length);

    if (methode === 'GET') {
      const f = dateien.get(p);
      if (f) return antwort(200, { type: 'file', name: p.split('/').pop(), path: p, sha: f.sha, content: f.b64, encoding: 'base64' });
      const kinder = [...dateien.keys()].filter((k) => k.startsWith(`${p}/`));
      if (!kinder.length) return antwort(404, { message: 'Not Found' });
      const namen = new Map();
      kinder.forEach((k) => {
        const rest = k.slice(p.length + 1);
        const name = rest.split('/')[0];
        namen.set(name, rest.includes('/') ? { type: 'dir', name, path: `${p}/${name}` } : { type: 'file', name, path: k, sha: dateien.get(k).sha });
      });
      return antwort(200, [...namen.values()]);
    }
    const body = text ? JSON.parse(text) : {};
    if (methode === 'PUT') {
      const vorhanden = dateien.get(p);
      if (vorhanden && body.sha !== vorhanden.sha) return antwort(409, { message: `${p} does not match` });
      if (!vorhanden && body.sha) return antwort(422, { message: 'sha given for new file' });
      const sha = crypto.createHash('sha1').update(body.content).digest('hex');
      dateien.set(p, { b64: body.content, sha });
      commits.push({ pfad: p, nachricht: body.message });
      return antwort(vorhanden ? 200 : 201, { content: { sha, path: p } });
    }
    if (methode === 'DELETE') {
      const vorhanden = dateien.get(p);
      if (!vorhanden) return antwort(404, { message: 'Not Found' });
      if (body.sha !== vorhanden.sha) return antwort(409, { message: 'sha mismatch' });
      dateien.delete(p);
      commits.push({ pfad: p, nachricht: body.message });
      return antwort(200, { commit: {} });
    }
    return antwort(405, { message: 'Method not allowed' });
  }

  return {
    owner, repo, token, dateien, commits,
    bearbeite,
    /** Datei als JSON lesen (fuer Pruefungen). */
    json(p) {
      const f = dateien.get(p);
      return f ? JSON.parse(Buffer.from(f.b64, 'base64').toString('utf8')) : null;
    },
    /** fetch-Ersatz fuer Node. */
    fetch: async (url, opts = {}) => {
      const h = opts.headers || {};
      const r = bearbeite(opts.method || 'GET', url, h.Authorization || h.authorization, opts.body);
      return {
        status: r.status,
        ok: r.status >= 200 && r.status < 300,
        json: async () => r.body
      };
    }
  };
}
