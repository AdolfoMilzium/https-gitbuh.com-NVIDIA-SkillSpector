#!/usr/bin/env node
import path from 'node:path';
import { argumentos, resolverSlug, dirProyecto, leerJSON, colores as c } from './lib/util.mjs';
import { validarWeb } from './lib/validar.mjs';

const { pos, flags } = argumentos();
const slug = resolverSlug(pos[0]);
const dir = dirProyecto(slug);
const datos = leerJSON(path.join(dir, 'contenido/web.json'));
const { errores, avisos } = await validarWeb(datos, { dirAssets: path.join(dir, 'assets'), slug, red: !flags['sin-red'] });
console.log(c.neg(`\nValidación de «${slug}»`));
avisos.forEach((m) => console.log(c.aviso('  ⚠ ' + m)));
errores.forEach((m) => console.log(c.error('  ✖ ' + m)));
if (!errores.length) console.log(c.ok(`  ✔ web.json correcto${avisos.length ? ` (${avisos.length} aviso${avisos.length > 1 ? 's' : ''})` : ''}.`));
else console.log(c.error(`\n  ${errores.length} error${errores.length > 1 ? 'es' : ''} que corregir antes de construir.`));
process.exit(errores.length ? 1 : 0);
