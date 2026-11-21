import fs from 'node:fs';
import path from 'node:path';
import { RAIZ, dirProyecto, leerJSON, marca, existe, colores as c } from './util.mjs';
import { validarWeb } from './validar.mjs';
import { normalizarRecursos, generarHtml } from './html.mjs';
import { alojarFuente, enlaceGoogle } from './fuentes.mjs';

export const HTACCESS = `# Generado por el kit de webs inmersivas. Hosting compartido (Apache / LiteSpeed).
Options -Indexes
DirectoryIndex index.html

<IfModule mod_mime.c>
  AddType model/gltf-binary .glb
  AddType video/mp4 .mp4
  AddType image/webp .webp
  AddType font/woff2 .woff2
  AddType text/javascript .js .mjs
  AddType text/css .css
  AddType application/json .json
  AddType image/svg+xml .svg
</IfModule>

<IfModule mod_headers.c>
  Header set X-Robots-Tag "noindex, nofollow, noarchive"
  Header set X-Content-Type-Options "nosniff"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
  <FilesMatch "\\.(js|css|webp|jpg|jpeg|png|svg|glb|mp4|woff2)$">
    Header set Cache-Control "public, max-age=2592000"
  </FilesMatch>
  <FilesMatch "\\.(html|json)$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
</IfModule>

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/webp "access plus 1 month"
  ExpiresByType image/jpeg "access plus 1 month"
  ExpiresByType model/gltf-binary "access plus 1 month"
  ExpiresByType video/mp4 "access plus 1 month"
  ExpiresByType font/woff2 "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType text/javascript "access plus 1 month"
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript application/json image/svg+xml
</IfModule>
`;

function copiarDir(origen, destino, filtro = () => true) {
  if (!existe(origen)) return;
  fs.cpSync(origen, destino, { recursive: true, filter: (s) => filtro(path.relative(origen, s)) });
}

/**
 * Valida, normaliza y deja lista la carpeta proyectos/<slug>/.build (index.html + src + public).
 * Devuelve { dirBuild, datos, avisos }.
 */
export async function preparar(slug, { urlPublica, red = true, silencioso = false } = {}) {
  const dir = dirProyecto(slug);
  const rutaWeb = path.join(dir, 'contenido/web.json');
  if (!existe(rutaWeb)) throw new Error(`No existe proyectos/${slug}/contenido/web.json. Crea la web con /crear-web o prueba con «demo».`);
  const web = leerJSON(rutaWeb);
  const { errores, avisos } = await validarWeb(web, { dirAssets: path.join(dir, 'assets'), slug, red });
  if (!silencioso) avisos.forEach((m) => console.log(c.aviso('  ⚠ ' + m)));
  if (errores.length) {
    errores.forEach((m) => console.log(c.error('  ✖ ' + m)));
    throw new Error(`web.json tiene ${errores.length} error(es). Corrígelos y vuelve a intentarlo.`);
  }
  const datos = normalizarRecursos(web, (p) => existe(path.join(dir, 'assets', p.replace(/^assets\//, ''))));
  const cfg = marca();
  const dirBuild = path.join(dir, '.build');
  fs.rmSync(dirBuild, { recursive: true, force: true });
  fs.mkdirSync(path.join(dirBuild, 'public'), { recursive: true });
  copiarDir(path.join(RAIZ, 'motor/src'), path.join(dirBuild, 'src'));
  copiarDir(path.join(dir, 'assets'), path.join(dirBuild, 'public/assets'), (r) => !r.startsWith('fuentes') && !r.endsWith('.psd'));
  fs.writeFileSync(path.join(dirBuild, 'public/.htaccess'), HTACCESS);
  fs.writeFileSync(path.join(dirBuild, 'public/robots.txt'), 'User-agent: *\nDisallow: /\n');

  // Fuentes alojadas en la propia web (sin enviar datos a Google); si no hay red, plan B con el enlace de Google Fonts
  const cache = path.join(dir, '.fuentes');
  const familias = [...new Set([datos.marca.tipografias.titulo, datos.marca.tipografias.cuerpo])];
  let css = '', fallo = false;
  for (const f of familias) {
    const fcss = path.join(cache, f.replace(/\s+/g, '-').toLowerCase() + '.css');
    if (!existe(fcss)) {
      const r = await alojarFuente(f, path.join(cache, 'fonts'));
      if (!r) { fallo = true; continue; }
      fs.mkdirSync(cache, { recursive: true }); fs.writeFileSync(fcss, r.css);
    }
    css += fs.readFileSync(fcss, 'utf8').replace(/url\(\.?\/?fonts\//g, 'url(/fonts/') + '\n';
  }
  if (!fallo && css.trim()) copiarDir(path.join(cache, 'fonts'), path.join(dirBuild, 'public/fonts'));
  else if (!silencioso && fallo) console.log(c.aviso('  ⚠ No se pudieron descargar las fuentes; se usará el enlace de Google Fonts como plan B.'));
  const html = generarHtml(datos, { marca: cfg, fuentesCss: fallo ? '' : css, enlaceFuentes: fallo ? enlaceGoogle(familias) : '', urlPublica: urlPublica ?? datos.meta?.url_publica });
  fs.writeFileSync(path.join(dirBuild, 'index.html'), html);
  return { dirBuild, datos, avisos, dir };
}
