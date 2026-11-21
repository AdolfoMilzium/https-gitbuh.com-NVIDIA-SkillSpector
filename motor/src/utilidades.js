import * as THREE from 'three';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const suave = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
/** Amortiguación independiente de los fps. */
export const amortiguar = (actual, objetivo, vel, dt) => lerp(actual, objetivo, 1 - Math.exp(-vel * dt));

/** Generador pseudoaleatorio con semilla (mulberry32): misma semilla, misma web. */
export function rng(semilla) {
  let a = (semilla >>> 0) || 1;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function luminancia(hex) {
  const c = new THREE.Color(hex); // ya en lineal
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

/** Color de marca con un multiplicador (>1 para que brille con el bloom). */
export function brillo(hex, k = 1) {
  return new THREE.Color(hex).multiplyScalar(k);
}

export const esMovil = () => window.matchMedia('(max-width: 760px), (max-aspect-ratio: 4/5)').matches;
