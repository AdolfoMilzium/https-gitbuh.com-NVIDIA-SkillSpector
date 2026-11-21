import * as THREE from 'three';
import { IDX_ARQ } from './ruta.js';
import { brillo, luminancia, clamp } from './utilidades.js';

const VERT = /* glsl */ `
varying vec2 vUv; varying float vDist;
void main(){
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
precision highp float;
uniform float uTime, uSpeed, uLen, uRadio, uCelda, uArq, uTexMix, uNiebla, uSemilla, uTexRep;
uniform vec3 uBg, uA, uB;
uniform sampler2D uTex;
varying vec2 vUv; varying float vDist;
const float TAU = 6.28318530718;

float h31(vec3 p){ p = fract(p*.3183099 + .1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vn(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f*f*(3.-2.*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x), mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x), mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y), f.z);
}
float fbm(vec3 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=.5; } return s; }

// q: x = celdas a lo largo, y = celdas alrededor (entero → sin costura). p3: posición 3D periódica.
vec3 neon(vec2 q, vec3 p3){
  vec2 g = abs(fract(q) - .5);
  float lAlong = smoothstep(.485, .5, g.y);          // líneas a lo largo del túnel (finas)
  float lCross = smoothstep(.478, .5, g.x);          // cuadernas alrededor
  float pulso = pow(sin(q.x*.55 - uTime*1.6 + floor(q.y)*1.9)*.5 + .5, 16.);
  vec3 c = uBg*.5 + uA*.03*fbm(p3*.35);
  c += uA * (lAlong*.5 + lCross*.7) * (.28 + 1.5*pulso + uSpeed*.7);
  c += uB * lAlong * pulso * .8;
  c += uA * smoothstep(.0, .5, abs(g.x-.25)) * 0.0;
  return c;
}
vec3 organico(vec2 q, vec3 p3){
  vec3 w = p3*.16;
  w += .7*vec3(fbm(w+uTime*.025), fbm(w+7.1), fbm(w+3.3));
  float n = fbm(w*2. + uTime*.04);
  float venas = pow(1. - abs(n*2.-1.), 11.);
  vec3 c = mix(uBg*.55, uA*.16 + uBg*.4, smoothstep(.35,.9, fbm(w*1.3)));
  c += uB * venas * (.62 + uSpeed*.7);
  c += uA * pow(fbm(w*3. - uTime*.08), 3.) * .18;
  return c;
}
vec3 arquitectonico(vec2 q, vec3 p3){
  float fx = fract(q.x*.5);
  float costilla = smoothstep(.07,.0, min(fx, 1.-fx));
  float junta = smoothstep(.47, .5, abs(fract(q.y*.5)-.5));
  float tira = smoothstep(.478, .5, abs(fract(vUv.y*4.)-.5));
  float losa = fbm(p3*1.7)*.12 + .06;
  vec3 c = uBg*.9 + vec3(losa)*uA*.5;
  c *= 1. - costilla*.55;
  c += uB*junta*.12 + uA*costilla*.7*(.5+.5*sin(q.x*.4 - uTime*.6));
  c += uA*tira*(1.2 + uSpeed*1.2);
  return c;
}
vec3 industrial(vec2 q, vec3 p3){
  vec2 pl = vec2(q.x*.5, q.y*.5);
  vec2 f = fract(pl);
  float juntas = smoothstep(.04,.0, min(min(f.x,1.-f.x), min(f.y,1.-f.y)));
  float remache = smoothstep(.07,.04, length(f-vec2(.08)));
  float oxido = fbm(p3*1.2)*fbm(p3*.4+3.);
  float banda = step(.5, fract((q.x + q.y)*.9)) * smoothstep(.86,.92, abs(sin(vUv.y*TAU*.5)));
  float barrido = pow(max(0., sin(q.x*.22 - uTime*.9)), 28.);
  vec3 c = uBg*.8 + uA*.04*oxido;
  c *= 1. - juntas*.6;
  c += uB*remache*.25 + uA*banda*.55 + uA*barrido*(.9 + uSpeed);
  return c;
}
vec3 cosmico(vec2 q, vec3 p3){
  vec3 w = p3*.08;
  float n = fbm(w + uTime*.006), m = fbm(w*1.7 + 4.2 - uTime*.004);
  vec3 c = uBg*.45 + mix(uA, uB, m) * pow(n, 2.2) * .9;
  vec3 s = p3*2.6; vec3 id = floor(s);
  float e = step(.982, h31(id + uSemilla)) * pow(clamp(1.-length(fract(s)-.5)*2.,0.,1.), 3.);
  c += mix(vec3(1.), uA, .35) * e * (1.8 + 1.2*sin(uTime*2.+h31(id)*40.));
  return c;
}

void main(){
  float N = max(3., floor(TAU * uRadio / uCelda + .5));
  vec2 q = vec2(vUv.x * uLen / uCelda, vUv.y * N);
  float ang = vUv.y * TAU;
  float rr = uRadio / uCelda;
  vec3 p3 = vec3(q.x, cos(ang)*rr, sin(ang)*rr);

  vec3 c;
  if (uArq < .5) c = neon(q, p3);
  else if (uArq < 1.5) c = organico(q, p3);
  else if (uArq < 2.5) c = arquitectonico(q, p3);
  else if (uArq < 3.5) c = industrial(q, p3);
  else c = cosmico(q, p3);

  if (uTexMix > .001){
    float nt = max(1., floor(N / uTexRep + .5));
    vec3 t = texture2D(uTex, vec2(q.x / uTexRep * .5, vUv.y * nt)).rgb;
    float lum = dot(t, vec3(.299,.587,.114));
    t = mix(vec3(lum) * uA * 1.5, t, .65);               // acerca la textura a la paleta
    c = mix(c, c*.45 + t*.95, uTexMix);
  }
  float f = exp(-pow(vDist * uNiebla, 1.5));
  c = mix(uBg*.35, c, f);
  c = mix(c, uBg*.06, smoothstep(.92, .995, vUv.x));   // el último tramo se funde con la oscuridad: la luz brilla sola
  c *= 1. + uSpeed*.18;
  gl_FragColor = vec4(c, 1.);
}`;

export function crearParedes(datos, ruta, texturaCargada) {
  const { arq } = ruta;
  const col = datos.marca.colores;
  const largo = ruta.largo;
  const segmentos = Math.ceil(largo / 2.5);
  const geo = new THREE.TubeGeometry(ruta.curva, segmentos, arq.radio, 56, false);

  // Un acento muy luminoso (amarillo, cian…) inunda las paredes: se atenúa según su luminosidad
  const atenua = (hex) => 1 - 0.45 * clamp((luminancia(hex) - 0.35) / 0.45);
  const uniformes = {
    uTime: { value: 0 }, uSpeed: { value: 0 }, uLen: { value: largo }, uRadio: { value: arq.radio },
    uCelda: { value: arq.celda }, uArq: { value: IDX_ARQ[datos.escenario.arquetipo] ?? 0 },
    uTexMix: { value: texturaCargada ? 0.85 : 0 }, uTexRep: { value: 3 }, uNiebla: { value: arq.niebla },
    uSemilla: { value: (datos.escenario.semilla % 997) * 0.13 },
    uBg: { value: new THREE.Color(col.fondo) }, uA: { value: new THREE.Color(col.acento).multiplyScalar(atenua(col.acento)) },
    uB: { value: new THREE.Color(col.acento2 ?? col.acento).multiplyScalar(atenua(col.acento2 ?? col.acento)) },
    uTex: { value: texturaCargada ?? null },
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: uniformes, side: THREE.BackSide });
  const malla = new THREE.Mesh(geo, mat);
  malla.frustumCulled = false;
  return { malla, uniformes };
}
