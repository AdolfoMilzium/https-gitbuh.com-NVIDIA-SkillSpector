#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { argumentos, resolverSlug, dirProyecto, colores as c } from './lib/util.mjs';
import { servirCarpeta } from './lib/servidor.mjs';

const { pos, flags } = argumentos();
const slug = resolverSlug(pos[0]);
const dist = path.join(dirProyecto(slug), 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) { console.error(c.error(`\n  ✖ Aún no hay web construida. Ejecuta primero: npm run construir ${slug}\n`)); process.exit(1); }
const s = await servirCarpeta(dist, Number(flags.puerto) || 4173);
console.log(c.ok(`\n  ✔ «${slug}» disponible en ${s.url}`) + c.dim('   (Ctrl+C para cerrar)\n'));
if (!flags['sin-abrir']) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start ""' : 'xdg-open';
  exec(`${cmd} ${s.url}`, () => {});
}
