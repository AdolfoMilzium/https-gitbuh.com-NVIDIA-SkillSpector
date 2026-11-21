#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { chromium } from 'playwright';
import { argumentos, resolverSlug, dirProyecto, colores as c, rel } from './lib/util.mjs';
import { servirCarpeta } from './lib/servidor.mjs';

const { pos, flags } = argumentos();
const slug = resolverSlug(pos[0]);
const dir = dirProyecto(slug), dist = path.join(dir, 'dist'), salida = path.join(dir, 'capturas');
if (!fs.existsSync(path.join(dist, 'index.html'))) { console.error(c.error(`\n  ✖ Primero construye la web: npm run construir ${slug}\n`)); process.exit(1); }

const VISTAS = [
  { nombre: 'escritorio', ancho: 1440, alto: 900, dsf: flags.nitida ? 2 : 1, movil: false },
  { nombre: 'movil', ancho: 390, alto: 844, dsf: 2, movil: true },
].filter((v) => !flags.solo || v.nombre === flags.solo);

const ARGS = ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox'];
async function lanzar() {
  try { return await chromium.launch({ args: ARGS }); }
  catch (e) {
    if (fs.existsSync('/opt/pw-browsers/chromium')) return chromium.launch({ args: ARGS, executablePath: '/opt/pw-browsers/chromium' });
    throw new Error('No se pudo abrir el navegador de pruebas. Ejecuta una vez: npx playwright install chromium');
  }
}

fs.rmSync(salida, { recursive: true, force: true });
const srv = await servirCarpeta(dist);
const nav = await lanzar();
const informe = { problemas: [], consola: [] };
console.log(c.neg(`\nCapturas de «${slug}»`));
try {
  for (const v of VISTAS) {
    const ctx = await nav.newContext({ viewport: { width: v.ancho, height: v.alto }, deviceScaleFactor: v.dsf, isMobile: v.movil, hasTouch: v.movil });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/GPU stall|GL Driver Message/.test(m.text())) informe.consola.push(`[${v.nombre}] ${m.text().slice(0, 240)}`); });
    page.on('response', (r) => { if (r.status() >= 400) informe.consola.push(`[${v.nombre}] ${r.status()} ${r.url().replace(srv.url, '/')}`); });
    page.on('pageerror', (e) => informe.consola.push(`[${v.nombre}] ERROR ${e.message.slice(0, 200)}`));
    await page.goto(srv.url + '?captura=1', { waitUntil: 'load' });
    try { await page.waitForFunction(() => window.__kit?.ready, null, { timeout: 40000 }); }
    catch { informe.problemas.push(`[${v.nombre}] El motor no arrancó (¿WebGL no disponible?). Se captura la versión de texto.`); }
    const kit = await page.evaluate(() => (window.__kit ? { n: window.__kit.n, ids: window.__kit.capitulos, s: window.__kit.sCap } : null));
    const dirV = path.join(salida, v.nombre); fs.mkdirSync(dirV, { recursive: true });
    const archivos = [];
    const foto = async (nombre, etiqueta) => {
      const f = path.join(dirV, `${nombre}.jpg`);
      await page.screenshot({ path: f, type: 'jpeg', quality: 86 });
      archivos.push({ f, etiqueta });
    };
    if (!kit) { await foto('00-texto', 'sin WebGL'); }
    else {
      const elegidos = flags.cap ? String(flags.cap).split(',').map((x) => Number(x) - 1) : null;
      for (let i = 0; i < kit.n; i++) {
        if (elegidos && !elegidos.includes(i)) continue;
        await page.evaluate(([p, i]) => window.__kit.irA(p, i), [kit.s[i], i]);
        await page.waitForTimeout(flags.espera ? Number(flags.espera) : 1300);
        // ¿el texto cabe en pantalla y no se sale?
        const caja = await page.evaluate(() => { const e = document.querySelector('.capitulo.activo .capitulo__caja'); if (!e) return null; const r = e.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right, W: innerWidth, H: innerHeight }; });
        if (caja && (caja.t < 0 || caja.b > caja.H + 1 || caja.l < -1 || caja.r > caja.W + 1)) informe.problemas.push(`[${v.nombre}] El texto del capítulo «${kit.ids[i]}» no cabe en pantalla (arriba ${Math.round(caja.t)}, abajo ${Math.round(caja.b)} de ${caja.H}).`);
        await foto(`${String(i + 1).padStart(2, '0')}-${kit.ids[i]}`, `${i + 1}. ${kit.ids[i]}`);
      }
      if (!elegidos || flags.final) {
        await page.evaluate(() => window.__kit.irA(1, window.__kit.n - 1));
        await page.waitForTimeout(1300);
        await foto('99-final', 'luz final');
      }
      const desborda = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      if (desborda) informe.problemas.push(`[${v.nombre}] Hay scroll horizontal (algo se sale por la derecha).`);
      console.log(c.dim(`  · ${v.nombre}: calidad adaptativa nivel ${(await page.evaluate(() => window.__kit.info().nivelCalidad))}`));
    }
    // hoja de contacto
    const cols = v.movil ? 4 : 3, ancho = v.movil ? 260 : 620, alto = Math.round(ancho * v.alto / v.ancho), marcoH = 26, sep = 10;
    const filas = Math.ceil(archivos.length / cols);
    const W = cols * ancho + (cols + 1) * sep, H = filas * (alto + marcoH) + (filas + 1) * sep;
    const capas = [];
    for (let k = 0; k < archivos.length; k++) {
      const x = sep + (k % cols) * (ancho + sep), y = sep + Math.floor(k / cols) * (alto + marcoH + sep);
      capas.push({ input: await sharp(archivos[k].f).resize(ancho, alto).toBuffer(), left: x, top: y + marcoH });
      capas.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${marcoH}"><text x="4" y="18" font-family="Arial,Helvetica,sans-serif" font-size="14" fill="#cfd6e4">${archivos[k].etiqueta.replace(/&/g, '&amp;')}</text></svg>`), left: x, top: y });
    }
    await sharp({ create: { width: W, height: H, channels: 3, background: '#12151c' } }).composite(capas).jpeg({ quality: 88 }).toFile(path.join(salida, `hoja-${v.nombre}.jpg`));
    await ctx.close();
  }
} finally { await nav.close(); await srv.cerrar(); }

if (informe.consola.length) { console.log(c.aviso('\n  Mensajes de la consola del navegador:')); [...new Set(informe.consola)].slice(0, 12).forEach((m) => console.log(c.aviso('   · ' + m))); }
if (informe.problemas.length) { console.log(c.error('\n  Problemas detectados:')); informe.problemas.forEach((m) => console.log(c.error('   ✖ ' + m))); }
else console.log(c.ok('\n  ✔ Sin desbordes de texto ni scroll horizontal.'));
console.log(c.ok(`  ✔ Capturas y hojas de contacto en ${rel(salida)}\n`));
