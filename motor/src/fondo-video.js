import * as THREE from 'three';
import { clamp, suave } from './utilidades.js';

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`;
const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uVid; uniform float uA, uV, uTinte, uOp, uDesp, uLuz;
uniform vec3 uBg, uC1, uC2, uC3;
varying vec2 vUv;
vec3 vid(vec2 uv, float lod){ return textureLod(uVid, clamp(uv, vec2(.002), vec2(.998)), lod).rgb; }
vec3 duotono(vec3 c){
  float l = dot(c, vec3(.2126,.7152,.0722));
  float t = clamp(l * 2.4, 0., 1.);
  vec3 g = mix(uBg, uC2, smoothstep(0., .45, t));
  g = mix(g, uC1, smoothstep(.3, .8, t));
  return mix(g, uC3, smoothstep(.75, 1., t));
}
void main(){
  vec2 s = vUv; vec3 col;
  if (uA <= uV) {
    // pantalla más estrecha que el vídeo (móvil): cubrir recortando los lados
    col = vid(vec2(.5 + (s.x - .5) * uA / uV, s.y), 0.);
  } else {
    // pantalla apaisada: el túnel entero (desplazado hacia la mitad libre de texto) y, a los lados,
    // la prolongación desenfocada de sus bordes, como luz que se escapa
    float x = (s.x - .5 - uDesp) * uA / uV + .5;
    vec3 fg = vid(vec2(x, s.y), 0.);
    vec3 lado = vid(vec2(clamp(x, 0., 1.), s.y), 5.4) * .55;
    vec3 brillo = vid(vec2(.5, .5 + (s.y - .5) * .5), 6.) * .30;
    vec3 bg = lado + brillo * smoothstep(.0, .6, abs(x - .5));
    float borde = smoothstep(0., .07, x) * (1. - smoothstep(.93, 1., x));
    col = mix(bg, fg, borde);
  }
  col = mix(col, duotono(col), uTinte);
  // «luz al final del túnel»: brota del centro del túnel, acompañándolo; con tope para no lavar la pantalla
  vec2 lc = vec2(.5 + (uA > uV ? uDesp : 0.), .47);
  float d = length((s - lc) * vec2(max(uA, .6), 1.));
  col += uC3 * (exp(-d * d * 10.) * .5 + exp(-d * d * 90.) * 1.2) * uLuz;
  gl_FragColor = vec4(col * uOp, 1.);
}`;

/**
 * Modo «túnel de vídeo»: el clip del usuario hace de túnel y el scroll lo recorre
 * hacia delante y hacia atrás (se frena en cada capítulo igual que el túnel 3D).
 * Plan B si el navegador no puede reproducir el MP4: usa la versión WebM.
 */
export function crearFondoVideo(datos, gestor, reducido) {
  const es = datos.escenario, col = datos.marca.colores;
  const el = document.createElement('video');
  const mp4 = el.canPlayType('video/mp4; codecs="avc1.42E01E"');
  el.src = !mp4 && es.video_tunel_webm ? es.video_tunel_webm : es.video_tunel;
  el.muted = true; el.playsInline = true; el.preload = 'auto'; el.crossOrigin = 'anonymous'; el.loop = false;
  el.setAttribute('muted', ''); el.setAttribute('playsinline', '');
  gestor.itemStart('video-tunel');
  let fin = false; const terminar = () => { if (!fin) { fin = true; gestor.itemEnd('video-tunel'); } };
  el.addEventListener('loadeddata', () => { listo = true; sucio = true; el.currentTime = 0.001; terminar(); }, { once: true });
  el.addEventListener('error', terminar, { once: true });
  setTimeout(terminar, 8000);
  el.load();

  const tex = new THREE.VideoTexture(el);
  tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
  let listo = false, sucio = false, ultimo = -1, opacidad = 0, desp = 0;
  el.addEventListener('seeked', () => { sucio = true; });

  const c = (h) => new THREE.Color(h);
  const uniformes = {
    uVid: { value: tex }, uA: { value: 1 }, uDesp: { value: 0 }, uLuz: { value: 0 }, uV: { value: es.video_aspecto ?? 9 / 16 }, uOp: { value: 0 },
    uTinte: { value: clamp(es.video_tinte ?? 0, 0, 1) },
    uBg: { value: c(col.fondo) }, uC1: { value: c(col.acento) }, uC2: { value: c(col.acento2 ?? col.acento) },
    uC3: { value: c(col.acento).lerp(c('#ffffff'), 0.6) },
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: uniformes, depthTest: false, depthWrite: false });
  const malla = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  malla.frustumCulled = false; malla.renderOrder = -100;

  /** u01: avance 0..1 por el túnel · t: segundos (para la «respiración» en las paradas) */
  function actualizar(u01, t, aspecto, despObjetivo = 0, inmediato = false, luz = 0) {
    uniformes.uLuz.value = luz;
    uniformes.uA.value = aspecto;
    desp = inmediato ? despObjetivo : desp + (despObjetivo - desp) * 0.05;
    uniformes.uDesp.value = desp;
    if (el.videoWidth) uniformes.uV.value = el.videoWidth / el.videoHeight;
    if (!listo) return;
    const dur = Math.max(0.2, (el.duration || es.video_duracion || 10) - 0.08);
    // en las paradas el vídeo no se congela del todo: respira muy despacio
    const resp = reducido ? 0 : Math.sin(t * 0.55) * 0.22 + Math.sin(t * 0.23) * 0.12;
    const objetivo = clamp(u01 * dur + resp, 0, dur);
    if (!el.seeking && Math.abs(objetivo - ultimo) > 1 / 60) { el.currentTime = objetivo; ultimo = objetivo; }
    if (sucio) { tex.needsUpdate = true; sucio = false; }
    opacidad = Math.min(1, opacidad + 0.04);
    uniformes.uOp.value = suave(0, 1, opacidad);
  }
  return { malla, uniformes, actualizar, el, get listo() { return listo; } };
}
