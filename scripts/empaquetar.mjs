#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';
import { argumentos, resolverSlug, dirProyecto, colores as c, rel } from './lib/util.mjs';
import { actualizarEstado } from './lib/estado.mjs';

const { pos } = argumentos();
const slug = resolverSlug(pos[0]);
const dir = dirProyecto(slug), dist = path.join(dir, 'dist'), zip = path.join(dir, `${slug}.zip`);
if (!fs.existsSync(path.join(dist, 'index.html'))) { console.error(c.error(`\n  ✖ Primero construye la web: npm run construir ${slug}\n`)); process.exit(1); }
fs.rmSync(zip, { force: true });
const salida = fs.createWriteStream(zip);
const zipper = archiver('zip', { zlib: { level: 9 } });
const fin = new Promise((ok, ko) => { salida.on('close', ok); zipper.on('error', ko); });
zipper.pipe(salida);
zipper.glob('**/*', { cwd: dist, dot: true });   // incluye .htaccess; index.html queda en la raíz del zip
await zipper.finalize(); await fin;
const mb = (fs.statSync(zip).size / 1048576).toFixed(1);
actualizarEstado(slug, (e) => { e.ultimo_zip = new Date().toISOString(); });
console.log(c.ok(`\n  ✔ ${rel(zip)}  (${mb} MB)`));
console.log(c.dim('    El index.html está en la raíz del zip, junto al .htaccess. Súbelo tal cual a public_html (o a la carpeta del subdominio).\n'));
