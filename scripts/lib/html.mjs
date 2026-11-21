import { esc, fmtMiles, ajustarContraste, textoSobre, luminanciaRelativa } from './util.mjs';

const numero = (i, n) => `${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;

function seccion(c, i, n, d) {
  const h = c.tipo === 'portada' ? 'h1' : 'h2';
  const et = c.etiqueta ? `${numero(i, n)} · ${c.etiqueta}` : numero(i, n);
  const partes = [`<p class="capitulo__etiqueta">${esc(et)}</p>`, `<${h} class="capitulo__titulo">${esc(c.titulo)}</${h}>`];
  if (c.texto) partes.push(`<p class="capitulo__texto">${esc(c.texto)}</p>`);
  if (c.items?.length) partes.push(`<ul class="capitulo__lista">${c.items.map((it) => `<li><strong>${esc(it.titulo)}</strong>${it.texto ? `<span>${esc(it.texto)}</span>` : ''}</li>`).join('')}</ul>`);
  if (c.cifras?.length) partes.push(`<dl class="capitulo__cifras">${c.cifras.map((x) => `<div><dt>${esc(x.etiqueta)}</dt><dd data-valor="${x.valor}"${x.sufijo ? ` data-sufijo="${esc(x.sufijo)}"` : ''}${x.prefijo ? ` data-prefijo="${esc(x.prefijo)}"` : ''}>${esc((x.prefijo ?? '') + fmtMiles(x.valor) + (x.sufijo ?? ''))}</dd></div>`).join('')}</dl>`);
  if (c.cita) partes.push(`<blockquote class="capitulo__cita"><p>${esc(c.cita.texto)}</p>${c.cita.autor ? `<footer>— ${esc(c.cita.autor)}</footer>` : ''}</blockquote>`);
  if (c.tipo === 'cierre') {
    const k = d.empresa.contacto ?? {};
    const filas = [];
    if (k.telefono) filas.push(`<li><a href="tel:${esc(k.telefono.replace(/[^+\d]/g, ''))}">${esc(k.telefono)}</a></li>`);
    if (k.email) filas.push(`<li><a href="mailto:${esc(k.email)}">${esc(k.email)}</a></li>`);
    if (k.direccion) filas.push(`<li>${esc(k.direccion)}</li>`);
    if (filas.length) partes.push(`<ul class="capitulo__contacto">${filas.join('')}</ul>`);
  }
  if (c.boton?.texto) partes.push(`<a class="boton" href="${esc(c.boton.enlace || d.empresa.url_origen || '#')}"${/^https?:/.test(c.boton.enlace || '') ? ' rel="noopener" target="_blank"' : ''}>${esc(c.boton.texto)}</a>`);
  // Recursos visibles solo sin JavaScript (con JS los pinta el escenario 3D)
  const medios = [];
  if (c.imagen) medios.push(`<img src="${esc(c.imagen)}" alt="${esc(c.alt ?? '')}" loading="lazy" decoding="async">`);
  (c.galeria ?? []).forEach((g) => g.imagen && medios.push(`<img src="${esc(g.imagen)}" alt="${esc(g.alt ?? '')}" loading="lazy" decoding="async">`));
  if (medios.length) partes.push(`<div class="capitulo__medios">${medios.join('')}</div>`);
  return `<section class="capitulo" id="cap-${esc(c.id)}" data-indice="${i}" data-tipo="${esc(c.tipo)}" data-pos="${esc(c.posicion)}" aria-labelledby="t-${esc(c.id)}">\n  <div class="capitulo__caja">\n    ${partes.join('\n    ').replace('class="capitulo__titulo"', `class="capitulo__titulo" id="t-${esc(c.id)}"`)}\n  </div>\n</section>`;
}

/** Quita del contenido los recursos que no existen (el motor no pedirá archivos inexistentes). */
export function normalizarRecursos(d, existeAsset) {
  const x = JSON.parse(JSON.stringify(d));
  let faltan = 0;
  const ok = (p) => { if (!p) return false; if (existeAsset(p)) return true; faltan++; return false; };
  if (x.escenario.textura && !ok(x.escenario.textura)) delete x.escenario.textura;
  if (x.meta?.imagen_social && !ok(x.meta.imagen_social)) delete x.meta.imagen_social;
  if (x.marca.logo) { for (const k of ['archivo', 'claro']) if (x.marca.logo[k] && !ok(x.marca.logo[k])) delete x.marca.logo[k]; }
  for (const c of x.capitulos) {
    if (c.imagen && !ok(c.imagen)) delete c.imagen;
    if (c.video && !ok(c.video)) delete c.video;
    if (c.modelo3d?.archivo && !ok(c.modelo3d.archivo)) delete c.modelo3d;
    if (c.galeria) { c.galeria = c.galeria.filter((g) => ok(g.imagen) || !g.imagen).map((g) => (g.imagen ? g : { ...g })); }
  }
  const hayImagenes = !!x.escenario.textura || x.capitulos.some((c) => c.imagen || c.video || c.galeria?.some((g) => g.imagen));
  x.escenario.vista_previa = faltan > 0 || !hayImagenes || !!x.escenario.vista_previa_forzada;
  if (x.escenario.vista_previa && x.capitulos[0]?.tipo === 'portada' && !x.capitulos[0].modelo3d) x.escenario.modelo3d_demo = true;
  return x;
}

export function generarHtml(d, { marca, fuentesCss, enlaceFuentes, urlPublica }) {
  const n = d.capitulos.length;
  const col = d.marca.colores;
  const acentoTexto = ajustarContraste(col.acento, col.fondo, 4.5);
  const vars = [
    `--fondo:${col.fondo}`, `--texto:${col.texto}`, `--acento:${col.acento}`, `--acento2:${col.acento2 ?? col.acento}`,
    `--acento-texto:${acentoTexto}`, `--texto-boton:${textoSobre(col.acento)}`,
    `--fuente-titulo:'${d.marca.tipografias.titulo}', ui-sans-serif, system-ui, sans-serif`,
    `--fuente-cuerpo:'${d.marca.tipografias.cuerpo}', ui-sans-serif, system-ui, sans-serif`,
  ].join(';');
  const meta = d.meta ?? {};
  const titulo = meta.titulo || `${d.empresa.nombre} · Experiencia inmersiva`;
  const desc = meta.descripcion || d.capitulos[0]?.texto || '';
  const abs = (p) => (urlPublica ? new URL(p, urlPublica.endsWith('/') ? urlPublica : urlPublica + '/').href : p);
  const logo = d.marca.logo ?? {};
  const oscuro = luminanciaRelativa(col.fondo) < 0.4;
  const logoSrc = oscuro ? logo.claro || logo.archivo : logo.archivo || logo.claro;
  const creador = marca.creador?.nombre?.trim();
  const credito = creador ? marca.textos.credito.replace('{creador}', creador) : '';
  const partesAviso = [`<span class="aviso__concepto">${esc(marca.textos.aviso_concepto)}</span>`];
  if (d.escenario.vista_previa) partesAviso.push(`<span class="aviso__vp">${esc(marca.textos.aviso_vista_previa)}</span>`);
  if (credito) {
    const w = marca.creador.web, e = marca.creador.email;
    const enlace = w ? `<a href="${esc(w)}" rel="noopener">${esc(credito)}</a>` : e ? `<a href="mailto:${esc(e)}">${esc(credito)}</a>` : esc(credito);
    partesAviso.push(`<span class="aviso__credito">${enlace}</span>`);
  }
  const jsonld = { '@context': 'https://schema.org', '@type': 'Organization', name: d.empresa.nombre };
  const k = d.empresa.contacto ?? {};
  if (d.empresa.url_origen) jsonld.url = d.empresa.url_origen;
  if (k.telefono) jsonld.telephone = k.telefono;
  if (k.email) jsonld.email = k.email;
  if (k.direccion) jsonld.address = k.direccion;
  if (desc) jsonld.description = desc;
  const datosJson = JSON.stringify(d).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="${esc(d.empresa.idioma ?? 'es')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="noindex, nofollow, noarchive">
<link rel="icon" href="data:,">
<meta name="theme-color" content="${esc(col.fondo)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:locale" content="es_ES">
${meta.imagen_social ? `<meta property="og:image" content="${esc(abs(meta.imagen_social))}">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:image" content="${esc(abs(meta.imagen_social))}">` : ''}
${urlPublica ? `<meta property="og:url" content="${esc(urlPublica)}">` : ''}
${enlaceFuentes ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${esc(enlaceFuentes)}">` : ''}
<style id="marca">:root{${vars}}\n${fuentesCss ?? ''}</style>
<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>
</head>
<body>
<canvas id="escena" aria-hidden="true"></canvas>
<div id="espacio" aria-hidden="true"></div>
<header class="cabecera">
  <a href="#cap-${esc(d.capitulos[0].id)}" aria-label="${esc(d.empresa.nombre)}">${logoSrc ? `<img src="${esc(logoSrc)}" alt="${esc(d.empresa.nombre)}">` : `<span class="cabecera__nombre">${esc(d.empresa.nombre)}</span>`}</a>
</header>
<main id="web">
${d.capitulos.map((c, i) => seccion(c, i, n, d)).join('\n')}
</main>
<nav class="puntos" aria-label="Capítulos"><ul>
${d.capitulos.map((c) => `  <li><a href="#cap-${esc(c.id)}" aria-label="${esc(c.etiqueta || c.titulo)}"><span class="rotulo">${esc(c.etiqueta || c.titulo)}</span><span class="punto"></span></a></li>`).join('\n')}
</ul></nav>
<div class="progreso" aria-hidden="true"><div class="progreso__barra"></div></div>
<div class="pista" aria-hidden="true">Desliza para entrar</div>
<footer class="aviso" role="note">${partesAviso.join('')}</footer>
<div id="carga" role="status"><div class="carga__caja"><span class="carga__nombre">${esc(d.empresa.nombre)}</span><span class="carga__barra"></span><span class="carga__pct">0 %</span></div></div>
<noscript><style>#carga{display:none!important}</style></noscript>
<script id="datos" type="application/json">${datosJson}</script>
<script type="module" src="./src/main.js"></script>
</body>
</html>
`;
}
