#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';
import { argumentos, resolverSlug, RAIZ, dirProyecto, colores as c } from './lib/util.mjs';
import { preparar } from './lib/preparar.mjs';

const { pos, flags } = argumentos();
const slug = resolverSlug(pos[0]);
console.log(c.neg(`\nModo desarrollo de «${slug}»`));
try {
  const { dirBuild, dir } = await preparar(slug, { red: !flags['sin-red'] });
  const servidor = await createServer({
    root: dirBuild, base: './', publicDir: path.join(dirBuild, 'public'), configFile: false, logLevel: 'warn',
    server: { port: Number(flags.puerto) || 5173, open: flags['sin-abrir'] ? false : true, fs: { allow: [RAIZ] }, host: '127.0.0.1' },
  });
  await servidor.listen();
  servidor.printUrls();
  console.log(c.dim('  Edita contenido/web.json o los assets y la página se actualiza sola. Ctrl+C para salir.\n'));
  // Si cambia el contenido, se vuelve a preparar y se recarga
  let t;
  const vigilar = [path.join(dir, 'contenido'), path.join(dir, 'assets')];
  vigilar.forEach((d) => fs.existsSync(d) && fs.watch(d, { recursive: true }, () => {
    clearTimeout(t); t = setTimeout(async () => {
      try { await preparar(slug, { red: false, silencioso: true }); servidor.ws.send({ type: 'full-reload' }); console.log(c.dim('  ↻ recargado')); }
      catch (e) { console.log(c.error('  ✖ ' + e.message)); }
    }, 400);
  }));
} catch (e) { console.error(c.error('\n  ✖ ' + e.message + '\n')); process.exit(1); }
