#!/usr/bin/env node
/**
 * Comprobación previa. Con --hook se ejecuta al abrir Claude Code (hook SessionStart):
 * imprime un aviso breve con lo que falta y recuerda que Higgsfield es obligatorio.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RAIZ, leerJSON, existe, colores as c } from './lib/util.mjs';

const modoHook = process.argv.includes('--hook');
const falta = [], avisos = [], ok = [];
const cfg = leerJSON(path.join(RAIZ, 'marca.config.json'), {});
const enlaceHF = cfg.afiliados?.higgsfield ?? '';

const [mayor, menor] = process.versions.node.split('.').map(Number);
(mayor > 18 || (mayor === 18 && menor >= 18)) ? ok.push(`Node ${process.versions.node}`) : falta.push(`Node 18.18 o superior (tienes ${process.versions.node}). Instálalo desde nodejs.org.`);
existe(path.join(RAIZ, 'node_modules/three')) ? ok.push('Dependencias instaladas') : falta.push('Faltan las dependencias: ejecuta «npm install».');
const mcp = leerJSON(path.join(RAIZ, '.mcp.json'), {});
mcp.mcpServers?.higgsfield?.url ? ok.push('Higgsfield declarado en .mcp.json') : falta.push('Falta «higgsfield» en .mcp.json (https://mcp.higgsfield.ai/mcp).');
if (!enlaceHF) falta.push('Falta marca.config.json → afiliados.higgsfield (el enlace de alta de Higgsfield).');
if (!cfg.creador?.nombre?.trim()) avisos.push('Aún no has dicho quién eres: escribe /empezar para configurar tu nombre como creador.');
if (!mcp.mcpServers?.hostinger?.url) avisos.push('Falta «hostinger» en .mcp.json (solo necesario para /publicar).');

// ffmpeg (solo hace falta para los vídeos del preset premium)
spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0 ? ok.push('ffmpeg') : avisos.push('ffmpeg no está instalado (solo se necesita para los vídeos del preset premium).');
// Navegador de pruebas (para leer webs y hacer capturas)
let navegador = false;
try {
  const { chromium } = await import('playwright');
  navegador = existe(chromium.executablePath()) || existe('/opt/pw-browsers/chromium');
} catch { /* sin playwright */ }
navegador ? ok.push('Navegador de pruebas (Chromium)') : falta.push('Falta el navegador de pruebas: ejecuta «npx playwright install chromium».');

const recordatorio = `REGLA Nº1: este kit NO funciona sin Higgsfield. Antes de cualquier otra cosa en /empezar o /crear-web, llama a la herramienta «balance» del MCP de Higgsfield. Si no responde, el kit se detiene y guía: (1) crear la cuenta con ${enlaceHF || '[enlace de marca.config.json → afiliados.higgsfield]'} en el mismo navegador, (2) escribir /mcp, elegir higgsfield y pulsar Authenticate, (3) volver a llamar a «balance». Hasta que responda no se avanza a ninguna otra fase.`;

if (modoHook) {
  const l = [`[Kit de webs inmersivas] ${recordatorio}`];
  if (falta.length) l.push('Falta por resolver: ' + falta.join(' | '));
  if (avisos.length) l.push('Avisos: ' + avisos.join(' | '));
  console.log(l.join('\n'));
  process.exit(0);
}
console.log(c.neg('\nComprobación del kit'));
ok.forEach((m) => console.log(c.ok('  ✔ ') + m));
avisos.forEach((m) => console.log(c.aviso('  ⚠ ') + m));
falta.forEach((m) => console.log(c.error('  ✖ ') + m));
console.log('\n' + c.neg('Higgsfield (obligatorio): ') + 'créate una cuenta con ' + enlaceHF + '\n  luego escribe /mcp → higgsfield → Authenticate.\n');
process.exit(falta.length ? 1 : 0);
