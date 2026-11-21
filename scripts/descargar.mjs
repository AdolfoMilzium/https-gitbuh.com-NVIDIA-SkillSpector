#!/usr/bin/env node
/**
 * Descarga y optimiza lo que ha generado Higgsfield y lo coloca en la web.
 * Lee proyectos/<slug>/estado.json → visuales[] (cada uno con su url) y deja los archivos en assets/.
 *   textura  → WebP 1024×1024 sin costuras      capitulo / galeria → WebP (máx. 1920 px)
 *   social   → JPG 1200×630                       video → MP4 720p sin audio (ffmpeg)     modelo3d → GLB tal cual
 * Uso: npm run descargar -- <slug> [--forzar]
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { argumentos, resolverSlug, dirProyecto, leerJSON, escribirJSON, colores as c, rel } from './lib/util.mjs';
import { leerEstado, guardarEstado } from './lib/estado.mjs';

const { pos, flags } = argumentos();
const slug = resolverSlug(pos[0]);
const dir = dirProyecto(slug), assets = path.join(dir, 'assets'), originales = path.join(dir, 'originales');
fs.mkdirSync(assets, { recursive: true }); fs.mkdirSync(originales, { recursive: true });
const estado = leerEstado(slug);
const rutaWeb = path.join(dir, 'contenido/web.json');
const web = fs.existsSync(rutaWeb) ? leerJSON(rutaWeb) : null;

const tieneFfmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
const kb = (b) => (b / 1024 >= 1024 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB');

async function obtener(origen, destino) {
  if (/^https?:\/\//i.test(origen)) {
    const r = await fetch(origen, { signal: AbortSignal.timeout(120000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
  } else fs.copyFileSync(origen.replace(/^file:\/\//, ''), destino); // ruta local (pruebas)
}
const extDe = (u, defecto) => (path.extname(new URL(/^https?:/i.test(u) ? u : 'file://' + path.resolve(u)).pathname) || defecto).toLowerCase();

/** Hace una textura repetible: mezcla la imagen con ella misma desplazada medio lado. */
function sinCosturas(buf, S) {
  const out = Buffer.alloc(buf.length), h = S >> 1;
  const sm = (t) => { t = Math.min(1, Math.max(0, t / 0.5)); return t * t * (3 - 2 * t); };
  for (let y = 0; y < S; y++) {
    const wy = sm(1 - Math.abs((2 * y) / S - 1)), y2 = (y + h) % S;
    for (let x = 0; x < S; x++) {
      const m = sm(1 - Math.abs((2 * x) / S - 1)) * wy, x2 = (x + h) % S;
      const a = (y * S + x) * 3, b = (y2 * S + x2) * 3;
      for (let k = 0; k < 3; k++) out[a + k] = buf[a + k] * m + buf[b + k] * (1 - m);
    }
  }
  return out;
}

const procesadores = {
  async textura(orig, destino) {
    const S = 1024;
    const { data } = await sharp(orig).resize(S, S, { fit: 'cover' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    await sharp(sinCosturas(data, S), { raw: { width: S, height: S, channels: 3 } }).webp({ quality: 80 }).toFile(destino);
  },
  async imagen(orig, destino) { await sharp(orig).resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 78 }).toFile(destino); },
  async social(orig, destino) { await sharp(orig).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 85, mozjpeg: true }).toFile(destino); },
  async video(orig, destino) {
    if (!tieneFfmpeg) { fs.copyFileSync(orig, destino); return 'ffmpeg no está instalado: el vídeo se copió sin optimizar (instala ffmpeg y repite con --forzar).'; }
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', orig, '-an', '-vf', 'scale=-2:720:flags=lanczos', '-c:v', 'libx264', '-crf', '28', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', destino]);
    if (r.status !== 0) throw new Error('ffmpeg falló: ' + r.stderr?.toString().slice(0, 200));
  },
  async modelo3d(orig, destino) {
    const cab = fs.readFileSync(orig).subarray(0, 4).toString('latin1');
    if (cab !== 'glTF') throw new Error('el archivo no es un GLB válido');
    fs.copyFileSync(orig, destino);
    if (fs.statSync(destino).size > 15e6) return 'El modelo 3D pesa más de 15 MB; conviene un modelo más ligero.';
  },
};
const cual = { textura: 'textura', capitulo: 'imagen', galeria: 'imagen', social: 'social', video: 'video', modelo3d: 'modelo3d' };

function colocarEnWeb(v, dest) {
  if (!web) return;
  const cap = web.capitulos?.find((x) => x.id === v.capitulo);
  if (v.tipo === 'textura') web.escenario.textura = dest;
  else if (v.tipo === 'social') (web.meta ??= {}).imagen_social = dest;
  else if (v.tipo === 'capitulo' && cap) cap.imagen = dest;
  else if (v.tipo === 'video' && cap) cap.video = dest;
  else if (v.tipo === 'modelo3d' && cap) cap.modelo3d = { archivo: dest, escala: cap.modelo3d?.escala ?? 1 };
  else if (v.tipo === 'galeria' && cap) { cap.galeria ??= []; cap.galeria[v.indice ?? 0] = { ...(cap.galeria[v.indice ?? 0] ?? {}), imagen: dest }; }
}

const pendientes = estado.visuales.filter((v) => v.url && (flags.forzar || v.estado !== 'descargado'));
if (!estado.visuales.length) { console.log(c.aviso('\n  No hay visuales en estado.json. Primero genera con Higgsfield (/crear-web).\n')); process.exit(0); }
if (!pendientes.length) { console.log(c.ok('\n  ✔ Todo lo generado ya está descargado.') + c.dim(' (usa --forzar para repetirlo)\n')); process.exit(0); }
console.log(c.neg(`\nDescargando ${pendientes.length} visual(es) de «${slug}»…`));
let total = 0, errores = 0;
for (const v of pendientes) {
  const destRel = v.archivo || `assets/${v.id}.${v.tipo === 'video' ? 'mp4' : v.tipo === 'modelo3d' ? 'glb' : v.tipo === 'social' ? 'jpg' : 'webp'}`;
  const destino = path.join(dir, destRel.replace(/^assets\//, 'assets/'));
  try {
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    const orig = path.join(originales, `${v.id}${extDe(v.url, v.tipo === 'video' ? '.mp4' : v.tipo === 'modelo3d' ? '.glb' : '.png')}`);
    await obtener(v.url, orig);
    const nota = await procesadores[cual[v.tipo]](orig, destino);
    const t = fs.statSync(destino).size; total += t;
    v.estado = 'descargado'; v.archivo = destRel; v.tamano_bytes = t;
    colocarEnWeb(v, destRel);
    console.log(`  ${c.ok('✔')} ${v.id.padEnd(24)} → ${destRel}  ${c.dim(kb(t))}`);
    if (nota) console.log(c.aviso('    ⚠ ' + nota));
    if (v.tipo === 'video' && t > 3e6) console.log(c.aviso('    ⚠ El vídeo pesa más de 3 MB; vale con un clip más corto.'));
  } catch (e) { errores++; v.estado = 'error'; v.error = e.message; console.log(`  ${c.error('✖')} ${v.id}: ${e.message}`); }
}
guardarEstado(slug, estado);
if (web) escribirJSON(rutaWeb, web);
console.log(c.ok(`\n  ${errores ? '⚠' : '✔'} ${pendientes.length - errores} descargado(s), ${kb(total)} en assets/`) + (errores ? c.error(`  ·  ${errores} con error (reintenta; no se vuelve a pagar nada)`) : ''));
console.log(c.dim(`  Siguiente paso: npm run construir ${slug}\n`));
process.exit(errores ? 1 : 0);
