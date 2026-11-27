#!/usr/bin/env node
/**
 * Prepara un clip de vídeo como túnel de la web (modo «video»): lo optimiza para recorrerlo con el scroll
 * (sin audio, 24 fps, MP4 + WebM de reserva, cuadros clave frecuentes), saca un póster y propone colores.
 * Uso: npm run video -- <proyecto> <ruta-del-clip> [--tinte=0.6] [--ancho=480]
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { argumentos, dirProyecto, leerJSON, escribirJSON, rgbAHex, colores as c, rel } from './lib/util.mjs';

const { pos, flags } = argumentos();
const [slug, clip] = pos;
if (!slug || !clip || !fs.existsSync(clip)) { console.error(c.error('\n  Uso: npm run video -- <proyecto> <ruta-del-clip.mp4>\n  (el clip debe existir)\n')); process.exit(1); }
if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0) { console.error(c.error('\n  ✖ Hace falta ffmpeg (macOS: brew install ffmpeg · Windows: winget install ffmpeg).\n')); process.exit(1); }
const dir = dirProyecto(slug), assets = path.join(dir, 'assets');
fs.mkdirSync(assets, { recursive: true });
const ancho = Math.min(Number(flags.ancho) || 480, 720);

const sonda = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', clip]).stdout.toString());
const W = sonda.streams[0].width, H = sonda.streams[0].height, dur = parseFloat(sonda.format.duration);
console.log(c.neg(`\nPreparando el túnel de vídeo de «${slug}»`));
console.log(c.dim(`  Clip: ${W}×${H}, ${dur.toFixed(1)} s${W > H ? '  ⚠ es apaisado: el modo vídeo está pensado para clips verticales o cuadrados (si no, se recorta)' : ''}`));
const w = Math.min(ancho, W), vf = `fps=24,scale=${w}:-2:flags=lanczos`;
const ff = (args) => { const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', clip, '-an', ...args], { stdio: ['ignore', 'inherit', 'inherit'] }); if (r.status !== 0) throw new Error('ffmpeg falló'); };
const mb = (f) => (fs.statSync(f).size / 1048576).toFixed(1) + ' MB';

const mp4 = path.join(assets, 'tunel.mp4'), webm = path.join(assets, 'tunel.webm'), poster = path.join(assets, 'tunel-poster.webp');
// cuadro clave cada 6 fotogramas: permite «rebobinar» con el scroll sin tirones
ff(['-vf', vf, '-c:v', 'libx264', '-preset', 'slow', '-crf', '32', '-g', '6', '-keyint_min', '1', '-sc_threshold', '0', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4]);
console.log(c.ok('  ✔ ') + `assets/tunel.mp4  ${mb(mp4)}`);
if (!flags['sin-webm']) { ff(['-vf', vf, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '47', '-g', '8', '-row-mt', '1', '-cpu-used', '3', webm]); console.log(c.ok('  ✔ ') + `assets/tunel.webm ${mb(webm)}  (reserva para navegadores sin H.264)`); }
const tmpPng = path.join(assets, '.poster.png');
ff(['-ss', String(Math.min(dur * 0.3, dur - 0.1)), '-vf', `scale=${w}:-2`, '-frames:v', '1', tmpPng]);
await sharp(tmpPng).webp({ quality: 75 }).toFile(poster); fs.rmSync(tmpPng);

// ---- paleta del clip: tonos saturados y luminosos más frecuentes ----
const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', mp4, '-vf', 'fps=1,scale=64:-2', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 28 });
const buf = r.stdout, cubos = new Map();
for (let i = 0; i + 2 < buf.length; i += 3) {
  const [R, G, B] = [buf[i], buf[i + 1], buf[i + 2]], mx = Math.max(R, G, B), mn = Math.min(R, G, B);
  if (mx < 200 || (mx - mn) / mx < 0.5) continue;
  const h = ((mx === R ? (G - B) / (mx - mn) : mx === G ? 2 + (B - R) / (mx - mn) : 4 + (R - G) / (mx - mn)) * 60 + 360) % 360;
  const k = Math.round(h / 30) % 12, o = cubos.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
  o.n++; o.r += R; o.g += G; o.b += B; cubos.set(k, o);
}
const paleta = [...cubos.values()].sort((a, b) => b.n - a.n).slice(0, 4).map((o) => rgbAHex([o.r / o.n, o.g / o.n, o.b / o.n]));
console.log(`  Colores del clip: ${paleta.join(', ') || '—'}  ${c.dim('(úsalos como acento si quieres que la web combine con el vídeo)')}`);

// ---- web.json ----
const rutaWeb = path.join(dir, 'contenido/web.json');
if (fs.existsSync(rutaWeb)) {
  const web = leerJSON(rutaWeb);
  Object.assign(web.escenario ??= {}, { modo: 'video', video_tunel: 'assets/tunel.mp4', video_tunel_poster: 'assets/tunel-poster.webp', video_aspecto: +(W / H).toFixed(4), video_duracion: +dur.toFixed(2) });
  if (!flags['sin-webm']) web.escenario.video_tunel_webm = 'assets/tunel.webm'; else delete web.escenario.video_tunel_webm;
  if (flags.tinte !== undefined) web.escenario.video_tinte = Math.max(0, Math.min(1, Number(flags.tinte)));
  escribirJSON(rutaWeb, web);
  console.log(c.ok('  ✔ ') + `contenido/web.json actualizado (escenario.modo = "video")`);
} else console.log(c.aviso('  ⚠ Aún no hay contenido/web.json: cuando lo crees, añade escenario.modo = "video" y escenario.video_tunel = "assets/tunel.mp4".'));
console.log(c.dim(`  Siguiente paso: npm run construir -- ${slug}  ·  npm run capturas -- ${slug}\n`));
