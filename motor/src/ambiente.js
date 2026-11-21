import * as THREE from 'three';
import { rng, suave, clamp, brillo } from './utilidades.js';

/** Anillos de luz a lo largo del túnel (InstancedMesh con pulso por instancia). */
export function crearAnillos(datos, ruta, intensidadK) {
  const { arq, largo, curva } = ruta;
  const n = Math.floor(largo / arq.anillos.sep);
  const geo = new THREE.TorusGeometry(arq.radio * 0.965, arq.anillos.grosor, 8, 72);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true });
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  const dummy = new THREE.Object3D();
  const base = new THREE.Color(datos.marca.colores.acento);
  const base2 = new THREE.Color(datos.marca.colores.acento2 ?? datos.marca.colores.acento);
  const tmp = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const p = curva.getPointAt(u), t = curva.getTangentAt(u);
    dummy.position.copy(p); dummy.lookAt(p.clone().add(t)); dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, tmp.copy(i % 2 ? base : base2));
  }
  mesh.frustumCulled = false;
  const k = arq.anillos.k * intensidadK;
  const colores = Array.from({ length: n }, (_, i) => (i % 2 ? base : base2).clone());
  function actualizar(t, vel) {
    for (let i = 0; i < n; i++) {
      const pulso = 0.55 + 0.45 * Math.sin(t * 1.4 - i * 0.55) + vel * 0.8;
      mesh.setColorAt(i, tmp.copy(colores[i]).multiplyScalar(k * pulso));
    }
    mesh.instanceColor.needsUpdate = true;
  }
  return { mesh, actualizar };
}

/** Partículas (polvo de luz) repartidas dentro del túnel. */
export function crearParticulas(datos, ruta, calidadMovil) {
  const { arq, curva } = ruta;
  const azar = rng((datos.escenario.semilla ?? 1) + 77);
  const n = Math.round((calidadMovil ? 900 : 1800) * arq.particulas);
  const pos = new Float32Array(n * 3), fase = new Float32Array(n), tam = new Float32Array(n), mezcla = new Float32Array(n);
  const p = new THREE.Vector3(), t = new THREE.Vector3(), r = new THREE.Vector3(), s = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const u = azar();
    curva.getPointAt(u, p); curva.getTangentAt(u, t);
    r.crossVectors(t, up).normalize(); s.crossVectors(r, t).normalize();
    const ang = azar() * Math.PI * 2, rad = arq.radio * (0.15 + 0.8 * Math.sqrt(azar()));
    p.addScaledVector(r, Math.cos(ang) * rad).addScaledVector(s, Math.sin(ang) * rad);
    pos.set([p.x, p.y, p.z], i * 3);
    fase[i] = azar() * 6.28; tam[i] = 0.5 + azar() * 1.5; mezcla[i] = azar();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aFase', new THREE.BufferAttribute(fase, 1));
  geo.setAttribute('aTam', new THREE.BufferAttribute(tam, 1));
  geo.setAttribute('aMez', new THREE.BufferAttribute(mezcla, 1));
  const uniformes = {
    uTime: { value: 0 }, uSpeed: { value: 0 }, uPx: { value: 1 },
    uA: { value: new THREE.Color(datos.marca.colores.acento) },
    uB: { value: new THREE.Color(datos.marca.colores.acento2 ?? datos.marca.colores.acento) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: uniformes, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aFase, aTam, aMez; uniform float uTime, uSpeed, uPx;
      varying float vA; varying float vM;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position,1.);
        float d = -mv.z;
        vA = smoothstep(240., 40., d) * smoothstep(1., 7., d) * (.45 + .55*sin(uTime*1.3 + aFase));
        vM = aMez;
        gl_PointSize = clamp(aTam * uPx * (1. + uSpeed*.8) * 120. / max(d, 1.), 1., 22.);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uA, uB; varying float vA; varying float vM;
      void main(){
        float r = length(gl_PointCoord - .5) * 2.;
        float a = smoothstep(1., 0., r); a *= a;
        gl_FragColor = vec4(mix(uA, uB, vM) * 1.4, a * vA);
      }`,
  });
  const puntos = new THREE.Points(geo, mat);
  puntos.frustumCulled = false;
  return { puntos, uniformes };
}

/** Líneas de velocidad pegadas a la cámara: aparecen al ir rápido. */
export function crearLineasVelocidad(datos, movil) {
  const azar = rng((datos.escenario.semilla ?? 1) + 5);
  const n = movil ? 90 : 190;
  const pos = new Float32Array(n * 2 * 3), fin = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const ang = azar() * 6.28, rad = 1.8 + azar() * 7.5, z0 = azar() * 70;
    const x = Math.cos(ang) * rad, y = Math.sin(ang) * rad;
    pos.set([x, y, z0, x, y, z0], i * 6);
    fin[i * 2] = 0; fin[i * 2 + 1] = 1;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aFin', new THREE.BufferAttribute(fin, 1));
  const uniformes = { uOffset: { value: 0 }, uSpeed: { value: 0 }, uC: { value: new THREE.Color(datos.marca.colores.acento).lerp(new THREE.Color('#ffffff'), 0.35) } };
  const mat = new THREE.ShaderMaterial({
    uniforms: uniformes, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aFin; uniform float uOffset, uSpeed; varying float vA;
      void main(){
        float z = -70. + mod(position.z + uOffset, 70.);
        float largo = (.6 + uSpeed * 9.);
        vec3 p = vec3(position.xy, z - aFin * largo);
        vA = (1. - aFin) * smoothstep(0., .25, uSpeed) * smoothstep(-2., -10., z) * smoothstep(-70., -40., z);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
      }`,
    fragmentShader: /* glsl */ `uniform vec3 uC; varying float vA; void main(){ gl_FragColor = vec4(uC, vA * .55); }`,
  });
  const lineas = new THREE.LineSegments(geo, mat);
  lineas.frustumCulled = false;
  return { lineas, uniformes };
}

/** «Luz al final del túnel»: disco con halo, con tope de intensidad para no lavar la pantalla. */
export function crearLuzFinal(datos, ruta) {
  const pos = ruta.curva.getPointAt(1);
  const uniformes = {
    uI: { value: 0 }, uTime: { value: 0 },
    uC: { value: new THREE.Color(datos.marca.colores.acento).lerp(new THREE.Color('#ffffff'), 0.55) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: uniformes, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: /* glsl */ `
      uniform float uI, uTime; uniform vec3 uC; varying vec2 vUv;
      void main(){
        float r = length(vUv - .5) * 2.;
        float nucleo = pow(smoothstep(.34, 0., r), 1.6);
        float halo = pow(smoothstep(1., 0., r), 2.6);
        float rayos = pow(max(0., sin(atan(vUv.y-.5, vUv.x-.5)*7. + uTime*.4)), 6.) * smoothstep(.9,.1,r) * .12;
        float a = clamp(nucleo * .95 + halo * .34 + rayos, 0., 1.) * uI;
        gl_FragColor = vec4(uC * (1.3 + nucleo * 3.6), a * .9);
      }`,
  });
  const malla = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  malla.position.copy(pos); malla.scale.setScalar(ruta.arq.radio * 1.7);
  malla.renderOrder = 10; malla.frustumCulled = false;
  return { malla, uniformes };
}
