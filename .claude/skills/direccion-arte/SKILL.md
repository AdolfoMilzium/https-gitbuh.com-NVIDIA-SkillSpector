---
name: direccion-arte
description: Decide el arquetipo de túnel, la metáfora visual, la paleta, las tipografías y 6–8 capítulos con textos reescritos, y prepara el plan de visuales (Higgsfield o Coverr) con su coste. Skill interna que usa /crear-web.
user-invocable: false
---

# Dirección de arte

Entrada: `proyectos/<slug>/empresa.json` (+ capturas). Salida: `proyectos/<slug>/contenido/web.json` y `estado.json → visuales` (todo en estado `planificado`). **Aquí no se genera nada ni se gasta nada.**

## 1. Arquetipo y metáfora

| Arquetipo | Cuándo | Sensación |
|---|---|---|
| `neon` | tecnología, telecom, software, gaming, energía | rejilla de luz, pulsos viajando |
| `organico` | salud, bienestar, alimentación, agro, cosmética | flujo vivo, venas de luz suaves |
| `arquitectonico` | construcción, arquitectura, inmobiliaria, despachos, interiorismo | cuadernas, arcos, tiras de luz |
| `industrial` | industria, logística, talleres, ingeniería, mecánica | placas, remaches, bandas de aviso |
| `cosmico` | formación, consultoría, finanzas, ocio, viajes, marcas aspiracionales | nebulosa y estrellas |

Elige también `semilla` (entero; cambia el recorrido — que sea distinto en cada empresa) y escribe la **metáfora** en una frase concreta ligada a lo que hace la empresa («una panadería vista desde dentro del horno: brasas y vapor»). Esa frase guía TODOS los prompts.

### Si el usuario aporta un clip de túnel
Usa el **modo vídeo**: `npm run video -- <slug> <clip>` (lo optimiza y deja `escenario.modo = "video"`). Entonces no se generan imágenes, galería ni 3D (no se muestran): el plan de visuales queda vacío y el coste es 0 (como mucho, la imagen social). Los colores de la marca pueden salir de los del clip que propone el script o forzarse con `escenario.video_tinte` (0–1). Sin clip, el túnel es siempre 3D en tiempo real.

## 2. Paleta y tipografías

- Parte de los colores de la marca (`empresa.json → marca`). Fondo **oscuro** (túnel); texto con contraste ≥ 4.5:1; acento = el color más característico de la marca. Un acento muy luminoso (amarillo, cian) es válido: el motor ajusta bloom y luces solo.
- Tipografías: las de la marca si existen en Google Fonts; si no, la equivalente más cercana. El validador comprueba que existen.
- `npm run validar -- <slug>` te dirá si algo no cumple el contraste.

## 3. Capítulos (6–8)

`tipo`: `portada` (siempre el primero), `texto`, `lista`, `cifras`, `cita`, `galeria`, `cierre` (siempre el último: luz al final del túnel). `posicion`: `izquierda` | `derecha` | `centro`.
- Alterna izquierda/derecha para dar ritmo; `centro` para cifras y citas (el panel va por encima). La **portada** y el **cierre** funcionan mejor a un lado (la luz del final queda libre).
- Título ≤ 90 caracteres; texto ≤ 340. Frases cortas, tono de la marca, **reescritas** (no copies párrafos literales) y **sin datos inventados**.
- `cifras` y `cita` exigen `origen` (la página de donde salen). Si la web no tiene cifras o testimonios, **no hagas ese capítulo**.
- Etiqueta corta (1–2 palabras) para el menú lateral.
- Contacto real en `empresa.contacto` (solo lo detectado). Botón del cierre: web o teléfono/email reales.
- Rutas de recursos: `assets/<id>.webp`, `assets/textura.webp`, `assets/modelo.glb`, `assets/<id>.mp4`, `assets/social.jpg`. Logo: `marca.logo.archivo` / `.claro`.
- Esquema completo: mira `proyectos/demo/contenido/web.json`.

## 4. Plan de visuales (proveedor elegido)

Lee `estado.json → proveedor` (`higgsfield` | `coverr`). Pregunta/propón el preset de `marca.config.json → presets` (`prueba` por defecto: el más barato) y usa su bloque del proveedor (`presets.<preset>.<proveedor>`).

**Con Coverr:** no existe el modelo 3D (omite `hero-fuente` y `modelo`; deja `modelo3d` fuera de `web.json`), no hay cotizador (calcula el coste con `get_ai_model`: `pricePerUnit` + `featurePrices`; el vídeo se cobra por segundo de duración y se estima por lo alto) y las cifras son **créditos de Coverr**, que no equivalen a los de Higgsfield. Dilo al usuario: si quiere el objeto 3D protagonista, necesita Higgsfield.

**Con Higgsfield — cotiza en vivo, sin gastar**: `estimate_image_cost`, `estimate_video_cost`, `generate_3d` con `get_cost: true`, y `models_explore` para confirmar que los modelos siguen existiendo. Los precios de `marca.config.json` son solo de referencia (Coverr, por imagen: seedream-5-0-flash 200 · kling-image-o3 2K 400; Higgsfield consultados el 2026-11-21: z_image 0,15 · seedream_5_0_flash 2k 0,5 · gpt_image_2_6 low 0,75 · nano_banana_2 2k 2 · seedance_2_0_mini 5 s ≈ 5 · grok_video_v15_lite 5 s ≈ 5 · tripo_h3_1_image_to_3d ≈ 9 · meshy_v7 ≈ 38 créditos).

Qué se pide al proveedor y dónde va (el túnel nunca es un vídeo: el movimiento lo pone el código):

| id | tipo | formato | uso |
|---|---|---|---|
| `textura` | `textura` | 1:1 | paredes del túnel (se hace repetible al descargar) |
| `<capitulo>` | `capitulo` | 16:9 | panel 3D flotante de cada capítulo (no hace falta en `cierre`) |
| `<capitulo>-g<n>` | `galeria` | 16:9 | un panel por elemento de galería (`indice` = n) |
| `<capitulo>-video` | `video` | 16:9, 5 s | solo preset premium: `generate_video` con la imagen del capítulo como `start_image`; sustituye a la imagen en el panel |
| `hero-fuente` | `hero_fuente` | 1:1 | **solo Higgsfield**: imagen del objeto protagonista; es la fuente del 3D |
| `modelo` | `modelo3d` | GLB | **solo Higgsfield**: `generate_3d` a partir de `hero-fuente`; flota en la portada o en una estación (`capitulos[i].modelo3d`) |
| `social` | `social` | 16:9 → se recorta a 1200×630 | imagen al compartir el enlace |

Cada entrada en `estado.json → visuales`:
```json
{ "id": "textura", "tipo": "textura", "capitulo": null, "indice": null, "prompt": "…", "proveedor": "higgsfield", "modelo": "z_image", "parametros": {}, "aspect_ratio": "1:1", "estado": "planificado", "job_id": null, "url": null, "archivo": "assets/textura.webp", "coste_estimado": 0.15 }
```
Guarda también `estado.proveedor`, `estado.higgsfield.preset` (el preset elegido, con cualquier proveedor), y `estado.coste_total_estimado` (indicando la moneda: créditos de Higgsfield o de Coverr).

### Cómo escribir los prompts (reglas duras)
- **En inglés.** Una sola idea clara por imagen. Incluye siempre la metáfora, el estilo (cinematic, volumetric light…) y la paleta en palabras («deep navy, electric cyan, violet accents»).
- **Sin nombres de marcas, logos, texto ni letras, ni caras o personas reconocibles** (los proveedores los rechazan; Higgsfield como `ip_detected`). Añade al final: `no text, no letters, no logos, no watermark, no recognizable faces`.
- Textura: `seamless tileable surface texture, flat top-down view, even lighting, no perspective, no focal point, no objects, <material en la metáfora>, <paleta>`.
- Capítulo/galería: planos amplios y con aire, composición despejada en el lado donde irá el texto; objetos o ambientes, no retratos.
- Objeto protagonista (`hero-fuente`): `single <objeto> centered, three-quarter view, plain neutral background, studio lighting, sharp, no text` (para que el 3D salga limpio).
- Imagen social: composición centrada que aguante el recorte a 1200×630.
- Un sector sin elementos fotografiables (servicios intangibles): usa la metáfora del arquetipo (abstracto, materiales, luz), no inventes escenas de oficina con gente.

## 5. Cierre de la fase

1. Escribe `web.json` y pásalo por `npm run validar -- <slug>` hasta que no haya errores.
2. Presenta al usuario: arquetipo, metáfora, paleta, tipografías, capítulos (título + tipo + posición) y la tabla de visuales con coste (preset elegido; ofrece también cuánto costaría con los otros presets).
3. `estado.fase = "control1"`. **No sigas sin el sí explícito.**
