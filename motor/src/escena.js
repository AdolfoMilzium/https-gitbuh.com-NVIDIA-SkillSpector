import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { crearRuta } from './ruta.js';
import { crearParedes } from './paredes.js';
import { crearAnillos, crearParticulas, crearLineasVelocidad, crearLuzFinal } from './ambiente.js';
import { crearPaneles, crearHeroes, FOV } from './paneles.js';
import { crearPost } from './post.js';
import { clamp, suave, amortiguar, luminancia, esMovil } from './utilidades.js';

/**
 * El mundo 3D. Todo se actualiza desde un único bucle (el de GSAP) llamando a `actualizar`.
 * El túnel nunca es un vídeo: el movimiento lo pone el código.
 */
export async function crearMundo(datos, { canvas, reducido, captura, onProgreso }) {
  const movil = esMovil();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  const col = datos.marca.colores;
  const bg = new THREE.Color(col.fondo);
  renderer.setClearColor(0x000000, 1); // el extremo del túnel se pierde en la oscuridad (las paredes se funden a casi negro)

  const escena = new THREE.Scene();
  const ruta = crearRuta(datos);
  escena.fog = new THREE.FogExp2(bg.clone().multiplyScalar(0.55), ruta.arq.niebla);
  const camara = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 0.1, 600);
  escena.add(camara);

  // Luz del acento: si el color es muy luminoso, se rebaja para no saturar el bloom
  const lumAcento = luminancia(col.acento);
  const kLuz = 1.15 - 0.6 * Math.min(1, lumAcento * 1.2);

  // Texturas y modelos con un único gestor para saber cuándo está todo cargado
  const gestor = new THREE.LoadingManager();
  gestor.onProgress = (_u, hechos, total) => onProgreso?.(hechos / Math.max(total, 1));
  const listo = new Promise((res) => { gestor.onLoad = res; setTimeout(res, 7000); });
  let texturaPared = null;
  if (datos.escenario.textura) {
    texturaPared = new THREE.TextureLoader(gestor).load(datos.escenario.textura, (t) => {
      t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
    }, undefined, () => { paredes.uniformes.uTexMix.value = 0; });
  }

  const paredes = crearParedes(datos, ruta, texturaPared);
  escena.add(paredes.malla);
  const anillos = crearAnillos(datos, ruta, kLuz); escena.add(anillos.mesh);
  const particulas = crearParticulas(datos, ruta, movil); escena.add(particulas.puntos);
  const lineas = crearLineasVelocidad(datos, movil); camara.add(lineas.lineas);
  const luzFinal = crearLuzFinal(datos, ruta); escena.add(luzFinal.malla);

  const grupoPaneles = new THREE.Group(); escena.add(grupoPaneles);
  const paneles = crearPaneles(datos, ruta, grupoPaneles, gestor);
  const heroes = crearHeroes(datos, ruta, grupoPaneles, gestor);

  // Iluminación para el modelo 3D (las paredes son shaders y no la necesitan)
  const pmrem = new THREE.PMREMGenerator(renderer);
  escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  escena.environmentIntensity = 0.55;
  const luzA = new THREE.DirectionalLight(new THREE.Color(col.acento), 2.2 * kLuz); luzA.position.set(3, 4, 2); luzA.target.position.set(0, 0, -12); camara.add(luzA, luzA.target);
  const luzB = new THREE.DirectionalLight(new THREE.Color(col.acento2 ?? col.acento), 1.4 * kLuz); luzB.position.set(-4, -2, 1); luzB.target.position.set(0, 0, -12); camara.add(luzB, luzB.target);

  const post = crearPost(renderer, escena, camara, datos, { reducido, movil, fijarCalidad: captura });

  // ---- estado de cámara ----
  const e = { u: ruta.scrollAU(0), objetivo: ruta.scrollAU(0), vel: 0, recorrido: 0, blur: 0, blurObj: 0, dir: new THREE.Vector2(), cx: 0, cy: 0, mx: 0, my: 0, roll: 0, t: 0 };
  addEventListener('pointermove', (ev) => { e.mx = (ev.clientX / innerWidth - 0.5) * 2; e.my = (ev.clientY / innerHeight - 0.5) * 2; }, { passive: true });

  function redimensionar() {
    renderer.setSize(innerWidth, innerHeight, false);
    camara.aspect = innerWidth / innerHeight; camara.updateProjectionMatrix();
    paneles.colocar(camara.aspect); heroes.colocar(camara.aspect);
    post.redimensionar();
  }
  addEventListener('resize', redimensionar);
  redimensionar();

  const tmpP = new THREE.Vector3(), tmpL = new THREE.Vector3(), tmpD = new THREE.Vector3(), tmpR = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  /** Posiciona la cámara en e.u mirando por la curva. */
  function ponerCamara(dt) {
    const u = clamp(e.u, 0, 0.995);
    ruta.curva.getPointAt(u, tmpP);
    ruta.curva.getPointAt(Math.min(u + 0.028, 1), tmpL);
    tmpD.subVectors(tmpL, tmpP).normalize();
    tmpR.crossVectors(tmpD, up).normalize();
    // Parallax suave con el ratón y respiración; todo se apaga con "reducir movimiento"
    const k = reducido ? 0 : 1;
    e.cx = amortiguar(e.cx, e.mx * 0.7 * k, 2.5, dt); e.cy = amortiguar(e.cy, e.my * 0.45 * k, 2.5, dt);
    const respira = Math.sin(e.t * 0.6) * 0.12 * k;
    camara.position.copy(tmpP).addScaledVector(tmpR, e.cx).addScaledVector(up, -e.cy + respira);
    camara.up.copy(up);
    camara.lookAt(tmpL);
    // Alabeo según la curvatura del recorrido
    ruta.curva.getTangentAt(Math.min(u + 0.012, 1), tmpL);
    const giro = tmpL.dot(tmpR);
    e.roll = amortiguar(e.roll, clamp(giro * 2.2, -0.12, 0.12) * k, 2, dt);
    camara.rotateZ(-e.roll);
    camara.updateMatrixWorld();
  }

  /**
   * @param p progreso de scroll 0..1
   * @param capActivo índice del capítulo cuyo texto está visible (o -1)
   * @param texto {lado:-1|0|1, vertical:boolean} hacia dónde desenfocar el túnel
   */
  function actualizar(dt, p, capActivo, texto, inmediato = false) {
    dt = Math.min(dt, 0.1); e.t += dt;
    e.objetivo = ruta.scrollAU(p);
    const antes = e.u;
    e.u = inmediato ? e.objetivo : amortiguar(e.u, e.objetivo, 5.5, dt);
    const dist = Math.abs(e.u - antes) * ruta.largo;
    e.recorrido += dist;
    const v = dt > 0 ? dist / dt / 55 : 0;
    e.vel = amortiguar(e.vel, clamp(v), 6, dt);
    const vel = reducido ? e.vel * 0.25 : e.vel;

    ponerCamara(dt);

    // Desenfoque del túnel detrás del texto, solo del lado donde está el texto
    e.blurObj = texto ? 1 : 0;
    e.blur = inmediato ? e.blurObj : amortiguar(e.blur, e.blurObj, 5, dt);
    if (texto) e.dir.set(texto.vertical ? 0 : texto.lado, texto.vertical ? -1 : 0);
    // el desenfoque cede si vamos rápido (así el viaje se ve nítido)
    const fu = post.final.uniforms;
    fu.uBlur.value = e.blur * (1 - clamp(vel * 2.5)) * 0.9;
    fu.uDir.value.copy(e.dir); fu.uSpeed.value = vel; fu.uTime.value = e.t % 100;

    paredes.uniformes.uTime.value = e.t; paredes.uniformes.uSpeed.value = vel;
    particulas.uniformes.uTime.value = e.t; particulas.uniformes.uSpeed.value = vel; particulas.uniformes.uPx.value = renderer.getPixelRatio();
    lineas.uniformes.uOffset.value = e.recorrido * 1.2; lineas.uniformes.uSpeed.value = reducido ? 0 : vel;
    anillos.actualizar(e.t, vel);

    // Luz al final: crece al acercarse pero con tope para no lavar la pantalla
    luzFinal.uniformes.uI.value = suave(0.55, 0.97, e.u) * 0.95;
    luzFinal.uniformes.uTime.value = e.t;
    luzFinal.malla.quaternion.copy(camara.quaternion);

    camara.getWorldDirection(tmpD);
    paneles.actualizar(e.t, camara.position, tmpD, capActivo);
    heroes.actualizar(e.t, dt, camara.position, tmpD);

    post.medir(dt);
    post.compositor.render(dt);
  }

  return { renderer, escena, camara, ruta, actualizar, redimensionar, listo, estado: e, post, paneles, heroes, movil, luzFinal, paredes };
}
