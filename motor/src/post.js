import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { lerp, luminancia } from './utilidades.js';

const FinalShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uSpeed: { value: 0 }, uBlur: { value: 0 },
    uDir: { value: new THREE.Vector2(0, 0) }, uAspect: { value: 1 }, uGrano: { value: 0.045 }, uVig: { value: 0.55 }, uFx: { value: 1 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime, uSpeed, uBlur, uAspect, uGrano, uVig, uFx; uniform vec2 uDir;
    varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uTime) * 43758.5453); }
    void main(){
      vec2 uv = vUv, c = uv - .5;
      float w = uBlur;
      if (dot(uDir,uDir) > .01) w *= smoothstep(-.12, .5, dot(c, uDir) * 2.); else w *= .55;
      vec3 col;
      if (w > .01) {
        // Desenfoque gaussiano (espiral) solo hacia el lado del texto
        float rad = w * .012; vec3 acc = vec3(0.); float tot = 0.;
        for (int i = 0; i < 16; i++) {
          float fi = float(i), r = sqrt((fi + .5) / 16.), a = fi * 2.39996;
          vec2 o = vec2(cos(a), sin(a)) * r * rad; o.x /= uAspect;
          float wt = exp(-r*r*2.2); acc += texture2D(tDiffuse, uv + o).rgb * wt; tot += wt;
        }
        col = acc / tot;
      } else {
        float ca = uSpeed * .006 * uFx;
        col = vec3(texture2D(tDiffuse, uv + c*ca).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - c*ca).b);
      }
      float v = smoothstep(.95, .25, length(c * vec2(uAspect > 1. ? 1. : uAspect * .9 + .1, 1.)) * 1.25);
      col *= mix(1. - uVig, 1., v);
      col += (h(uv * 1000.) - .5) * uGrano * uFx;
      gl_FragColor = vec4(max(col, 0.), 1.);
    }`,
};

export function crearPost(renderer, escena, camara, datos, opciones) {
  const col = datos.marca.colores;
  const lum = luminancia(col.acento);
  const objetivo = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: opciones.movil ? 0 : 4 });
  const compositor = new EffectComposer(renderer, objetivo);
  compositor.addPass(new RenderPass(escena, camara));
  // Un acento muy luminoso (amarillo, cian) satura el bloom: menos fuerza y umbral más alto.
  const fuerza = lerp(0.85, 0.32, Math.min(1, lum * 1.15)) * (datos.escenario.bloom ?? (datos.escenario.modo === 'video' ? 0.45 : 1));
  const umbral = lerp(0.82, 1.15, Math.min(1, lum * 1.15));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), fuerza, 0.55, umbral);
  compositor.addPass(bloom);
  const final = new ShaderPass(FinalShader);
  compositor.addPass(final);
  compositor.addPass(new OutputPass());
  if (opciones.reducido) { final.uniforms.uFx.value = 0; final.uniforms.uGrano.value = 0.02; }

  // ---- calidad adaptativa: si bajan los fps → menos resolución y, por último, sin bloom ----
  const dprMax = Math.min(window.devicePixelRatio || 1, opciones.movil ? 1.5 : 1.75);
  const niveles = [1, 0.8, 0.62];
  let nivel = 0, acum = 0, cuenta = 0, tiempo = 0, bloomActivo = true;
  function aplicar() {
    const dpr = dprMax * niveles[Math.min(nivel, niveles.length - 1)];
    renderer.setPixelRatio(dpr); compositor.setPixelRatio(dpr);
    compositor.setSize(innerWidth, innerHeight);
    bloom.enabled = bloomActivo;
  }
  function medir(dt) {
    if (opciones.fijarCalidad || document.hidden) return;
    tiempo += dt;
    if (tiempo < 2.5) return;         // calentamiento
    acum += dt; cuenta++;
    if (acum >= 1.6) {
      const fps = cuenta / acum; acum = 0; cuenta = 0;
      if (fps < 42) {
        if (nivel < niveles.length - 1) { nivel++; aplicar(); }
        else if (bloomActivo) { bloomActivo = false; aplicar(); }
      }
    }
  }
  function redimensionar() { final.uniforms.uAspect.value = innerWidth / innerHeight; aplicar(); }
  redimensionar();
  return {
    compositor, bloom, final, medir, redimensionar,
    get nivel() { return nivel; },
  };
}
