import path from 'node:path';
import { contraste, hexARgb, existe, slugify } from './util.mjs';
import { existeFuente } from './fuentes.mjs';

export const ARQUETIPOS = ['neon', 'organico', 'arquitectonico', 'industrial', 'cosmico'];
export const TIPOS = ['portada', 'texto', 'lista', 'cifras', 'cita', 'galeria', 'cierre'];
export const POSICIONES = ['izquierda', 'derecha', 'centro'];
const MEDIOS = ['imagen', 'video', 'galeria', 'modelo3d'];

/**
 * Valida contenido/web.json. Devuelve { errores:[], avisos:[] } con mensajes en español.
 * Los errores impiden construir; los avisos se muestran pero no bloquean.
 */
export async function validarWeb(d, { dirAssets, slug, red = true } = {}) {
  const errores = [], avisos = [];
  const E = (m) => errores.push(m), A = (m) => avisos.push(m);
  const dir = (p) => path.join(dirAssets ?? '.', p.replace(/^assets\//, ''));

  if (!d || typeof d !== 'object') { E('web.json está vacío o no es un objeto JSON.'); return { errores, avisos }; }

  // --- empresa ---
  const emp = d.empresa ?? {};
  if (!emp.nombre?.trim()) E('Falta «empresa.nombre».');
  if (slug && emp.slug && emp.slug !== slug) A(`«empresa.slug» ("${emp.slug}") no coincide con la carpeta del proyecto ("${slug}").`);
  if (emp.slug && emp.slug !== slugify(emp.slug)) E(`«empresa.slug» debe ir en minúsculas, sin espacios ni tildes (por ejemplo "${slugify(emp.slug)}").`);

  // --- marca ---
  const col = d.marca?.colores ?? {};
  for (const k of ['fondo', 'texto', 'acento']) if (!col[k]) E(`Falta el color «marca.colores.${k}».`);
  for (const [k, v] of Object.entries(col)) if (v && !hexARgb(v)) E(`El color «marca.colores.${k}» ("${v}") no es válido. Usa el formato #rrggbb.`);
  if (hexARgb(col.fondo) && hexARgb(col.texto)) {
    const c = contraste(col.texto, col.fondo);
    if (c < 4.5) E(`Contraste insuficiente entre el texto y el fondo (${c.toFixed(2)}:1; mínimo WCAG AA 4.5:1). Cambia «marca.colores.texto» o «fondo».`);
  }
  if (hexARgb(col.fondo) && hexARgb(col.acento)) {
    const c = contraste(col.acento, col.fondo);
    if (c < 3) E(`El color de acento apenas se distingue del fondo (${c.toFixed(2)}:1; mínimo 3:1). Elige un acento más claro u oscuro.`);
    else if (c < 4.5) A(`El acento tiene un contraste de ${c.toFixed(2)}:1 con el fondo. Para textos pequeños el kit lo corrige solo, pero conviene revisarlo.`);
  }
  const tip = d.marca?.tipografias ?? {};
  for (const k of ['titulo', 'cuerpo']) {
    const f = tip[k];
    if (!f) { E(`Falta la tipografía «marca.tipografias.${k}».`); continue; }
    if (!red) continue;
    const ok = await existeFuente(f);
    if (ok === false) E(`La fuente «${f}» no existe en Google Fonts. Elige otra (por ejemplo Montserrat, Inter, Poppins, Playfair Display).`);
    else if (ok === null) A(`No se pudo comprobar la fuente «${f}» (sin conexión y no está en la lista del kit). Revísala a mano en fonts.google.com.`);
  }

  // --- escenario ---
  const es = d.escenario ?? {};
  if (es.modo !== undefined && !['3d', 'video'].includes(es.modo)) E('«escenario.modo» debe ser "3d" (túnel en tiempo real) o "video" (túnel basado en un clip).');
  if (es.modo === 'video') {
    if (!es.video_tunel) E('Con «escenario.modo» = "video" hace falta «escenario.video_tunel» (por ejemplo "assets/tunel.mp4"). Prepáralo con: npm run video -- <proyecto> <clip>.');
    else if (!es.video_tunel.startsWith('assets/')) E('«escenario.video_tunel» debe empezar por «assets/».');
    if (es.video_tinte !== undefined && !(es.video_tinte >= 0 && es.video_tinte <= 1)) E('«escenario.video_tinte» debe estar entre 0 (colores originales del clip) y 1 (colores de la marca).');
  }
  if (es.modo === 'video') {
    const conMedios = (d.capitulos ?? []).filter((c) => c.imagen || c.video || c.modelo3d || c.galeria?.some((g) => g.imagen) || c.tipo === 'galeria');
    if (conMedios.length) A(`En modo vídeo el clip es el visual: no se muestran los paneles de imagen, vídeo, galería ni el objeto 3D (capítulos: ${conMedios.map((c) => c.id).join(', ')}). Se quedan solo en el HTML sin JavaScript.`);
  }
  if (!ARQUETIPOS.includes(es.arquetipo)) E(`«escenario.arquetipo» debe ser uno de: ${ARQUETIPOS.join(', ')}.`);
  if (!Number.isInteger(es.semilla)) E('«escenario.semilla» debe ser un número entero (cambia el recorrido del túnel).');
  if (!es.metafora) A('Falta «escenario.metafora» (la idea visual del túnel). Ayuda a mantener coherencia en las imágenes.');

  // --- capítulos ---
  const caps = Array.isArray(d.capitulos) ? d.capitulos : [];
  if (caps.length < 3) E(`Hacen falta al menos 3 capítulos (hay ${caps.length}).`);
  if (caps.length > 12) E(`Demasiados capítulos (${caps.length}). El máximo es 12.`);
  else if (caps.length && (caps.length < 6 || caps.length > 8)) A(`Lo recomendable son 6–8 capítulos (hay ${caps.length}).`);
  const ids = new Set();
  caps.forEach((c, i) => {
    const n = `Capítulo ${i + 1}${c.id ? ` («${c.id}»)` : ''}`;
    if (!c.id || c.id !== slugify(c.id)) E(`${n}: «id» obligatorio, en minúsculas y sin espacios ni tildes.`);
    else if (ids.has(c.id)) E(`${n}: el id está repetido.`);
    ids.add(c.id);
    if (!TIPOS.includes(c.tipo)) E(`${n}: «tipo» debe ser uno de: ${TIPOS.join(', ')}.`);
    if (!POSICIONES.includes(c.posicion)) E(`${n}: «posicion» debe ser izquierda, derecha o centro.`);
    if (!c.titulo?.trim()) E(`${n}: falta el título.`);
    if (c.titulo && c.titulo.length > 90) A(`${n}: el título es muy largo (${c.titulo.length} caracteres). Mejor menos de 90.`);
    if (c.texto && c.texto.length > 340) A(`${n}: el texto es largo (${c.texto.length} caracteres). Mejor menos de 340 para que dé tiempo a leerlo.`);
    if (c.tipo === 'portada' && i !== 0) E(`${n}: la portada debe ser el primer capítulo.`);
    if (i === 0 && c.tipo !== 'portada') E('El primer capítulo debe ser de tipo «portada».');
    if (c.tipo === 'cierre' && i !== caps.length - 1) E(`${n}: el cierre debe ser el último capítulo.`);
    if (i === caps.length - 1 && c.tipo !== 'cierre') E('El último capítulo debe ser de tipo «cierre» (la luz al final del túnel).');
    if (c.tipo === 'lista' && !(c.items?.length >= 2)) E(`${n}: una lista necesita al menos 2 elementos en «items».`);
    (c.items ?? []).forEach((it, k) => { if (!it.titulo) E(`${n}: el elemento ${k + 1} de «items» no tiene título.`); });
    if (c.tipo === 'cifras') {
      if (!(c.cifras?.length >= 1)) E(`${n}: faltan las «cifras».`);
      (c.cifras ?? []).forEach((x, k) => {
        if (typeof x.valor !== 'number') E(`${n}: la cifra ${k + 1} debe tener «valor» numérico.`);
        if (!x.etiqueta) E(`${n}: la cifra ${k + 1} no tiene «etiqueta».`);
        if (!x.origen) E(`${n}: la cifra ${k + 1} no indica su «origen». Las cifras solo se pueden usar si salen de la web de la empresa; no se inventan.`);
      });
    }
    if (c.tipo === 'cita') {
      if (!c.cita?.texto) E(`${n}: falta «cita.texto».`);
      if (!c.cita?.origen) E(`${n}: la cita no indica su «origen». Las citas solo se pueden usar si existen en la web de la empresa.`);
    }
    if (c.tipo === 'galeria' && !(c.galeria?.length >= 2)) E(`${n}: la galería necesita al menos 2 elementos en «galeria».`);
    if (c.tipo === 'cierre' && !c.boton && !d.empresa?.contacto?.email && !d.empresa?.contacto?.telefono) A(`${n}: el cierre no tiene botón ni datos de contacto de la empresa.`);
    if (c.posicion === 'centro' && c.tipo === 'lista' && (c.items?.length ?? 0) > 4) A(`${n}: una lista centrada con más de 4 elementos puede quedar apretada; usa posición izquierda o derecha.`);
    // recursos
    const recursos = [];
    if (c.imagen) recursos.push(c.imagen);
    if (c.video) recursos.push(c.video);
    if (c.modelo3d?.archivo) recursos.push(c.modelo3d.archivo);
    (c.galeria ?? []).forEach((g) => g.imagen && recursos.push(g.imagen));
    recursos.forEach((r) => { if (!r.startsWith('assets/')) E(`${n}: la ruta «${r}» debe empezar por «assets/».`); });
    (c.galeria ?? []).forEach((g, k) => { if (g.imagen && !g.alt) A(`${n}: la imagen ${k + 1} de la galería no tiene texto alternativo («alt»).`); });
    if (c.imagen && !c.alt) A(`${n}: la imagen no tiene texto alternativo («alt»).`);
  });

  // --- recursos que faltan → vista previa ---
  if (dirAssets) {
    const faltan = [];
    const mira = (p) => { if (p && !existe(dir(p))) faltan.push(p); };
    mira(es.textura); mira(d.meta?.imagen_social); if (es.modo === 'video') { mira(es.video_tunel); } mira(d.marca?.logo?.archivo);
    caps.forEach((c) => { mira(c.imagen); mira(c.video); mira(c.modelo3d?.archivo); (c.galeria ?? []).forEach((g) => mira(g.imagen)); });
    if (faltan.length) A(`Faltan ${faltan.length} recurso(s) visual(es) del proveedor de IA (${faltan.slice(0, 4).join(', ')}${faltan.length > 4 ? '…' : ''}). La web se construirá como VISTA PREVIA SIN IMÁGENES.`);
  }

  // --- meta ---
  if (!d.meta?.titulo) A('Falta «meta.titulo» (título de la pestaña y del enlace compartido).');
  if (!d.meta?.descripcion) A('Falta «meta.descripcion».');
  else if (d.meta.descripcion.length > 170) A('«meta.descripcion» supera los 170 caracteres.');
  return { errores, avisos };
}
