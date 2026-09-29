/* Rauchtest im echten Browser: der ganze Weg vom Packungsfoto bis zur
   Datei im Repository, die der Wochenbogen liest.

   Nach aussen ist alles ersetzt: GitHub durch die Attrappe im Speicher,
   die Anthropic-API durch eine feste Antwort (die Werte der fotografierten
   Quark-Packung), Open Food Facts durch ein Milchprodukt. So kostet der Test
   nichts, braucht kein Netz und prueft trotzdem das echte Dateiformat.

   Geprueft werden beide Fassungen: die modulare (index.html) und die
   gebaute Einzeldatei (dist/), falls vorhanden.

   Aufruf:  node scripts/smoke-test.mjs */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { githubAttrappe } from './github-attrappe.mjs';
import { naehrwertQuelle } from '../schnittstelle/naehrwert-quelle.js';

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPEN = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  const p = path.join(WURZEL, decodeURIComponent(req.url.split('?')[0]));
  const datei = p.endsWith(path.sep) || p.endsWith('/') ? path.join(p, 'index.html') : p;
  fs.readFile(datei, (err, buf) => {
    if (err) { res.writeHead(404); res.end('nicht gefunden'); return; }
    res.writeHead(200, { 'Content-Type': TYPEN[path.extname(datei)] || 'application/octet-stream' });
    res.end(buf);
  });
});

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

/* Was Claude von der Quark-Packung zurueckgibt (Werte vom Beispielfoto). */
const CLAUDE_QUARK = {
  name: 'Speisequark Magerstufe, laktosefrei', marke: 'Gut & Günstig', ean: '', basis: 'g',
  packung_menge: 250, packung_einheit: 'g', portion_name: '', portion_g: 0, dichte: 1.05, el_g: 20,
  naehrwerte: [
    { key: 'energy_kj', wert: 274 }, { key: 'energy_kcal', wert: 65 }, { key: 'fat', wert: 0.2 }, { key: 'sat_fat', wert: 0.1 },
    { key: 'carbs', wert: 3.7 }, { key: 'sugar', wert: 3.7 }, { key: 'protein', wert: 12 }, { key: 'salt', wert: 0.1 }
  ],
  hinweise: ''
};
const MILCH_EAN = '4000000000017';
const OFF_MILCH = {
  code: MILCH_EAN, product_name_de: 'Bio Fettarme H-Milch 1,5 %', brands: 'Edeka Bio', product_quantity: 1000, product_quantity_unit: 'ml',
  nutriments: { 'energy-kcal_100g': 47, 'energy-kj_100g': 197, fat_100g: 1.5, 'saturated-fat_100g': 0.9, carbohydrates_100g: 4.9, sugars_100g: 4.9, proteins_100g: 3.4, salt_100g: 0.13, calcium_100g: 0.12 }
};

const fremd = (t) => /fonts\.(googleapis|gstatic)|ERR_FAILED|Failed to load resource/.test(t);
const heute = (() => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; })();

const pruefungen = [];
let claudeAnfragen = [];

async function verdrahte(kontext, gh) {
  await kontext.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await kontext.route('https://api.github.com/**', async (r) => {
    const q = r.request();
    const a = gh.bearbeite(q.method(), q.url(), q.headers().authorization, q.postData());
    await r.fulfill({ status: a.status, contentType: 'application/json', body: JSON.stringify(a.body) });
  });
  await kontext.route('https://api.anthropic.com/**', async (r) => {
    const body = JSON.parse(r.request().postData());
    claudeAnfragen.push({ body, headers: r.request().headers() });
    await r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ id: 'msg_test', type: 'message', role: 'assistant', model: body.model, stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(CLAUDE_QUARK) }] })
    });
  });
  await kontext.route('https://world.openfoodfacts.org/**', async (r) => {
    const u = r.request().url();
    const j = u.includes(`/product/${MILCH_EAN}`) ? { status: 1, product: OFF_MILCH } : { status: 0 };
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(j) });
  });
}

async function laufe(browser, url, label, voll) {
  console.log(`\n${label}`);
  const gh = githubAttrappe({ owner: 'test' });
  claudeAnfragen = [];
  const kontext = await browser.newContext({ locale: 'de-DE' });
  await verdrahte(kontext, gh);
  const seite = await kontext.newPage();
  const fehler = [];
  seite.on('pageerror', (e) => { if (!fremd(String(e))) fehler.push(String(e)); });
  seite.on('console', (m) => { if (m.type() === 'error' && !fremd(m.text())) fehler.push(m.text()); });
  seite.on('dialog', (d) => d.accept(d.type() === 'prompt' ? 'Quarkschale' : undefined));
  const pruefe = (name, ok, detail) => {
    pruefungen.push({ label, name, ok });
    console.log(`${ok ? '  ok  ' : ' FEHL '} ${name}${ok || detail === undefined ? '' : ` — ${detail}`}`);
  };

  await seite.goto(url, { waitUntil: 'networkidle' });
  await seite.waitForSelector('body[data-bereit="1"]');
  pruefe('Seite lädt ohne JavaScript-Fehler', fehler.length === 0, fehler.join(' | '));
  pruefe('Deutsch nach Browsersprache', (await seite.locator('#tab-tag').innerText()) === 'Tag');
  pruefe('Vier Mahlzeiten als Vorgabe', (await seite.locator('.mahlzeit').count()) === 4);
  pruefe('Hinweis: keine Synchronisierung', await seite.locator('#offline').isVisible());
  if (!voll) { await kontext.close(); return; }

  /* ---- Setup: GitHub und Claude eintragen ---- */
  await seite.click('#tab-setup');
  pruefe('Repository-Feld mit echter Vorgabe, nicht nur Platzhalter', (await seite.inputValue('#sRepo')) === 'naehrwert-daten');
  await seite.fill('#sToken', 'test-token');
  await seite.click('#sTesten');
  await seite.waitForFunction(() => /GitHub-Benutzer/.test(document.getElementById('sMeldung').textContent));
  pruefe('Fehlendes Feld wird beim Namen genannt', /Es fehlt: GitHub-Benutzer\./.test(await seite.locator('#sMeldung').innerText()));
  /* Eingefuegte Adresse: Benutzer und Repository daraus lesen. */
  await seite.fill('#sRepo', 'github.com/test/naehrwert-daten');
  await seite.click('#sTesten');
  pruefe('Adresse im Repository-Feld wird zerlegt', (await seite.inputValue('#sOwner')) === 'test' && (await seite.inputValue('#sRepo')) === 'naehrwert-daten');
  await seite.waitForFunction(() => /privat/.test(document.getElementById('sMeldung').textContent));
  pruefe('Verbindung prüfen meldet privates Repository', true);
  await seite.click('#sSpeichern');
  await seite.waitForFunction(() => /neu geladen/.test(document.getElementById('sMeldung').textContent));
  pruefe('Status zeigt GitHub-Ablage', /GitHub-Ablage/.test(await seite.locator('#statusrow').innerText()));
  pruefe('schema.json im Repository angelegt', !!gh.json('naehrwerte/schema.json'));
  await seite.fill('#aKey', 'sk-ant-test');
  await seite.click('#aSpeichern');
  pruefe('Claude bereit', /Claude bereit/.test(await seite.locator('#statusrow').innerText()));

  /* ---- Produkt per Foto ---- */
  await seite.click('#tab-produkte');
  await seite.setInputFiles('#fotoDatei', [{ name: 'naehrwerte.png', mimeType: 'image/png', buffer: PNG }]);
  await seite.waitForSelector('#fotoLeiste img');
  await seite.click('#fotoLesen');
  await seite.waitForSelector('#editor[open] #edName');
  const a = claudeAnfragen[0];
  pruefe('Foto geht als Bild an Claude, mit festem JSON-Schema',
    a && a.body.messages[0].content[0].type === 'image' && a.body.output_config.format.type === 'json_schema' && a.body.model === 'claude-opus-5-5');
  pruefe('Serverseitiger Fallback angefordert', a && a.body.fallbacks === 'default' && /server-side-fallback/.test(a.headers['anthropic-beta']));
  pruefe('Editor zeigt die gelesenen Werte', (await seite.inputValue('#edName')) === CLAUDE_QUARK.name
    && (await seite.inputValue('#nw-protein')) === '12' && (await seite.inputValue('#edEl')) === '20');
  pruefe('Natrium aus Salz abgeleitet', (await seite.inputValue('#nw-sodium')) === '40');
  await seite.click('#edSpeichern');
  await seite.waitForSelector('#editor:not([open])', { state: 'attached' });
  await seite.waitForFunction(() => document.querySelectorAll('#prodListe .produkt').length === 1);
  const prod = gh.json('naehrwerte/produkte.json');
  const quark = prod && Object.values(prod.produkte)[0];
  pruefe('Produkt im Repository (produkte.json)', !!quark && quark.naehrwerte.energy_kcal === 65 && quark.el_g === 20);
  pruefe('Foto im Repository (bilder/)', !!quark && gh.dateien.has(`naehrwerte/bilder/${quark.id}.jpg`));

  /* ---- Produkt per Barcode (Open Food Facts) ---- */
  await seite.fill('#rBegriff', MILCH_EAN);
  await seite.selectOption('#rQuelle', 'ean');
  await seite.click('#rStart');
  await seite.waitForSelector('#rErgebnisse .ergebnis');
  await seite.click('#rErgebnisse .ergebnis button');
  await seite.waitForSelector('#editor[open]');
  pruefe('OFF: Calcium in mg umgerechnet', (await seite.inputValue('#nw-calcium')) === '120');
  pruefe('OFF: Getränk je 100 ml', (await seite.inputValue('#edBasis')) === 'ml');
  await seite.fill('#edDichte', '1,03');
  await seite.click('#edSpeichern');
  await seite.waitForFunction(() => document.querySelectorAll('#prodListe .produkt').length === 2);
  pruefe('Zweites Produkt gespeichert', Object.keys(gh.json('naehrwerte/produkte.json').produkte).length === 2);

  /* ---- Tag: 3 EL Quark + 1 Tasse Milch zum Frühstück ---- */
  await seite.click('#tab-tag');
  const fr = seite.locator('.mahlzeit').first();
  const eintragen = async (label, menge, einheit) => {
    const suche = fr.locator('.produktsuche');
    await suche.fill(label);
    await suche.dispatchEvent('change');
    await fr.locator('.eingabe .menge').fill(menge);
    await fr.locator('.eingabe select').selectOption(einheit);
    await fr.locator('.hinzu').click();
  };
  await eintragen('Speisequark Magerstufe, laktosefrei · Gut & Günstig', '3', 'EL');
  await seite.waitForFunction(() => document.querySelectorAll('.eintrag').length === 1);
  pruefe('3 EL Quark ≈ 60 g · 39 kcal', /≈ 60 g · 39 kcal/.test(await seite.locator('.eintrag').first().innerText()));
  await eintragen('Bio Fettarme H-Milch 1,5 % · Edeka Bio', '1', 'Tasse');
  await seite.waitForFunction(() => document.querySelectorAll('.eintrag').length === 2);
  pruefe('Tagessumme 133 kcal', (await seite.locator('.energie-zahl').innerText()) === '133');
  pruefe('Mahlzeitsumme mit Gewicht', /266 g · 133 kcal/.test(await fr.locator('.mz-summe').innerText()));
  const eiweiss = await seite.locator('.nz[data-key="protein"] .nz-wert').innerText();
  pruefe('Eiweiß absolut und in % des Bedarfs', /^14\s*g/.test(eiweiss) && /28 %/.test(eiweiss), eiweiss);

  await seite.click('#alleNaehrstoffe');
  const calc = await seite.locator('.nz[data-key="calcium"]').innerText();
  pruefe('Calcium mit Lückenhinweis (Quark ohne Angabe)', /≥ 240 mg/.test(calc) && /1 von 2 Zutaten ohne Angabe/.test(calc), calc);
  pruefe('Vitamin D ohne jede Angabe', /keine Angabe/.test(await seite.locator('.nz[data-key="vit_d"]').innerText()));

  /* Menge nachtraeglich aendern: 3 -> 6 EL */
  await fr.locator('.eintrag').first().locator('.menge').fill('6');
  await fr.locator('.eintrag').first().locator('.menge').dispatchEvent('change');
  await seite.waitForFunction(() => document.querySelector('.energie-zahl').textContent === '172');
  pruefe('Menge ändern rechnet neu (172 kcal)', true);

  /* ---- Vitalwerte ---- */
  await seite.click('#tab-vital');
  await seite.fill('#vital-gewicht', '82,4');
  await seite.dispatchEvent('#vital-gewicht', 'change');
  await seite.fill('#vital-puls', '400');
  await seite.dispatchEvent('#vital-puls', 'change');
  pruefe('Unplausibler Puls abgewiesen', /zwischen/.test(await seite.locator('#vitalMeldung').innerText()));

  await seite.evaluate(() => window.__nwr.speichereSofort());
  const tagDatei = gh.json(`naehrwerte/tage/${heute.slice(0, 4)}/${heute}.json`);
  pruefe('Tag im Repository mit Summe, Ziel und Anteil', !!tagDatei && Math.round(tagDatei.summe.energy_kcal) === 172
    && tagDatei.ziele.energy_kcal === 2000 && tagDatei.anteil.energy_kcal > 8, tagDatei && JSON.stringify(tagDatei.summe));
  pruefe('Vitalwert im Tag (82,4 kg), Puls nicht', !!tagDatei && tagDatei.vital.gewicht === 82.4 && tagDatei.vital.puls === undefined);
  pruefe('Mahlzeit mit Schlüssel und Titel', !!tagDatei && tagDatei.mahlzeiten[0].name === 'fruehstueck' && tagDatei.mahlzeiten[0].titel === 'Frühstück');
  pruefe('Mehrere Eingaben = wenige Commits (verzögert)', gh.commits.filter((c) => c.pfad.includes('/tage/')).length <= 3,
    gh.commits.filter((c) => c.pfad.includes('/tage/')).length);

  /* ---- Schnittstelle: so liest der Wochenbogen ---- */
  const q = naehrwertQuelle({ owner: 'test', repo: 'naehrwert-daten', token: 'test-token', fetch: gh.fetch });
  const w = await q.woche(heute);
  pruefe('Schnittstelle: Woche mit 172 kcal und 82,4 kg', Math.round(w.mittel.energy_kcal) === 172 && w.vitalMittel.gewicht === 82.4);

  /* ---- Rezept aus der Mahlzeit ---- */
  await seite.click('#tab-tag');
  await fr.locator('.mz-fuss button').click();
  await seite.waitForFunction(() => Object.values(window.__nwr.state.produkte).some((p) => p.name === 'Quarkschale'));
  const rezept = Object.values(gh.json('naehrwerte/produkte.json').produkte).find((p) => p.name === 'Quarkschale');
  pruefe('Rezept als Produkt: 326 g, je 100 g gerechnet', !!rezept && rezept.packung.menge === 326 && Math.round(rezept.naehrwerte.energy_kcal) === 53);

  /* ---- Sprache ---- */
  await seite.click('[data-lang="en"]');
  pruefe('Englisch: Reiter und Mahlzeiten übersetzt', (await seite.locator('#tab-tag').innerText()) === 'Day'
    && (await fr.locator('h2').innerText()) === 'Breakfast');
  pruefe('Englisch: Einheit heißt tbsp', /tbsp/.test(await fr.locator('.eintrag').first().locator('select').innerText()));
  await seite.click('[data-lang="de"]');

  /* ---- Verlauf ---- */
  await seite.click('#tab-verlauf');
  await seite.waitForSelector('#vlGrafik svg .saeule');
  pruefe('Verlauf zeigt Säule und Ziellinie', (await seite.locator('#vlGrafik .ziellinie').count()) === 1);
  pruefe('Durchschnittstabelle mit Vitaminen', (await seite.locator('#vlMittel .nz').count()) > 30);

  pruefe('Keine JavaScript-Fehler im Ablauf', fehler.length === 0, fehler.join(' | '));
  await kontext.close();

  /* ---- Zweites Gerät: nur Zugangsdaten, alles kommt aus dem Repository ---- */
  const k2 = await browser.newContext({ locale: 'de-DE' });
  await verdrahte(k2, gh);
  await k2.addInitScript(() => {
    if (!localStorage.getItem('nwr.settings.v1')) {
      localStorage.setItem('nwr.settings.v1', JSON.stringify({ backend: 'auto', gh: { owner: 'test', repo: 'naehrwert-daten', branch: 'main', pfad: 'naehrwerte', token: 'test-token' } }));
    }
  });
  const s2 = await k2.newPage();
  await s2.goto(url, { waitUntil: 'networkidle' });
  await s2.waitForSelector('body[data-bereit="1"]');
  await s2.waitForFunction(() => document.querySelector('.energie-zahl').textContent === '172');
  pruefe('Zweites Gerät lädt Tag und Produkte aus GitHub', (await s2.locator('.eintrag').count()) === 2);
  await s2.click('#tab-vital');
  pruefe('Zweites Gerät sieht den Vitalwert', (await s2.inputValue('#vital-gewicht')) === '82,4');
  await k2.close();
}

server.listen(0, async () => {
  const port = server.address().port;
  const browser = await chromium.launch();
  try {
    await laufe(browser, `http://localhost:${port}/index.html`, 'Modulfassung (index.html)', true);
    if (fs.existsSync(path.join(WURZEL, 'dist/naehrwert-rechner.html'))) {
      await laufe(browser, `http://localhost:${port}/dist/naehrwert-rechner.html`, 'Einzeldatei (dist/)', true);
    }
  } catch (err) {
    pruefungen.push({ name: `Abbruch: ${err.message}`, ok: false });
    console.log(` FEHL  Abbruch: ${err.stack}`);
  } finally {
    await browser.close();
    server.close();
  }
  const fehl = pruefungen.filter((p) => !p.ok);
  console.log(`\n${pruefungen.length - fehl.length}/${pruefungen.length} Prüfungen bestanden`);
  process.exit(fehl.length ? 1 : 0);
});
