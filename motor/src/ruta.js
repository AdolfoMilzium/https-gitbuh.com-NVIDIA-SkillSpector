import * as THREE from 'three';
import { rng, lerp, suave, clamp } from './utilidades.js';

/**
 * Parámetros por arquetipo: forma del recorrido, radio del túnel,
 * anillos de luz, densidad de partículas y niebla.
 */
export const ARQUETIPOS = {
  neon:           { ampX: 26, ampY: 10, freq: 0.55, radio: 11,   anillos: { sep: 16, grosor: 0.07, k: 2.4 }, particulas: 1.0, niebla: 0.011, celda: 7 },
  organico:       { ampX: 46, ampY: 22, freq: 0.42, radio: 12.5, anillos: { sep: 30, grosor: 0.14, k: 1.0 }, particulas: 1.4, niebla: 0.013, celda: 9 },
  arquitectonico: { ampX: 10, ampY: 3,  freq: 0.3,  radio: 11,   anillos: { sep: 12, grosor: 0.22, k: 1.2 }, particulas: 0.5, niebla: 0.009, celda: 6 },
  industrial:     { ampX: 20, ampY: 6,  freq: 0.5,  radio: 10.5, anillos: { sep: 14, grosor: 0.18, k: 1.6 }, particulas: 0.7, niebla: 0.012, celda: 6 },
  cosmico:        { ampX: 38, ampY: 34, freq: 0.38, radio: 13,   anillos: { sep: 42, grosor: 0.05, k: 2.0 }, particulas: 2.2, niebla: 0.006, celda: 10 },
};
export const IDX_ARQ = { neon: 0, organico: 1, arquitectonico: 2, industrial: 3, cosmico: 4 };

const SEPARACION_PUNTOS = 36;
const LARGO_POR_CAPITULO = 78;

/**
 * Construye el recorrido (CatmullRomCurve3) y el mapa de scroll:
 * la cámara se frena en cada capítulo (meseta) para que dé tiempo a leer.
 */
export function crearRuta(datos) {
  const arq = ARQUETIPOS[datos.escenario.arquetipo] ?? ARQUETIPOS.neon;
  const azar = rng(datos.escenario.semilla ?? 1);
  const n = datos.capitulos.length;
  const largoObjetivo = LARGO_POR_CAPITULO * n + 140;
  const nPuntos = Math.ceil(largoObjetivo / SEPARACION_PUNTOS) + 1;
  const f = [azar() * 6.28, azar() * 6.28, azar() * 6.28, azar() * 6.28];
  const pts = [];
  for (let i = 0; i < nPuntos; i++) {
    const env = suave(0, 4, i) * (1 - suave(nPuntos - 4, nPuntos - 1, i) * 0.6);
    const x = arq.ampX * (Math.sin(i * arq.freq + f[0]) * 0.7 + Math.sin(i * arq.freq * 2.3 + f[1]) * 0.3) * env;
    const y = arq.ampY * (Math.sin(i * arq.freq * 0.8 + f[2]) * 0.65 + Math.sin(i * arq.freq * 1.9 + f[3]) * 0.35) * env;
    pts.push(new THREE.Vector3(x, y, -i * SEPARACION_PUNTOS));
  }
  const curva = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const largo = curva.getLength();

  // --- posiciones de capítulo (u en la curva) y plan de scroll ---
  const u0 = 0.045, u1 = 0.9, uFinal = 0.962, deriva = 0.0055;
  const uCap = datos.capitulos.map((_, i) => lerp(u0, u1, n === 1 ? 0 : i / (n - 1)));
  const paso = 1 / (n + 0.5);          // reparto del scroll por capítulo
  const meseta = paso * 0.56;           // ancho de la parada de lectura
  const sCap = datos.capitulos.map((_, i) => meseta / 2 + i * paso);
  const ctrl = [];
  for (let i = 0; i < n; i++) {
    const inicio = i === 0 ? 0 : sCap[i] - meseta / 2;
    ctrl.push([inicio, uCap[i] - deriva]);
    if (i < n - 1) ctrl.push([sCap[i] + meseta / 2, uCap[i] + deriva]);
  }
  ctrl.push([1, uFinal]); // el último capítulo se queda leyéndose mientras se acerca la luz

  /** Scroll (0..1) → posición en el túnel (0..1). Lineal a trozos con mesetas. */
  function scrollAU(p) {
    p = clamp(p);
    for (let i = 0; i < ctrl.length - 1; i++) {
      const [a, ua] = ctrl[i], [b, ub] = ctrl[i + 1];
      if (p <= b) return lerp(ua, ub, b === a ? 1 : (p - a) / (b - a));
    }
    return ctrl[ctrl.length - 1][1];
  }

  /** Capítulo "activo" para un scroll dado (con su ventana de lectura). */
  function capituloEn(p) {
    for (let i = 0; i < n; i++) {
      const ini = i === 0 ? -1 : sCap[i] - meseta / 2 - paso * 0.04;
      const fin = i === n - 1 ? 2 : sCap[i] + meseta / 2 + paso * 0.04;
      if (p >= ini && p <= fin) return i;
    }
    return -1;
  }

  const marco = (u) => {
    const pos = curva.getPointAt(clamp(u));
    const tan = curva.getTangentAt(clamp(u)).normalize();
    const arriba = new THREE.Vector3(0, 1, 0);
    const der = new THREE.Vector3().crossVectors(tan, arriba).normalize();
    const sup = new THREE.Vector3().crossVectors(der, tan).normalize();
    return { pos, tan, der, sup };
  };

  return { curva, largo, arq, n, uCap, sCap, paso, meseta, uFinal, scrollAU, capituloEn, marco };
}
