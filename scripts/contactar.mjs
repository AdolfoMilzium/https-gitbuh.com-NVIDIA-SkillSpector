#!/usr/bin/env node
/**
 * Genera la carta en A4 (HTML + PDF) con el código QR a la web de la propuesta.
 * Lee proyectos/<slug>/contacto/carta.json (lo redacta /contactar) y marca.config.json → creador.
 * NO envía nada a nadie. Uso: npm run contactar -- <slug> --url https://la-web-publicada.com
 */
import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';
import { chromium } from 'playwright';
import { argumentos, resolverSlug, dirProyecto, leerJSON, marca, esc, colores as c, rel } from './lib/util.mjs';

const { pos, flags } = argumentos();
const slug = resolverSlug(pos[0]);
const dir = path.join(dirProyecto(slug), 'contacto');
const urlWeb = flags.url;
if (!urlWeb || !/^https?:\/\//.test(urlWeb)) { console.error(c.error('\n  ✖ Indica la dirección de la web ya publicada: npm run contactar -- ' + slug + ' --url https://…\n')); process.exit(1); }
const rutaCarta = path.join(dir, 'carta.json');
if (!fs.existsSync(rutaCarta)) { console.error(c.error(`\n  ✖ Falta ${rel(rutaCarta)} (lo redacta /contactar).\n`)); process.exit(1); }
const carta = leerJSON(rutaCarta), cfg = marca(), cr = cfg.creador ?? {};
if (!cr.nombre?.trim()) { console.error(c.error('\n  ✖ Falta tu nombre como creador: ejecuta /empezar.\n')); process.exit(1); }

const qr = await QRCode.toDataURL(urlWeb, { margin: 1, width: 360, errorCorrectionLevel: 'M', color: { dark: '#111111', light: '#ffffff' } });
fs.writeFileSync(path.join(dir, 'qr.png'), Buffer.from(qr.split(',')[1], 'base64'));
const fecha = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Carta · ${esc(carta.destinatario?.empresa ?? slug)}</title>
<style>
@page { size: A4; margin: 0 }
* { box-sizing: border-box } body { margin: 0; font: 11pt/1.55 Georgia, 'Times New Roman', serif; color: #1b1b1b }
.hoja { width: 210mm; height: 297mm; padding: 22mm 24mm 18mm; display: flex; flex-direction: column }
.cab { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #ccc; padding-bottom: 6mm; font: 9.5pt/1.4 Helvetica, Arial, sans-serif; color: #444 }
.cab strong { display: block; font-size: 12pt; color: #111 }
.dest { margin: 10mm 0 6mm; font: 10.5pt/1.45 Helvetica, Arial, sans-serif } .fecha { text-align: right; font: 10pt Helvetica, Arial, sans-serif; color: #555 }
h1 { font: 700 15pt/1.25 Helvetica, Arial, sans-serif; margin: 6mm 0 4mm } p { margin: 0 0 3.2mm; text-wrap: pretty }
.qr { display: flex; gap: 8mm; align-items: center; margin: 7mm 0; padding: 6mm; border: 1px solid #ddd; border-radius: 3mm; background: #fafafa; font: 10pt/1.45 Helvetica, Arial, sans-serif }
.qr img { width: 38mm; height: 38mm } .qr b { display: block; font-size: 11.5pt; margin-bottom: 1.5mm } .qr span { word-break: break-all; color: #555; font-size: 8.5pt }
.firma { margin-top: auto; font: 10.5pt/1.45 Helvetica, Arial, sans-serif } .pie { margin-top: 8mm; padding-top: 4mm; border-top: 1px solid #ddd; font: 8pt/1.4 Helvetica, Arial, sans-serif; color: #666 }
</style></head><body><div class="hoja">
<div class="cab"><div><strong>${esc(cr.nombre)}</strong>${[cr.web, cr.email, cr.telefono].filter(Boolean).map(esc).join(' · ')}</div><div class="fecha">${esc(fecha)}</div></div>
<div class="dest">${[carta.destinatario?.nombre, carta.destinatario?.cargo, carta.destinatario?.empresa, carta.destinatario?.direccion].filter(Boolean).map(esc).join('<br>')}</div>
<h1>${esc(carta.asunto ?? '')}</h1>
<p>${esc(carta.saludo ?? 'Estimados señores:')}</p>
${(carta.parrafos ?? []).map((p) => `<p>${esc(p)}</p>`).join('\n')}
<div class="qr"><img src="${qr}" alt="Código QR"><div><b>${esc(carta.texto_qr ?? 'Mira la propuesta en tu móvil')}</b>Apunta con la cámara al código.<br><span>${esc(urlWeb)}</span></div></div>
<div class="firma">${esc(carta.despedida ?? 'Quedo a su disposición.')}<br><br><strong>${esc(cr.nombre)}</strong><br>${[cr.email, cr.telefono].filter(Boolean).map(esc).join(' · ')}</div>
<div class="pie">${esc(cfg.textos?.aviso_concepto ?? '')}. La web es una propuesta de cortesía y no un trabajo contratado. ${esc(carta.pie ?? '')}</div>
</div></body></html>`;
fs.writeFileSync(path.join(dir, 'carta.html'), html);
const args = ['--no-sandbox'];
let nav; try { nav = await chromium.launch({ args }); } catch { nav = await chromium.launch({ args, executablePath: '/opt/pw-browsers/chromium' }); }
try { const p = await nav.newPage(); await p.setContent(html, { waitUntil: 'load' }); await p.pdf({ path: path.join(dir, 'carta.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true }); } finally { await nav.close(); }
console.log(c.ok(`\n  ✔ Carta lista: ${rel(path.join(dir, 'carta.pdf'))}`) + c.dim('  (también carta.html y qr.png)\n  Imprímela y envíala por correo postal o entrégala en mano. Este kit no envía nada por ti.\n'));
