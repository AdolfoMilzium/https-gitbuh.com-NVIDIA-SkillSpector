import fs from 'node:fs';
import path from 'node:path';
import { RAIZ } from './util.mjs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const GENERICAS = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace']);

const urlCss = (familia, pesos) => {
  const fam = encodeURIComponent(familia).replace(/%20/g, '+');
  return `https://fonts.googleapis.com/css2?family=${fam}${pesos ? ':wght@' + pesos : ''}&display=swap`;
};
async function conTiempo(url, ms = 7000, opts = {}) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ac.signal, headers: { 'user-agent': UA, ...(opts.headers || {}) } }); }
  finally { clearTimeout(t); }
}
const listaLocal = () => { try { return JSON.parse(fs.readFileSync(path.join(RAIZ, 'scripts/data/fuentes-google.json'), 'utf8')); } catch { return []; } };

/** true / false / null (no se pudo comprobar). Primero en línea; si no hay red, la lista incluida en el kit. */
export async function existeFuente(nombre) {
  if (!nombre || GENERICAS.has(nombre.toLowerCase())) return true;
  try {
    const r = await conTiempo(urlCss(nombre), 6000);
    if (r.ok) return true;
    if (r.status === 400 || r.status === 404) return false;
  } catch { /* sin red */ }
  const l = listaLocal().map((f) => f.toLowerCase());
  return l.includes(nombre.toLowerCase()) ? true : null;
}

/**
 * Descarga la fuente de Google y la deja en `destino` (alojada en la propia web:
 * mejor rendimiento y sin enviar datos de visitantes a terceros). Devuelve el CSS @font-face.
 * Si no hay red, devuelve null y el llamador usa el enlace de Google Fonts como plan B.
 */
export async function alojarFuente(familia, destino, pesos = ['400;600;700', '400;700', '400']) {
  if (!familia || GENERICAS.has(familia.toLowerCase())) return { css: '' };
  for (const p of pesos) {
    try {
      const r = await conTiempo(urlCss(familia, p), 9000);
      if (!r.ok) continue;
      let css = await r.text();
      fs.mkdirSync(destino, { recursive: true });
      const bloques = css.split('/*').slice(1).map((b) => '/*' + b); // un bloque por subconjunto (latin, latin-ext…)
      const salida = [];
      for (const b of bloques) {
        const sub = /\/\*\s*([\w-]+)\s*\*\//.exec(b)?.[1];
        if (sub && !['latin', 'latin-ext'].includes(sub)) continue;
        const m = /url\((https:[^)]+\.woff2)\)/.exec(b); if (!m) continue;
        const nombre = `${familia.replace(/\s+/g, '-').toLowerCase()}-${sub}-${path.basename(m[1]).slice(0, 12)}.woff2`;
        const f = path.join(destino, nombre);
        if (!fs.existsSync(f)) { const rf = await conTiempo(m[1], 15000); if (!rf.ok) throw new Error('descarga'); fs.writeFileSync(f, Buffer.from(await rf.arrayBuffer())); }
        salida.push(b.replace(m[1], `fonts/${nombre}`));
      }
      if (salida.length) return { css: salida.join('\n'), archivos: salida.length };
    } catch { /* probar con otros pesos o salir */ }
  }
  return null;
}
export const enlaceGoogle = (familias) => {
  const f = [...new Set(familias.filter((x) => x && !GENERICAS.has(x.toLowerCase())))];
  if (!f.length) return '';
  return `https://fonts.googleapis.com/css2?${f.map((x) => 'family=' + encodeURIComponent(x).replace(/%20/g, '+') + ':wght@400;600;700;800').join('&')}&display=swap`;
};
