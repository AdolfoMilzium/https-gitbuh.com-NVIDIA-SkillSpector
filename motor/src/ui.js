import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';

gsap.registerPlugin(SplitText, ScrambleTextPlugin);

const fmt = new Intl.NumberFormat('es-ES', { useGrouping: 'always', maximumFractionDigits: 0 });

/**
 * Texto de cada capítulo: entra y sale con GSAP (SplitText + ScrambleText).
 * Ninguna animación deja `clip-path` puesto (cortaría las cifras grandes).
 */
export function crearUI(datos, ruta, { reducido, irA }) {
  const secciones = [...document.querySelectorAll('.capitulo')];
  const enlaces = [...document.querySelectorAll('.puntos a')];
  const barra = document.querySelector('.progreso__barra');
  const pista = document.querySelector('.pista');
  const timelines = [];
  let activo = -1;

  secciones.forEach((sec, i) => {
    const pos = sec.dataset.pos;
    const dir = pos === 'derecha' ? 1 : pos === 'izquierda' ? -1 : 0;
    const caja = sec.querySelector('.capitulo__caja');
    const et = sec.querySelector('.capitulo__etiqueta');
    const titulo = sec.querySelector('.capitulo__titulo');
    const texto = sec.querySelector('.capitulo__texto');
    const resto = sec.querySelectorAll('.capitulo__lista li, .capitulo__cifras > div, .capitulo__cita, .capitulo__contacto > *, .boton');
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
    const d = reducido ? 0.01 : 1;

    tl.fromTo(caja, { opacity: 0 }, { opacity: 1, duration: 0.3 * d }, 0);
    if (et) {
      const original = et.textContent;
      tl.fromTo(et, { opacity: 0, x: dir * -24 * d }, { opacity: 1, x: 0, duration: 0.55 * d }, 0.05);
      if (!reducido) tl.to(et, { duration: 0.9, scrambleText: { text: original, chars: 'XO#/+*', speed: 0.7, revealDelay: 0.1 } }, 0.05);
    }
    if (titulo) {
      const split = SplitText.create(titulo, { type: 'words', wordsClass: 'palabra' });
      tl.fromTo(split.words, { opacity: 0, y: 46 * d, rotationX: -55 * d, filter: reducido ? 'none' : 'blur(10px)', transformPerspective: 700 },
        { opacity: 1, y: 0, rotationX: 0, filter: 'blur(0px)', duration: 0.85 * d, stagger: 0.06 * d, clearProps: 'filter,clipPath' }, 0.12);
    }
    if (texto) {
      const split = SplitText.create(texto, { type: 'words', wordsClass: 'palabra' });
      tl.fromTo(split.words, { opacity: 0, y: 14 * d }, { opacity: 1, y: 0, duration: 0.5 * d, stagger: Math.min(0.014, 0.6 / Math.max(split.words.length, 1)) * d, clearProps: 'clipPath' }, 0.35);
    }
    if (resto.length) tl.fromTo(resto, { opacity: 0, y: 26 * d }, { opacity: 1, y: 0, duration: 0.6 * d, stagger: 0.09 * d, clearProps: 'clipPath' }, 0.5);
    sec.querySelectorAll('[data-valor]').forEach((dd) => {
      const meta = Number(dd.dataset.valor), suf = dd.dataset.sufijo ?? '', pre = dd.dataset.prefijo ?? '';
      const o = { v: 0 };
      dd.textContent = pre + fmt.format(0) + suf;
      tl.to(o, { v: meta, duration: reducido ? 0.01 : 1.8, ease: 'power2.out', onUpdate: () => { dd.textContent = pre + fmt.format(o.v) + suf; } }, 0.45);
    });
    tl.eventCallback('onReverseComplete', () => { sec.classList.remove('activo'); });
    tl.progress(0);
    timelines.push(tl);
  });

  enlaces.forEach((a, i) => a.addEventListener('click', (ev) => { ev.preventDefault(); irA(i); }));

  function mostrar(i) {
    if (i === activo) return;
    if (activo >= 0) { timelines[activo].timeScale(2.4).reverse(); }
    activo = i;
    enlaces.forEach((a, k) => a.classList.toggle('activo', k === i));
    document.body.dataset.capitulo = i;
    if (i >= 0) {
      secciones[i].classList.add('activo');
      timelines[i].timeScale(1).play();
      if (pista && i > 0) pista.classList.add('oculta');
    }
  }
  function actualizar(p, cap) {
    mostrar(cap);
    if (barra) barra.style.transform = `scaleX(${p})`;
  }
  /** Fuerza el estado sin animación (para las capturas automáticas). */
  function forzar(cap) {
    mostrar(cap);
    if (cap >= 0) timelines[cap].progress(1);
    timelines.forEach((tl, k) => { if (k !== cap) { tl.progress(0); secciones[k].classList.remove('activo'); } });
  }
  return { actualizar, forzar, get activo() { return activo; } };
}
