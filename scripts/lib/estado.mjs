import path from 'node:path';
import { leerJSON, escribirJSON, dirProyecto, existe } from './util.mjs';

export const FASES = ['extraccion', 'direccion_arte', 'control1', 'generacion', 'construccion', 'control2', 'publicacion', 'contacto'];

export const rutaEstado = (slug) => path.join(dirProyecto(slug), 'estado.json');

export function estadoInicial(slug, url = null) {
  return {
    slug, url_origen: url, fase: 'extraccion', creado: new Date().toISOString(),
    higgsfield: { project_id: null, folder_id: null, preset: 'prueba' },
    aprobaciones: { control1: false, control2: false },
    visuales: [],
    coste_total_estimado: 0,
    publicacion: { sitio: null, dominio: null, url: null },
  };
}
export function leerEstado(slug) {
  const f = rutaEstado(slug);
  return existe(f) ? leerJSON(f) : estadoInicial(slug);
}
export function guardarEstado(slug, estado) { escribirJSON(rutaEstado(slug), estado); return estado; }
export function actualizarEstado(slug, fn) { const e = leerEstado(slug); const r = fn(e) ?? e; return guardarEstado(slug, r); }
