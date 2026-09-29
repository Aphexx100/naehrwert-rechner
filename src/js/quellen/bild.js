/* Fotos vorbereiten: verkleinern und als JPEG kodieren.

   Handyfotos haben 12 Megapixel und mehr. Fuer das Auslesen reichen 1568 px
   an der langen Kante (darueber skaliert die API ohnehin herunter), fuer das
   Produktfoto im Repository 480 px. Beides spart Upload und Speicher. */

function ladeBild(datei) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(datei);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Bild nicht lesbar')); };
    img.src = url;
  });
}

/** Datei -> data:image/jpeg;base64,... mit langer Kante <= max. */
export async function verkleinere(datei, max = 1568, qualitaet = 0.85) {
  const img = await ladeBild(datei);
  const f = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * f);
  const h = Math.round(img.naturalHeight * f);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  /* Transparente PNGs sonst schwarz hinterlegt. */
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return c.toDataURL('image/jpeg', qualitaet);
}

/** Barcode direkt im Browser lesen, wo der BarcodeDetector existiert
    (Chrome auf Android, Edge). Sonst null — dann liest Claude die Ziffern. */
export async function leseBarcode(datei) {
  try {
    if (typeof BarcodeDetector === 'undefined') return null;
    const bd = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    const bmp = await createImageBitmap(datei);
    const r = await bd.detect(bmp);
    return r.length ? r[0].rawValue : null;
  } catch {
    return null;
  }
}
