#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'vite';
import { argumentos, resolverSlug, RAIZ, colores as c, rel } from './lib/util.mjs';
import { preparar } from './lib/preparar.mjs';
import { actualizarEstado } from './lib/estado.mjs';

const { pos, flags } = argumentos();
const slug = resolverSlug(pos[0]);
console.log(c.neg(`\nConstruyendo «${slug}»…`));
try {
  const { dirBuild, dir, datos } = await preparar(slug, { urlPublica: flags.url, red: !flags['sin-red'] });
  const dist = path.join(dir, 'dist');
  await build({
    root: dirBuild, base: './', publicDir: path.join(dirBuild, 'public'), configFile: false, logLevel: 'warn',
    build: { outDir: dist, emptyOutDir: true, target: 'es2022', chunkSizeWarningLimit: 2000, assetsInlineLimit: 0, sourcemap: false, assetsDir: 'motor' },
    server: { fs: { allow: [RAIZ] } },
  });
  // informe de peso
  let total = 0; const grandes = [];
  const recorre = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const f = path.join(d, e.name);
    if (e.isDirectory()) return recorre(f);
    const s = fs.statSync(f).size; total += s; if (s > 1.5e6) grandes.push([path.relative(dist, f), s]);
  });
  recorre(dist);
  const mb = (b) => (b / 1048576).toFixed(1) + ' MB';
  console.log(c.ok(`\n  ✔ Web construida en ${rel(dist)}  (${mb(total)} en total)`));
  grandes.forEach(([f, s]) => console.log(c.dim(`    · ${f}  ${mb(s)}`)));
  if (total > 40e6) console.log(c.aviso('  ⚠ Pesa más de 40 MB: puede tardar en cargar con datos móviles. Revisa vídeos y modelos 3D.'));
  if (!fs.existsSync(path.join(dist, '.htaccess'))) console.log(c.aviso('  ⚠ No se copió el .htaccess. Revísalo antes de publicar.'));
  actualizarEstado(slug, (e) => { if (['generacion', 'direccion_arte', 'control1', 'extraccion'].includes(e.fase)) e.fase = 'construccion'; e.ultima_construccion = new Date().toISOString(); });
  console.log(c.dim(`  Siguiente paso: npm run capturas ${slug}  ·  npm run ver ${slug}\n`));
} catch (e) {
  console.error(c.error('\n  ✖ ' + e.message + '\n'));
  process.exit(1);
}
