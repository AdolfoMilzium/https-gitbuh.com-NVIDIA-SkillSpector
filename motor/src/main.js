import './estilos.css';
import { gsap } from 'gsap';
import Lenis from 'lenis';
import { crearMundo } from './escena.js';
import { crearUI } from './ui.js';
import { clamp } from './utilidades.js';

const datos = JSON.parse(document.getElementById('datos').textContent);
const params = new URLSearchParams(location.search);
const captura = params.has('captura');
const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
const raiz = document.documentElement;
raiz.classList.add('js');

function sinWebGL() {
  raiz.classList.remove('js'); raiz.classList.add('sin-webgl');
  document.getElementById('carga')?.remove();
}

async function arrancar() {
  const canvas = document.getElementById('escena');
  const carga = document.getElementById('carga');
  const cargaTxt = carga?.querySelector('.carga__pct');
  let mundo;
  try {
    mundo = await crearMundo(datos, { canvas, reducido, captura, onProgreso: (f) => { if (cargaTxt) cargaTxt.textContent = Math.round(f * 100) + ' %'; } });
  } catch (err) {
    console.warn('[web inmersiva] WebGL no disponible, se muestra la versión de texto.', err);
    return sinWebGL();
  }
  await Promise.race([mundo.listo, new Promise((r) => setTimeout(r, 7000))]);
  await document.fonts?.ready;

  const n = datos.capitulos.length;
  const alto = 175 * n + 100; // vh de scroll
  document.getElementById('espacio').style.height = alto + 'vh';

  const lenis = new Lenis({ lerp: reducido ? 1 : 0.085, smoothWheel: !reducido, wheelMultiplier: 0.9, autoRaf: false });
  const limite = () => Math.max(1, lenis.limit || document.documentElement.scrollHeight - innerHeight);
  const irAPixel = (px, inmediato = false) => lenis.scrollTo(px, { immediate: inmediato, duration: 2.2, force: true });
  const irACapitulo = (i) => irAPixel((mundo.ruta.sCap[i]) * limite());
  const ui = crearUI(datos, mundo.ruta, { reducido, irA: irACapitulo });

  let p = 0, cap = -1, forzado = null;
  const textoDe = (i) => {
    if (i < 0) return null;
    const pos = datos.capitulos[i].posicion;
    const vertical = mundo.camara.aspect < 0.9;
    return { lado: pos === 'izquierda' ? -1 : pos === 'derecha' ? 1 : 0, vertical };
  };

  // ÚNICO bucle de animación: Lenis + GSAP + render, todo dentro del ticker de GSAP
  gsap.ticker.lagSmoothing(0);
  gsap.ticker.add((tiempo, dtMs) => {
    lenis.raf(tiempo * 1000);
    if (forzado === null) p = clamp(lenis.scroll / limite());
    const dt = Math.max(dtMs, 1) / 1000;
    cap = forzado ?? mundo.ruta.capituloEn(p);
    ui.actualizar(p, cap);
    mundo.actualizar(dt, p, cap, textoDe(cap), forzado !== null);
  });

  carga?.classList.add('lista'); setTimeout(() => carga?.remove(), 900);
  raiz.classList.add('lista');

  // Gancho para las capturas automáticas y las pruebas (no afecta al uso normal)
  window.__kit = {
    n, capitulos: datos.capitulos.map((c) => c.id),
    sCap: mundo.ruta.sCap, ready: true,
    irA(prog, indice) { forzado = null; p = prog; forzado = indice ?? mundo.ruta.capituloEn(prog); ui.forzar(forzado); },
    liberar() { forzado = null; },
    info() { return { p, cap, u: mundo.estado.u, nivelCalidad: mundo.post.nivel }; },
  };
  if (captura) { lenis.stop(); window.__kit.mundo = mundo; }
}
arrancar();
