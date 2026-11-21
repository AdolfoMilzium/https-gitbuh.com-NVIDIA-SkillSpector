# Cómo funciona el motor

Un solo motor y cada empresa es **datos**: `proyectos/<slug>/contenido/web.json` + `assets/`. `npm run construir` valida el JSON, genera un HTML semántico (textos legibles sin JavaScript, SEO, accesibilidad) y empaqueta todo con Vite como sitio estático (`base: './'`).

## Piezas (`motor/src`)
- `ruta.js` — recorrido (`CatmullRomCurve3`) por arquetipo y semilla, y el mapa de scroll con **mesetas**: la cámara se frena en cada capítulo y al final queda la luz.
- `paredes.js` — shaders de pared (`neon`, `organico`, `arquitectonico`, `industrial`, `cosmico`) mezclados con la textura de Higgsfield (sin costuras).
- `ambiente.js` — anillos de luz, partículas, líneas de velocidad, luz final (con tope de intensidad).
- `paneles.js` — paneles 3D por capítulo y galería (imagen o vídeo de Higgsfield; vista previa si faltan), objeto GLB protagonista. Se colocan siempre en la mitad libre de la pantalla.
- `post.js` — bloom (ajustado a la luminosidad del acento), desenfoque gaussiano solo del lado del texto, aberración por velocidad, viñeta, grano, **calidad adaptativa**.
- `ui.js` — entrada/salida de textos (SplitText + ScrambleText, nunca `clip-path`), contadores con separador de miles, menú lateral.
- `main.js` — Lenis + GSAP + render en **un único bucle**.

## Variables de marca
Los valores por defecto están en `:where(:root)` (especificidad 0). Los colores y tipografías de la empresa se inyectan en `:root` y siempre ganan.

## Accesibilidad y rendimiento
`prefers-reduced-motion` desactiva parallax, aberración y scramble; móvil con el texto abajo; un solo vídeo reproduciéndose a la vez; fuentes alojadas en la propia web; sin WebGL se muestra la versión de texto.

## Hosting compartido
`dist/` lleva `.htaccess` (tipos MIME incluidos `.glb` y `.mp4`, caché, `X-Robots-Tag: noindex`), `robots.txt` y `meta robots noindex`, más el aviso visible de concepto no oficial.
