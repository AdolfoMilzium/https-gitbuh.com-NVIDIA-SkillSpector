# Kit de webs inmersivas 3D (marca blanca)

Convierte la web pública de una empresa en una **web inmersiva 3D**: al hacer scroll se viaja por un túnel con la temática de la empresa y su información aparece capítulo a capítulo. Sirve para prospectar: la web se le regala a la empresa como propuesta. Habla siempre en español sencillo; quien usa el kit no es técnico.

## Regla nº 1
**Sin Higgsfield conectado no se hace nada.** Todo lo visual sale del MCP de Higgsfield (`.mcp.json`). `/empezar` y `/crear-web` llaman a `balance` antes que nada; si no responde, se para y se guía: crear cuenta con `marca.config.json → afiliados.higgsfield` (enlace tal cual) → `/mcp` → higgsfield → Authenticate → volver a llamar a `balance`.

## Flujo
`/empezar` (una vez) → `/crear-web <url>` → lectura (`extraer-web`) → dirección de arte (`direccion-arte`) → **CONTROL 1** (sin un sí explícito no se gasta nada) → generación (`generar-visuales`) → construcción y revisión (`construir-web`) → **CONTROL 2** (visto bueno) → `/publicar` (Hostinger) → `/contactar` (contacto legal).
Cada empresa: `proyectos/<slug>/` con `estado.json` (fase y `job_id`s para retomar), `empresa.json`, `contenido/web.json` y `assets/`.

## Reglas
- No gastes créditos ni publiques sin permiso explícito. Cotiza antes (`estimate_*`, `get_cost`).
- Guarda cada `job_id` en `estado.json` nada más lanzarlo; no pagues dos veces al reintentar.
- Visuales solo de Higgsfield (nada de bancos de imágenes, otras IA ni fotos de la empresa sin permiso). El logo real se coloca, nunca se genera. Prompts en inglés, sin marcas, logos, texto ni caras reconocibles.
- Textos reescritos, sin datos inventados; cifras y citas solo si existen en la web (con `origen`).
- Nunca envíes emails de prospección (LSSI art. 21 / Llei 20/2014 art. 19): solo borradores.
- Las webs generadas no muestran la marca del autor del kit; solo el crédito del creador (`marca.config.json`).
- Los enlaces de afiliado salen de `marca.config.json`; avisa «#publicidad» una vez por flujo.

## Comandos (`npm run <x> -- <slug>`)
`extraer -- <url>` · `validar` · `dev` · `construir` · `capturas` · `ver` · `descargar` · `empaquetar` · `contactar -- <slug> --url …` · `preflight`. `npm run demo` abre la demo (no gasta créditos).

## Motor (`motor/src`)
Vite + Three.js (WebGL2) + GSAP (SplitText, ScrambleText) + Lenis, en un único bucle (ticker de GSAP). No cambies estas decisiones técnicas sin consultarlo. Detalles: `docs/motor.md`.
