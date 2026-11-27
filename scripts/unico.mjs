#!/usr/bin/env node
/**
 * Convierte la web construida en UN SOLO ARCHIVO .html (JS, CSS, fuentes, imágenes y vídeo incrustados).
 * Se abre con doble clic en cualquier ordenador, sin servidor ni internet, y sirve para enseñar la web.
 * Genera además una versión «fragmento» para publicarla como página con enlace.
 * Uso: npm run unico -- <slug> [--con-webm]
 */
import fs from 'node:fs';
import path from 'node:path';
import { argumentos, resolverSlug, dirProyecto, colores as c, rel } from './lib/util.mjs';

const { pos, flags } = argumentos();
const slug = resolverSlug(pos[0]);
const dir = dirProyecto(slug), dist = path.join(dir, 'dist');
const rutaHtml = path.join(dist, 'index.html');
if (!fs.existsSync(rutaHtml)) { console.error(c.error(`\n  ✖ Primero construye la web: npm run construir -- ${slug}\n`)); process.exit(1); }
let html = fs.readFileSync(rutaHtml, 'utf8');

const MIME = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2' };
const dataUri = (f) => `data:${MIME[path.extname(f).toLowerCase()] ?? 'application/octet-stream'};base64,${fs.readFileSync(f).toString('base64')}`;

// 1) datos de la web: fuera la reserva WebM (salvo --con-webm) y la imagen social (no hace falta dentro)
const mDatos = /(<script id="datos" type="application\/json">)([\s\S]*?)(<\/script>)/.exec(html);
const datos = JSON.parse(mDatos[2].replace(/\\u003c/g, '<'));
if (!flags['con-webm']) delete datos.escenario?.video_tunel_webm;
delete datos.escenario?.video_tunel_poster;
let json = JSON.stringify(datos);

// 2) recursos referenciados (assets/… y fonts/…) → data URI
const usados = new Set([...json.matchAll(/"((?:assets|fonts)\/[^"]+)"/g)].map((m) => m[1]).concat([...html.matchAll(/url\((fonts\/[^)]+)\)/g)].map((m) => m[1])));
let incrustados = 0;
for (const r of usados) {
  const f = path.join(dist, r); if (!fs.existsSync(f)) continue;
  const uri = dataUri(f); incrustados += fs.statSync(f).size;
  json = json.split(`"${r}"`).join(`"${uri}"`);
  html = html.split(`url(${r})`).join(`url(${uri})`);
}
html = html.replace(mDatos[0], mDatos[1] + json.replace(/</g, '\\u003c') + mDatos[3]);

// 3) JS y CSS dentro del propio HTML
html = html.replace(/<script type="module" crossorigin src="\.\/([^"]+)"><\/script>/, (_, f) => `<script type="module">${fs.readFileSync(path.join(dist, f), 'utf8').replace(/<\/script/gi, '<\\/script')}</script>`);
html = html.replace(/<link rel="stylesheet" crossorigin href="\.\/([^"]+)">/, (_, f) => `<style>${fs.readFileSync(path.join(dist, f), 'utf8')}</style>`);
html = html.replace(/<meta property="og:image"[^>]*>|<meta property="og:image:(?:width|height)"[^>]*>|<meta name="twitter:image"[^>]*>/g, '');

const salida = path.join(dir, `${slug}-unico.html`);
fs.writeFileSync(salida, html);

// 4) «fragmento» sin envoltorio <html>/<head>/<body> (para publicar como página con enlace)
const head = /<head>([\s\S]*?)<\/head>/.exec(html)[1], body = /<body>([\s\S]*?)<\/body>/.exec(html)[1];
const nombre = (/<title>([\s\S]*?)<\/title>/.exec(head)[1].split(/\s[·|–—-]\s/)[0]).trim();
const cabeza = head.replace(/<meta charset[^>]*>|<meta name="viewport"[^>]*>|<title>[\s\S]*?<\/title>/g, '');
const frag = `<title>${nombre}</title>\n${cabeza}\n<style>:root{color-scheme:dark}</style>\n${body}`;
const fragmento = path.join(dir, `${slug}-artefacto.html`);
fs.writeFileSync(fragmento, frag);
const mb = (f) => (fs.statSync(f).size / 1048576).toFixed(1) + ' MB';
console.log(c.ok(`\n  ✔ ${rel(salida)}  (${mb(salida)})`) + c.dim('  → ábrelo con doble clic en el navegador'));
console.log(c.dim(`    Fragmento para publicar con enlace: ${rel(fragmento)} (${mb(fragmento)})`));
if (fs.statSync(fragmento).size > 15.5e6) console.log(c.aviso('  ⚠ Supera los 15,5 MB: no cabe como página con enlace; usa el archivo único o reduce el vídeo (--ancho=400).'));
