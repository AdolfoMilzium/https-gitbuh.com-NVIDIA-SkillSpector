#!/usr/bin/env node
/**
 * Lee la web pública de una empresa (textos, logo, colores, tipografías, contacto) con Playwright.
 * Respeta robots.txt, cierra banners de cookies, lee hasta 6 páginas y hace capturas.
 * Uso: npm run extraer -- https://empresa.com [slug]
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { chromium } from 'playwright';
import { argumentos, dirProyecto, escribirJSON, slugify, RAIZ, colores as c, rel, hexARgb, rgbAHex, luminanciaRelativa } from './lib/util.mjs';
import { parsearRobots, permitido } from './lib/robots.mjs';
import { existeFuente } from './lib/fuentes.mjs';
import { estadoInicial, rutaEstado } from './lib/estado.mjs';

const AGENTE = 'KitWebInmersiva';
const UA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 (compatible; ${AGENTE}/1.0)`;
const MAX_PAGINAS = 6;
const PRIORIDAD = [/nosotros|sobre|about|empresa|qui[eé]nes|historia|equipo|team/i, /servicio|service|soluci|producto|product|actividad|especialidad|trabajos|proyectos/i, /contact|ubicaci|donde|d[oó]nde|visit/i, /cliente|casos|portfolio|referencias|testimonio|opini/i];

const { pos, flags } = argumentos();
const urlEntrada = pos[0];
if (!urlEntrada) { console.error(c.error('\n  Falta la dirección web. Uso: npm run extraer -- https://empresa.com [nombre-carpeta]\n')); process.exit(1); }
let origen;
try { origen = new URL(/^https?:/i.test(urlEntrada) ? urlEntrada : 'https://' + urlEntrada); } catch { console.error(c.error('\n  Esa dirección web no es válida.\n')); process.exit(1); }
const slug = pos[1] ? slugify(pos[1]) : slugify(origen.hostname.replace(/^www\./, '').split('.').slice(0, -1).join('-') || origen.hostname);
const dir = dirProyecto(slug), dirExt = path.join(dir, 'extraccion');
fs.mkdirSync(dirExt, { recursive: true }); fs.mkdirSync(path.join(dir, 'assets'), { recursive: true }); fs.mkdirSync(path.join(dir, 'contenido'), { recursive: true });
console.log(c.neg(`\nLeyendo ${origen.origin}  →  proyectos/${slug}`));

// ---------- robots.txt ----------
let grupos = [];
try { const r = await fetch(origen.origin + '/robots.txt', { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(8000) }); if (r.ok && /text|plain/.test(r.headers.get('content-type') ?? 'text/plain')) grupos = parsearRobots(await r.text()); } catch { /* sin robots.txt */ }
const puedo = (u) => permitido(grupos, AGENTE, new URL(u).pathname + new URL(u).search);
if (!puedo(origen.href)) {
  console.error(c.error('\n  ✖ El robots.txt de esa web NO permite la lectura automática de la página principal.'));
  console.error('    No se continúa. Opciones: pedir permiso a la empresa, o copiar a mano los textos que te autoricen.\n');
  process.exit(2);
}

async function lanzar() {
  const args = ['--no-sandbox'];
  try { return await chromium.launch({ args }); }
  catch (e) {
    if (fs.existsSync('/opt/pw-browsers/chromium')) return chromium.launch({ args, executablePath: '/opt/pw-browsers/chromium' });
    throw new Error('No se pudo abrir el navegador. Ejecuta una vez: npx playwright install chromium');
  }
}

const SELECTORES_COOKIES = ['#onetrust-reject-all-handler', '#CybotCookiebotDialogBodyButtonDecline', '#onetrust-accept-btn-handler', '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll', '.cc-dismiss', '.cc-allow', '#cookie-accept', '#accept-cookies', 'button[aria-label*="ceptar" i]', 'button[aria-label*="ccept" i]', '.cookie-accept', '.js-cookie-accept', '#cmplz-accept', '.cmplz-accept', '#didomi-notice-agree-button', '.fc-cta-consent'];
const TEXTOS_RECHAZAR = /^(rechazar( todas?)?( las cookies)?|solo (las )?necesarias|solo esenciales|reject( all)?|decline|deny)$/i;
const TEXTOS_ACEPTAR = /^(aceptar( todas?)?( las)?( cookies)?|aceptar y cerrar|acepto|entendido|de acuerdo|permitir( todas?)?|accept( all)?( cookies)?|i agree|agree|allow all|got it|ok|vale)$/i;

async function cerrarCookies(page) {
  for (const sel of SELECTORES_COOKIES) {
    try { const el = page.locator(sel).first(); if (await el.isVisible({ timeout: 150 })) { await el.click({ timeout: 800 }); await page.waitForTimeout(400); return true; } } catch { /* siguiente */ }
  }
  for (const re of [TEXTOS_RECHAZAR, TEXTOS_ACEPTAR]) {
    try {
      const ok = await page.evaluate(([src]) => {
        const re = new RegExp(src, 'i');
        const cand = [...document.querySelectorAll('button, a, [role=button], input[type=button], input[type=submit]')];
        const b = cand.find((e) => { const t = (e.innerText || e.value || '').trim(); const r = e.getBoundingClientRect(); return t && t.length < 40 && re.test(t) && r.width > 0 && r.height > 0; });
        if (b) { b.click(); return true; } return false;
      }, [re.source]);
      if (ok) { await page.waitForTimeout(500); return true; }
    } catch { /* siguiente */ }
  }
  return false;
}
const OCULTAR_AVISOS = `[id*="cookie" i],[class*="cookie" i],[id*="consent" i],[class*="consent" i],[id*="cmp" i][role=dialog],#onetrust-consent-sdk,.cc-window,#CybotCookiebotDialog{display:none!important}`;

/** Código que se ejecuta dentro de la página: texto, contacto, enlaces, logo, colores y fuentes. */
function extraerDePagina() {
  const visible = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
  const limpio = (t) => (t || '').replace(/\s+/g, ' ').trim();
  const quitarRuido = (e) => !e.closest('nav, footer, header, [class*="cookie" i], [id*="cookie" i], script, style, noscript, [aria-hidden="true"]');
  const out = { url: location.href, titulo: document.title, idioma: document.documentElement.lang || '' };
  const meta = (n) => document.querySelector(`meta[name="${n}"],meta[property="${n}"]`)?.content?.trim() || '';
  out.descripcion = meta('description') || meta('og:description');
  out.nombreSitio = meta('og:site_name') || meta('application-name');
  out.ogImagen = meta('og:image'); out.colorTema = meta('theme-color');
  out.encabezados = [...document.querySelectorAll('h1,h2,h3')].filter(visible).map((h) => ({ n: +h.tagName[1], t: limpio(h.innerText) })).filter((h) => h.t && h.t.length < 160).slice(0, 40);
  const vistos = new Set();
  out.parrafos = [...document.querySelectorAll('p, li, blockquote')].filter((p) => visible(p) && quitarRuido(p)).map((p) => limpio(p.innerText)).filter((t) => t.length > 35 && t.length < 600 && !vistos.has(t) && vistos.add(t)).slice(0, 60);
  out.citas = [...document.querySelectorAll('blockquote, [class*="testimon" i], [class*="opini" i], [class*="review" i]')].filter(visible).map((e) => limpio(e.innerText)).filter((t) => t.length > 30 && t.length < 400).slice(0, 8);
  // --- contacto ---
  const texto = document.body.innerText || '';
  const emails = new Set([...document.querySelectorAll('a[href^="mailto:"]')].map((a) => a.getAttribute('href').replace(/^mailto:/i, '').split('?')[0].trim()));
  (texto.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []).forEach((e) => emails.add(e));
  const tels = new Set([...document.querySelectorAll('a[href^="tel:"]')].map((a) => limpio(a.innerText) || a.getAttribute('href').replace(/^tel:/i, '')));
  (texto.match(/(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:[6-9]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}|[6-9]\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2})(?!\d)/g) || []).map(limpio).filter((t) => !/^(19|20)\d\d/.test(t)).slice(0, 3).forEach((t) => tels.add(t));
  const direcciones = new Set();
  document.querySelectorAll('address, [itemprop="address"], [class*="address" i], [class*="direccion" i]').forEach((a) => { const t = limpio(a.innerText); if (t.length > 8 && t.length < 200) direcciones.add(t); });
  document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => { try { const j = JSON.parse(s.textContent); (Array.isArray(j) ? j : [j, ...(j['@graph'] || [])]).forEach((o) => { const a = o?.address; if (a) direcciones.add(typeof a === 'string' ? a : [a.streetAddress, a.postalCode, a.addressLocality, a.addressRegion].filter(Boolean).join(', ')); if (o?.telephone) tels.add(o.telephone); if (o?.email) emails.add(o.email); }); } catch { /* json roto */ } });
  out.contacto = { emails: [...emails].slice(0, 5), telefonos: [...tels].slice(0, 4), direcciones: [...direcciones].filter(Boolean).slice(0, 3) };
  out.redes = [...new Set([...document.querySelectorAll('a[href]')].map((a) => a.href).filter((h) => /(facebook|instagram|linkedin|twitter|x\.com|youtube|tiktok|pinterest)\./i.test(h)))].slice(0, 8);
  out.enlaces = [...document.querySelectorAll('a[href]')].map((a) => ({ href: a.href, t: limpio(a.innerText).slice(0, 60) })).filter((a) => a.href.startsWith(location.origin)).slice(0, 200);
  // --- logo (candidatos) ---
  const cand = [];
  document.querySelectorAll('img, svg').forEach((e) => {
    if (!visible(e)) return;
    const r = e.getBoundingClientRect(); if (r.width < 24 || r.height < 12 || r.width > 600 || r.top > 400) return;
    const attrs = ((e.getAttribute('src') || '') + ' ' + (e.getAttribute('alt') || '') + ' ' + (e.className?.baseVal ?? e.className) + ' ' + (e.closest('a')?.className || '') + ' ' + (e.id || '')).toLowerCase();
    let puntos = 0;
    if (/logo|brand|marca/.test(attrs)) puntos += 4;
    if (e.closest('header, nav, [class*="header" i], [id*="header" i]')) puntos += 3;
    if (e.closest('a[href="/"], a[href="' + location.origin + '/"], a[href="' + location.origin + '"]')) puntos += 2;
    if (r.top < 150) puntos += 1;
    if (puntos < 3) return;
    cand.push({ tipo: e.tagName.toLowerCase(), src: e.tagName === 'IMG' ? (e.currentSrc || e.src) : null, svg: e.tagName === 'svg' ? e.outerHTML.slice(0, 60000) : null, puntos, ancho: Math.round(r.width) });
  });
  out.logos = cand.sort((a, b) => b.puntos - a.puntos).slice(0, 4);
  out.iconos = [...document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]')].map((l) => ({ href: l.href, tam: l.sizes?.value || '' }));
  // --- colores ponderados por uso (superficie y cantidad de texto) ---
  const pesos = { fondo: {}, texto: {}, color: {} };
  const q = (r, g, b) => [r, g, b].map((v) => Math.round(v / 8) * 8).join(',');
  const parse = (s) => { const m = /rgba?\(([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:[, /]+([\d.]+))?\)/.exec(s); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null; };
  const sat = ([r, g, b]) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx === 0 ? 0 : (mx - mn) / mx; };
  const H = Math.max(document.documentElement.scrollHeight, innerHeight), tope = Math.min(H, innerHeight * 4);
  const elems = [...document.querySelectorAll('body *')].slice(0, 4000);
  for (const e of elems) {
    const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.top + scrollY > tope) continue;
    const s = getComputedStyle(e); if (s.visibility === 'hidden' || s.display === 'none') continue;
    const area = Math.min(r.width, innerWidth) * Math.min(r.height, innerHeight * 1.5);
    const bg = parse(s.backgroundColor);
    if (bg && bg[3] > 0.6) { const k = q(bg[0], bg[1], bg[2]); pesos.fondo[k] = (pesos.fondo[k] || 0) + area; if (sat(bg) > 0.25) { const bonus = /^(A|BUTTON)$/.test(e.tagName) || /btn|button|boton|cta/i.test(e.className) ? 6 : 1; pesos.color[k] = (pesos.color[k] || 0) + area * bonus; } }
    const tc = parse(s.color); const t = (e.childNodes.length && [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('')) || '';
    if (tc && t.length) { const k = q(tc[0], tc[1], tc[2]); const w = t.length * Math.pow(parseFloat(s.fontSize) || 14, 2); pesos.texto[k] = (pesos.texto[k] || 0) + w; if (sat(tc) > 0.3) pesos.color[k] = (pesos.color[k] || 0) + w * (/^(A|H1|H2|H3|BUTTON)$/.test(e.tagName) ? 3 : 1); }
    const bc = parse(s.borderTopColor); if (bc && bc[3] > 0.6 && parseFloat(s.borderTopWidth) > 0 && sat(bc) > 0.3) { const k = q(bc[0], bc[1], bc[2]); pesos.color[k] = (pesos.color[k] || 0) + r.width * 4; }
    if (e instanceof SVGElement) { for (const prop of ['fill', 'stroke']) { const f = parse(s[prop]); if (f && sat(f) > 0.3) { const k = q(f[0], f[1], f[2]); pesos.color[k] = (pesos.color[k] || 0) + area * 0.5; } } }
  }
  out.pesosColor = pesos;
  // --- tipografías (ponderadas por cantidad de texto) ---
  const fam = (e) => getComputedStyle(e).fontFamily.split(',')[0].replace(/["']/g, '').trim();
  const sumaF = (sel) => { const m = {}; document.querySelectorAll(sel).forEach((e) => { if (!visible(e)) return; const t = limpio(e.innerText).length; if (t) { const f = fam(e); m[f] = (m[f] || 0) + t; } }); return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([f, w]) => ({ familia: f, peso: w })); };
  out.fuentes = { titulo: sumaF('h1, h2, h3'), cuerpo: sumaF('p, li, span') };
  out.fuentesCargadas = [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/["']/g, '')))];
  return out;
}

// ---------- agrupar colores ----------
const aHex = (k) => rgbAHex(k.split(',').map(Number));
function fusionar(mapa, umbral = 34) {
  const filas = Object.entries(mapa).map(([k, w]) => ({ rgb: k.split(',').map(Number), w })).sort((a, b) => b.w - a.w);
  const grupos = [];
  for (const f of filas) { const g = grupos.find((x) => Math.hypot(...f.rgb.map((v, i) => v - x.rgb[i])) < umbral); if (g) g.w += f.w; else grupos.push({ rgb: f.rgb, w: f.w }); }
  const total = grupos.reduce((s, g) => s + g.w, 0) || 1;
  return grupos.sort((a, b) => b.w - a.w).map((g) => ({ hex: rgbAHex(g.rgb), peso: +(g.w / total).toFixed(3) }));
}
const GENERICAS = new Set(['serif', 'sans-serif', 'system-ui', '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'arial', 'helvetica', 'helvetica neue', 'times new roman', 'georgia', 'verdana', 'tahoma', 'roboto', 'ui-sans-serif', 'inherit']);

// ---------- navegación ----------
const nav = await lanzar();
const resultado = { url: origen.href, slug, leido: new Date().toISOString(), robots: grupos.length ? 'respetado' : 'sin robots.txt', paginas: [], avisos: [] };
const pesosTotales = { fondo: {}, texto: {}, color: {} };
const acumula = (dst, src) => { for (const [k, v] of Object.entries(src)) dst[k] = (dst[k] || 0) + v; };
let primera = null;
try {
  const ctx = await nav.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 }, locale: 'es-ES', ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  const cola = [origen.href], vistas = new Set();
  const clave = (u) => { const x = new URL(u); x.hash = ''; return x.href.replace(/\/$/, ''); };
  while (cola.length && resultado.paginas.length < MAX_PAGINAS) {
    const u = cola.shift(); if (vistas.has(clave(u))) continue; vistas.add(clave(u));
    if (!puedo(u)) { resultado.avisos.push(`Omitida por robots.txt: ${u}`); continue; }
    try {
      process.stdout.write(c.dim(`  · ${u} … `));
      await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 9000 }).catch(() => {});
      await page.waitForTimeout(1200);
      await cerrarCookies(page);
      for (let y = 0; y < 3; y++) { await page.mouse.wheel(0, 900); await page.waitForTimeout(350); }
      await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
      await page.addStyleTag({ content: OCULTAR_AVISOS }).catch(() => {});
      const d = await page.evaluate(extraerDePagina);
      const n = resultado.paginas.length;
      await page.screenshot({ path: path.join(dirExt, n === 0 ? 'home-escritorio.png' : `pagina-${n + 1}.png`), fullPage: n === 0, timeout: 20000 }).catch(() => {});
      acumula(pesosTotales.fondo, d.pesosColor.fondo); acumula(pesosTotales.texto, d.pesosColor.texto); acumula(pesosTotales.color, d.pesosColor.color);
      delete d.pesosColor;
      if (n === 0) primera = d;
      resultado.paginas.push(d);
      console.log(c.ok('ok'));
      // priorizar enlaces útiles
      const nuevos = d.enlaces.filter((e) => !/\.(pdf|jpe?g|png|webp|gif|zip|docx?|xlsx?)$/i.test(e.href) && !/[?#].*(utm_|login|cart|checkout)/i.test(e.href) && !/\/(wp-admin|wp-login|cart|carrito|checkout|login|cuenta|account|aviso-legal|privacidad|cookies|politica)/i.test(e.href))
        .map((e) => ({ ...e, p: PRIORIDAD.findIndex((r) => r.test(e.href + ' ' + e.t)) })).filter((e) => e.p >= 0).sort((a, b) => a.p - b.p);
      for (const e of nuevos) if (!vistas.has(clave(e.href)) && !cola.includes(e.href)) cola.push(e.href);
      await page.waitForTimeout(900); // cortesía con el servidor
    } catch (e) { console.log(c.aviso('falló (' + e.message.split('\n')[0].slice(0, 80) + ')')); resultado.avisos.push(`No se pudo leer ${u}: ${e.message.split('\n')[0]}`); }
  }
  // captura móvil de la portada
  try {
    const m = await nav.newContext({ userAgent: UA, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-ES' });
    const pm = await m.newPage(); await pm.goto(origen.href, { waitUntil: 'domcontentloaded', timeout: 30000 }); await pm.waitForTimeout(2000); await cerrarCookies(pm); await pm.addStyleTag({ content: OCULTAR_AVISOS }).catch(() => {});
    await pm.screenshot({ path: path.join(dirExt, 'home-movil.png'), fullPage: false }); await m.close();
  } catch { /* opcional */ }
} finally { await nav.close(); }

if (!resultado.paginas.length) { console.error(c.error('\n  ✖ No se pudo leer ninguna página. Revisa la dirección o prueba más tarde.\n')); process.exit(3); }

// ---------- síntesis factual ----------
const fondos = fusionar(pesosTotales.fondo), textos = fusionar(pesosTotales.texto), acentos = fusionar(pesosTotales.color, 46).filter((x) => { const l = luminanciaRelativa(x.hex); return l > 0.02 && l < 0.85; }).slice(0, 5);
const fusionarFuentes = (k) => { const m = {}; resultado.paginas.forEach((p) => p.fuentes[k].forEach((f) => { m[f.familia] = (m[f.familia] || 0) + f.peso; })); return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([f]) => f); };
const ftit = fusionarFuentes('titulo'), fcue = fusionarFuentes('cuerpo');
const marcarGoogle = async (lista) => Promise.all(lista.slice(0, 3).map(async (f) => ({ familia: f, generica: GENERICAS.has(f.toLowerCase()), en_google_fonts: GENERICAS.has(f.toLowerCase()) ? null : await existeFuente(f) })));
const fuentes = { titulo: await marcarGoogle(ftit), cuerpo: await marcarGoogle(fcue), cargadas: primera.fuentesCargadas };

// logo
let logo = null;
async function intentaLogo(cand) {
  let buf = null, origenLogo = null;
  if (cand.svg) { buf = Buffer.from(cand.svg.includes('xmlns') ? cand.svg : cand.svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')); origenLogo = 'svg-inline'; }
  else if (cand.src && !cand.src.startsWith('data:')) { const r = await fetch(cand.src, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(10000) }); if (!r.ok) return null; buf = Buffer.from(await r.arrayBuffer()); origenLogo = cand.src; }
  else if (cand.src?.startsWith('data:image')) { buf = Buffer.from(cand.src.split(',')[1], cand.src.includes('base64') ? 'base64' : 'utf8'); origenLogo = 'data-uri'; }
  if (!buf) return null;
  let img = sharp(buf, { density: 300 });
  const meta = await img.metadata(); if (!meta.width) return null;
  let { data, info } = await img.resize({ width: 800, withoutEnlargement: false, fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // JPG/PNG sin transparencia sobre blanco: se convierte el blanco en transparencia
  let transparentes = 0; for (let i = 3; i < data.length; i += 4) if (data[i] < 250) transparentes++;
  if (transparentes / (data.length / 4) < 0.02) {
    const esq = [0, (info.width - 1) * 4, (info.height - 1) * info.width * 4].map((o) => (data[o] + data[o + 1] + data[o + 2]) / 3);
    if (esq.every((v) => v > 235)) for (let i = 0; i < data.length; i += 4) { const mn = Math.min(data[i], data[i + 1], data[i + 2]); data[i + 3] = Math.max(0, Math.min(255, (255 - mn) * 1.4)); }
  }
  let png = await sharp(data, { raw: info }).png().toBuffer();
  png = await sharp(png).trim({ threshold: 8 }).png().toBuffer();
  const t = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let suma = 0, n = 0; for (let i = 0; i < t.data.length; i += 4) if (t.data[i + 3] > 128) { suma += luminanciaRelativa(rgbAHex([t.data[i], t.data[i + 1], t.data[i + 2]])); n++; }
  if (n < 50) return null;
  const lumMedia = suma / n;
  const dest = path.join(dir, 'assets');
  fs.writeFileSync(path.join(dest, 'logo.png'), png);
  let claro = null;
  if (lumMedia < 0.4) { // logo oscuro: versión clara (silueta blanca) para fondos oscuros
    const b = Buffer.from(t.data); for (let i = 0; i < b.length; i += 4) { b[i] = b[i + 1] = b[i + 2] = 255; }
    await sharp(b, { raw: t.info }).png().toFile(path.join(dest, 'logo-claro.png')); claro = 'assets/logo-claro.png';
  }
  return { archivo: 'assets/logo.png', claro, origen: origenLogo, luminancia_media: +lumMedia.toFixed(2), oscuro: lumMedia < 0.4, ancho: t.info.width, alto: t.info.height };
}
for (const cand of primera.logos) { try { logo = await intentaLogo(cand); if (logo) break; } catch { /* siguiente candidato */ } }
if (!logo) for (const ic of [...primera.iconos].sort((a, b) => (parseInt(b.tam) || 0) - (parseInt(a.tam) || 0))) { try { logo = await intentaLogo({ src: ic.href }); if (logo) { logo.aviso = 'Solo se encontró el icono de la web, no un logo completo.'; break; } } catch { /* siguiente */ } }
if (!logo) resultado.avisos.push('No se encontró el logo. Pídelo a la empresa o colócalo a mano en assets/logo.png.');

// nombre
const sinSufijo = (t) => (t || '').split(/\s[|–—·•-]\s|\s-\s/).map((s) => s.trim()).filter(Boolean);
const nombre = primera.nombreSitio || sinSufijo(primera.titulo).sort((a, b) => a.length - b.length)[0] || origen.hostname.replace(/^www\./, '');
const unir = (k) => [...new Set(resultado.paginas.flatMap((p) => p.contacto[k]))].slice(0, 5);
const empresa = {
  _aviso: 'Borrador generado por el script de lectura: solo contiene lo que aparece en la web pública. El resto lo completa /crear-web sin inventar nada.',
  nombre, slug, url_origen: origen.origin, idioma: primera.idioma || 'es', descripcion_meta: primera.descripcion || null,
  contacto: { emails: unir('emails'), telefonos: unir('telefonos'), direcciones: unir('direcciones'), redes: [...new Set(resultado.paginas.flatMap((p) => p.redes))].slice(0, 8) },
  marca: { color_tema: primera.colorTema || null, fondo_dominante: fondos[0]?.hex ?? null, texto_dominante: textos[0]?.hex ?? null, fondos: fondos.slice(0, 4), textos: textos.slice(0, 3), acentos, tipografias: fuentes, logo },
  paginas: resultado.paginas.map((p) => ({ url: p.url, titulo: p.titulo, descripcion: p.descripcion, encabezados: p.encabezados, parrafos: p.parrafos, citas: p.citas })),
  avisos: resultado.avisos,
};
escribirJSON(path.join(dirExt, 'resultado.json'), { ...resultado, paginas: resultado.paginas.map(({ enlaces, ...r }) => r) });
escribirJSON(path.join(dir, 'empresa.json'), empresa);
if (!fs.existsSync(rutaEstado(slug))) escribirJSON(rutaEstado(slug), estadoInicial(slug, origen.origin));
fs.writeFileSync(path.join(RAIZ, '.proyecto-actual'), slug + '\n');

console.log(c.ok(`\n  ✔ ${resultado.paginas.length} página(s) leída(s) de «${nombre}»`));
console.log(`    Colores: fondo ${empresa.marca.fondo_dominante ?? '?'} · texto ${empresa.marca.texto_dominante ?? '?'} · acentos ${acentos.slice(0, 3).map((a) => a.hex).join(', ') || '—'}`);
console.log(`    Fuentes: títulos ${fuentes.titulo.map((f) => f.familia + (f.en_google_fonts === false ? ' (no está en Google Fonts)' : '')).join(', ') || '—'} · cuerpo ${fuentes.cuerpo.map((f) => f.familia).join(', ') || '—'}`);
console.log(`    Logo: ${logo ? logo.archivo + (logo.claro ? ' + versión clara' : '') : 'no encontrado'}   Contacto: ${empresa.contacto.emails.length} email(s), ${empresa.contacto.telefonos.length} teléfono(s)`);
resultado.avisos.forEach((a) => console.log(c.aviso('    ⚠ ' + a)));
console.log(c.dim(`    Guardado en ${rel(dir)}/empresa.json y ${rel(dirExt)}/\n`));
