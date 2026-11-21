import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { rng, suave, clamp, amortiguar } from './utilidades.js';

const FOV = 58;
const DIST = 11; // distancia de lectura (unidades) a la que se colocan los paneles respecto a la cámara en cada parada

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`;
const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uMap; uniform float uHas, uTime, uOp, uSeed;
uniform vec3 uA, uB, uBg;
varying vec2 vUv;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
void main(){
  vec2 uv = vUv; vec3 c;
  if (uHas > .5) {
    c = texture2D(uMap, uv).rgb;
  } else {
    // Vista previa: cristal con rejilla y barrido de luz (aquí irá la imagen de Higgsfield)
    float n = vn(uv*vec2(4.,2.5) + uTime*.12 + uSeed) * .6 + vn(uv*9. - uTime*.07) * .4;
    c = mix(uBg*.9 + uB*.12, uA*.5, n*.75);
    vec2 g = abs(fract(uv*vec2(16.,9.)) - .5);
    c += uA * .16 * smoothstep(.47, .5, max(g.x, g.y));
    c += uA * .55 * pow(max(0., sin((uv.x*1.2 + uv.y) * 5. - uTime*1.1 + uSeed)), 24.);
  }
  vec2 e = min(uv, 1. - uv);
  float borde = min(e.x * 16., e.y * 9.);          // en "unidades de celda", 16:9
  float marco = smoothstep(.09, .02, borde);
  float vineta = mix(.72, 1., smoothstep(0., .55, borde));
  c *= vineta;
  c = mix(c, uA * 2.0 + .15, marco);
  gl_FragColor = vec4(c, uOp);
}`;

function materialPanel(datos, semilla) {
  const col = datos.marca.colores;
  return new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
    uniforms: {
      uMap: { value: null }, uHas: { value: 0 }, uTime: { value: 0 }, uOp: { value: 0 }, uSeed: { value: semilla },
      uA: { value: new THREE.Color(col.acento) }, uB: { value: new THREE.Color(col.acento2 ?? col.acento) }, uBg: { value: new THREE.Color(col.fondo) },
    },
  });
}

/**
 * Paneles flotantes: uno por capítulo con imagen/vídeo, más los de la galería.
 * Solo se reproduce un vídeo a la vez.
 */
export function crearPaneles(datos, ruta, grupo, gestor) {
  const azar = rng((datos.escenario.semilla ?? 1) + 31);
  const cargador = new THREE.TextureLoader(gestor);
  const geo = new THREE.PlaneGeometry(1, 9 / 16);
  const paneles = [];
  const videos = new Map(); // capitulo -> {el, tex}
  const vistaPrevia = !!datos.escenario.vista_previa;
  let activo = -1;

  const cargarImagen = (url, mat) => {
    cargador.load(url, (t) => {
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      mat.uniforms.uMap.value = t; mat.uniforms.uHas.value = 1;
    }, undefined, () => { /* si falta, se queda la vista previa */ });
  };

  datos.capitulos.forEach((c, i) => {
    const tieneHero = !!c.modelo3d || (vistaPrevia && c.tipo === 'portada' && datos.escenario.modelo3d_demo);
    if (!tieneHero && (c.imagen || c.video || (vistaPrevia && c.tipo !== 'cierre' && c.tipo !== 'contacto'))) {
      if (c.tipo === 'galeria' && !c.imagen && !c.video) { /* la galería usa sus propios paneles */ }
      else {
        const mat = materialPanel(datos, azar() * 10);
        const malla = new THREE.Mesh(geo, mat);
        malla.frustumCulled = false; grupo.add(malla);
        const p = { malla, mat, cap: i, tipo: 'capitulo', semilla: azar() };
        if (c.imagen) cargarImagen(c.imagen, mat);
        paneles.push(p);
      }
    }
    if (c.tipo === 'galeria') {
      const items = c.galeria?.length ? c.galeria : (vistaPrevia ? Array.from({ length: 4 }, () => ({})) : []);
      items.forEach((g, k) => {
        const mat = materialPanel(datos, azar() * 10);
        const malla = new THREE.Mesh(geo, mat);
        malla.frustumCulled = false; grupo.add(malla);
        if (g.imagen) cargarImagen(g.imagen, mat);
        paneles.push({ malla, mat, cap: i, tipo: 'galeria', k, total: items.length, semilla: azar() });
      });
    }
  });

  // ---- vídeo (carga perezosa; solo uno reproduciéndose) ----
  function prepararVideo(i) {
    const c = datos.capitulos[i];
    if (!c?.video || videos.has(i)) return;
    const el = document.createElement('video');
    el.src = c.video; el.muted = true; el.loop = true; el.playsInline = true; el.preload = 'auto'; el.crossOrigin = 'anonymous';
    el.setAttribute('playsinline', ''); el.setAttribute('muted', '');
    const tex = new THREE.VideoTexture(el); tex.colorSpace = THREE.SRGBColorSpace;
    videos.set(i, { el, tex });
    const p = paneles.find((q) => q.cap === i && q.tipo === 'capitulo');
    if (p) el.addEventListener('loadeddata', () => { p.mat.uniforms.uMap.value = tex; p.mat.uniforms.uHas.value = 1; }, { once: true });
  }
  function activar(i) {
    if (i === activo) return;
    activo = i;
    for (const [k, v] of videos) if (k !== i) v.el.pause();
    if (i < 0) return;
    for (const d of [i - 1, i, i + 1]) if (d >= 0 && d < datos.capitulos.length) prepararVideo(d);
    const v = videos.get(i);
    if (v) v.el.play().catch(() => {});
  }

  // ---- colocación (depende de la proporción de pantalla) ----
  function colocar(aspecto) {
    const medioAlto = DIST * Math.tan((FOV * Math.PI) / 360);
    const medioAncho = medioAlto * aspecto;
    const vertical = aspecto < 0.9;
    const R = ruta.arq.radio * 0.9;
    const dU = DIST / ruta.largo;
    const lados = (c) => (c.posicion === 'izquierda' ? 1 : c.posicion === 'derecha' ? -1 : 0); // lado LIBRE (donde va el panel)
    const marcoCam = (u) => ruta.marco(u);

    for (const p of paneles) {
      const c = datos.capitulos[p.cap];
      const uc = ruta.uCap[p.cap];
      const lado = lados(c);
      let ancho, x, y, u, yaw;
      if (p.tipo === 'capitulo') {
        u = uc + dU;
        if (vertical) { ancho = Math.min(medioAncho * 1.8, medioAlto * 1.2); x = 0; y = medioAlto * 0.46; yaw = 0; }
        else if (lado === 0) { ancho = Math.min(medioAncho * 0.55, 7.5); x = 0; y = medioAlto * 0.5; yaw = 0; }
        else { x = medioAncho * 0.5 * lado; ancho = Math.max(4, Math.min(medioAncho * 0.84, 2 * (R - Math.abs(x)))); y = 0; yaw = -0.2 * lado; }
      } else {
        // galería: se reparte en su tramo sin invadir el capítulo siguiente
        const uPrev = p.cap > 0 ? ruta.uCap[p.cap - 1] : uc - 0.05;
        const uNext = p.cap < ruta.n - 1 ? ruta.uCap[p.cap + 1] : ruta.uFinal;
        const a = uc - 0.38 * (uc - uPrev), b = uc + 0.4 * (uNext - uc);
        u = a + ((p.k + 0.5) / p.total) * (b - a);
        const alterna = p.k % 2 ? -1 : 1;
        const ladoG = lado !== 0 ? lado : alterna;
        ancho = vertical ? medioAncho * 1.2 : Math.min(medioAncho * 0.5, 5.4);
        x = vertical ? medioAncho * 0.3 * alterna : ladoG * (medioAncho * 0.5 + (azar() - 0.5) * 2);
        y = vertical ? medioAlto * (0.34 + 0.12 * azar()) : (lado === 0 ? medioAlto * (0.35 + 0.2 * azar()) : (azar() - 0.5) * medioAlto * 0.9);
        yaw = -0.3 * ladoG;
        x = Math.sign(x) * Math.min(Math.abs(x), R - ancho / 2);
      }
      const m = marcoCam(u);
      const pos = m.pos.clone().addScaledVector(m.der, x).addScaledVector(m.sup, y);
      p.malla.position.copy(pos);
      const base = new THREE.Matrix4().makeBasis(m.der, m.sup, m.tan.clone().negate());
      p.malla.quaternion.setFromRotationMatrix(base);
      p.malla.rotateY(yaw);
      p.malla.scale.setScalar(ancho);
      p.base = pos.clone(); p.ancho = ancho;
      p.malla.userData.y0 = pos.y;
    }
  }

  function actualizar(t, camPos, camDir, capActivo) {
    activar(capActivo);
    for (const p of paneles) {
      const v = p.malla.position.clone().sub(camPos);
      const dist = v.length(), delante = v.dot(camDir);
      let op = suave(78, 50, dist) * suave(-7, 3, delante);
      p.mat.uniforms.uOp.value = op;
      p.malla.visible = op > 0.003;
      p.mat.uniforms.uTime.value = t;
      p.malla.position.y = p.base.y + Math.sin(t * 0.8 + p.semilla * 20) * 0.12;
    }
  }
  return { paneles, colocar, actualizar, activar, videos };
}

/** Objeto 3D protagonista (GLB de Higgsfield) o, en la vista previa, una forma de muestra. */
export function crearHeroes(datos, ruta, grupo, gestor) {
  const lista = [];
  const col = datos.marca.colores;
  const vistaPrevia = !!datos.escenario.vista_previa;
  datos.capitulos.forEach((c, i) => {
    const m = c.modelo3d;
    if (!m && !(vistaPrevia && c.tipo === 'portada' && datos.escenario.modelo3d_demo)) return;
    const contenedor = new THREE.Group();
    contenedor.visible = false; grupo.add(contenedor);
    const h = { cap: i, grupo: contenedor, giro: 0, escala: m?.escala ?? 1, listo: false };
    const montar = (obj) => {
      const caja = new THREE.Box3().setFromObject(obj);
      const esfera = caja.getBoundingSphere(new THREE.Sphere());
      obj.position.sub(esfera.center);
      const norm = new THREE.Group(); norm.add(obj); norm.scale.setScalar(1 / Math.max(esfera.radius, 1e-3));
      contenedor.add(norm); h.listo = true;
    };
    if (m?.archivo) {
      new GLTFLoader(gestor).load(m.archivo, (g) => montar(g.scene), undefined, () => {});
    } else {
      const mat = new THREE.MeshStandardMaterial({ color: col.acento, emissive: col.acento, emissiveIntensity: 0.35, metalness: 0.85, roughness: 0.22, wireframe: false });
      montar(new THREE.Mesh(new THREE.TorusKnotGeometry(1, 0.32, 160, 24), mat));
    }
    lista.push(h);
  });

  function colocar(aspecto) {
    const D = DIST + 1.5;                       // un poco más lejos que los paneles: el objeto gira y sus puntas se acercan
    const medioAlto = D * Math.tan((FOV * Math.PI) / 360);
    const medioAncho = medioAlto * aspecto;
    const vertical = aspecto < 0.9;
    for (const h of lista) {
      const c = datos.capitulos[h.cap];
      const lado = c.posicion === 'izquierda' ? 1 : c.posicion === 'derecha' ? -1 : 0;
      const m = ruta.marco(ruta.uCap[h.cap] + D / ruta.largo);
      const x = vertical ? 0 : medioAncho * 0.5 * lado;
      const y = vertical ? medioAlto * 0.46 : (lado === 0 ? medioAlto * 0.5 : 0);
      const radio = vertical ? Math.min(medioAncho * 0.5, medioAlto * 0.26) : (lado === 0 ? medioAlto * 0.26 : Math.min(medioAncho * 0.2, medioAlto * 0.36));
      h.grupo.position.copy(m.pos).addScaledVector(m.der, x).addScaledVector(m.sup, y);
      h.grupo.scale.setScalar(radio * h.escala);
      h.base = h.grupo.position.clone();
    }
  }
  function actualizar(t, dt, camPos, camDir) {
    for (const h of lista) {
      const d = h.grupo.position.distanceTo(camPos), delante = h.grupo.position.clone().sub(camPos).dot(camDir);
      const vis = suave(90, 55, d) * suave(-8, 2, delante);
      h.grupo.visible = h.listo && vis > 0.01;
      h.grupo.rotation.y += dt * 0.35;
      h.grupo.rotation.x = Math.sin(t * 0.5) * 0.12;
      h.grupo.position.y = h.base.y + Math.sin(t * 0.7) * 0.25;
    }
  }
  return { lista, colocar, actualizar, FOV };
}

export { FOV };
