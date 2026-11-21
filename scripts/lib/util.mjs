import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const dirProyecto = (slug) => path.join(RAIZ, 'proyectos', slug);

export function leerJSON(ruta, defecto = undefined) {
  try { return JSON.parse(fs.readFileSync(ruta, 'utf8')); }
  catch (e) { if (defecto !== undefined) return defecto; throw new Error(`No se pudo leer ${path.relative(RAIZ, ruta)}: ${e.message}`); }
}
export function escribirJSON(ruta, obj) {
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  fs.writeFileSync(ruta, JSON.stringify(obj, null, 2) + '\n');
}
export const marca = () => leerJSON(path.join(RAIZ, 'marca.config.json'));

export function slugify(t) {
  return String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'empresa';
}

/** Argumento → slug. Orden: argumento, variable KIT_SLUG, .proyecto-actual, "demo". */
export function resolverSlug(arg) {
  const a = arg && !arg.startsWith('--') ? arg : null;
  if (a) return a;
  if (process.env.KIT_SLUG) return process.env.KIT_SLUG;
  const f = path.join(RAIZ, '.proyecto-actual');
  if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim() || 'demo';
  return 'demo';
}
export function argumentos(argv = process.argv.slice(2)) {
  const pos = [], flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      flags[k] = v ?? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true);
    } else pos.push(a);
  }
  return { pos, flags };
}

// ---------- color ----------
export function hexARgb(hex) {
  let h = String(hex).trim().replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
export const rgbAHex = (rgb) => '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
export function luminanciaRelativa(hex) {
  const rgb = hexARgb(hex); if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contraste(a, b) {
  const la = luminanciaRelativa(a), lb = luminanciaRelativa(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
export function mezclar(a, b, t) {
  const A = hexARgb(a), B = hexARgb(b);
  return rgbAHex(A.map((v, i) => v + (B[i] - v) * t));
}
/** Aclara/oscurece `color` hasta alcanzar `minimo` de contraste contra `fondo` (para texto pequeño). */
export function ajustarContraste(color, fondo, minimo = 4.5) {
  if (contraste(color, fondo) >= minimo) return color;
  const destino = luminanciaRelativa(fondo) < 0.4 ? '#ffffff' : '#000000';
  for (let t = 0.05; t <= 1.001; t += 0.05) { const c = mezclar(color, destino, t); if (contraste(c, fondo) >= minimo) return c; }
  return destino;
}
export const textoSobre = (fondo) => (contraste('#000000', fondo) >= contraste('#ffffff', fondo) ? '#05070a' : '#ffffff');

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const fmtMiles = (n) => new Intl.NumberFormat('es-ES', { useGrouping: 'always', maximumFractionDigits: 0 }).format(n);

export function existe(p) { try { return fs.existsSync(p); } catch { return false; } }
export function rel(p) { return path.relative(RAIZ, p) || '.'; }
export const colores = { ok: (t) => `\x1b[32m${t}\x1b[0m`, aviso: (t) => `\x1b[33m${t}\x1b[0m`, error: (t) => `\x1b[31m${t}\x1b[0m`, dim: (t) => `\x1b[2m${t}\x1b[0m`, neg: (t) => `\x1b[1m${t}\x1b[0m` };
