---
name: extraer-web
description: Lee la web pública de una empresa con el script local (Playwright) y resume lo que hay en empresa.json sin inventar nada. Skill interna que usa /crear-web.
user-invocable: false
---

# Extraer la web de la empresa

1. Ejecuta `npm run extraer -- <url> [slug]`. El script respeta `robots.txt` (si lo prohíbe, se detiene: díselo al usuario y no busques rodeos), cierra banners de cookies, lee hasta 6 páginas, hace capturas y saca colores ponderados por uso, tipografías y logo (con versión clara si es oscuro). **No uses WebFetch.**
2. Mira las capturas `proyectos/<slug>/extraccion/home-escritorio.png` y `home-movil.png` con Read para entender el sector, el tono y el aspecto de la marca.
3. Lee `proyectos/<slug>/empresa.json` y `extraccion/resultado.json`. Completa `empresa.json` añadiendo, **solo con lo que aparece en esos textos**:
   - `resumen`: 2–3 frases de qué hace la empresa (con tus palabras).
   - `servicios`: lista corta (título + frase), cada uno con `fuente` (URL de la página).
   - `cifras_verificadas`: números concretos que figuren en la web (años de experiencia, clientes, etc.), cada uno con `texto_original` y `fuente`.
   - `citas_verificadas`: opiniones o testimonios publicados, con autor si lo hay y `fuente`.
   - `tono`: tres adjetivos que describan cómo escribe la marca.
   - `huecos`: lo que NO se encontró (teléfono, dirección, logo…). **No lo rellenes.**
4. Revisa los teléfonos/emails detectados: descarta falsos positivos; no inventes contactos.
5. Comprueba el logo (`assets/logo.png`, `assets/logo-claro.png`). Si falta o es solo un icono, anótalo en `huecos` (hay que pedirlo a la empresa; **nunca generarlo**).
6. Pasa `estado.fase` a `direccion_arte` y resume al usuario en 5 líneas lo que has entendido de la empresa, preguntando si falta algo importante.

Las fotos de la web de la empresa **no se reutilizan** salvo permiso expreso del dueño.
