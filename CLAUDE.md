# Kit de webs inmersivas 3D (marca blanca)

Convierte la web pública de una empresa en una **web inmersiva 3D**: al hacer scroll se viaja por un túnel con la temática de la empresa y su información aparece capítulo a capítulo. Sirve para prospectar: la web se le regala a la empresa como propuesta. Habla siempre en español sencillo; quien usa el kit no es técnico.

## Regla nº 1
**Sin un proveedor visual conectado no se hace nada.** Todo lo visual sale de un MCP de IA generativa: **Higgsfield** (principal, `.mcp.json`) o **Coverr** (alternativa; genera imágenes y vídeos, **no modelos 3D**). `/empezar` y `/crear-web` llaman a `balance` (Higgsfield) antes que nada; si no responde, prueban `get_account_status` (Coverr); si ninguno responde, se para y se guía: crear cuenta con `marca.config.json → afiliados.higgsfield` (enlace tal cual) → `/mcp` → higgsfield → Authenticate → volver a llamar a `balance` (o los pasos de Coverr de `docs/proveedores.md`). El proveedor elegido va en `estado.json → proveedor`.

## Flujo
`/empezar` (una vez) → `/crear-web <url>` → lectura (`extraer-web`) → dirección de arte (`direccion-arte`) → **CONTROL 1** (sin un sí explícito no se gasta nada) → generación (`generar-visuales`) → construcción y revisión (`construir-web`) → **CONTROL 2** (visto bueno) → `/publicar` (Hostinger) → `/contactar` (contacto legal).
Cada empresa: `proyectos/<slug>/` con `estado.json` (fase y `job_id`s para retomar), `empresa.json`, `contenido/web.json` y `assets/`.

## Reglas
- No gastes créditos ni publiques sin permiso explícito. Cotiza antes (Higgsfield: `estimate_*`, `get_cost`; Coverr: cálculo con `get_ai_model`).
- Guarda cada `job_id` (o `taskId` de Coverr) en `estado.json` nada más lanzarlo; no pagues dos veces al reintentar. Los créditos de Higgsfield y de Coverr no equivalen.
- Visuales solo del proveedor elegido, por generación con IA (nada de bancos de imágenes —tampoco los vídeos de stock de Coverr—, otras IA ni fotos de la empresa sin permiso). El logo real se coloca, nunca se genera. Prompts en inglés, sin marcas, logos, texto ni caras reconocibles.
- Textos reescritos, sin datos inventados; cifras y citas solo si existen en la web (con `origen`).
- Nunca envíes emails de prospección (LSSI art. 21 / Llei 20/2014 art. 19): solo borradores.
- Las webs generadas no muestran la marca del autor del kit; solo el crédito del creador (`marca.config.json`).
- Los enlaces de afiliado salen de `marca.config.json`; avisa «#publicidad» una vez por flujo.

## Comandos (`npm run <x> -- <slug>`)
`extraer -- <url>` · `validar` · `dev` · `construir` · `capturas` · `ver` · `descargar` · `video -- <slug> <clip>` · `unico -- <slug>` (un solo archivo .html para enseñar la web) · `empaquetar` · `contactar -- <slug> --url …` · `preflight`. `npm run demo` abre la demo (no gasta créditos).

## Motor (`motor/src`)
Vite + Three.js (WebGL2) + GSAP (SplitText, ScrambleText) + Lenis, en un único bucle (ticker de GSAP). El túnel es 3D en tiempo real; **única excepción**, pedida por el usuario: el modo `escenario.modo = "video"`, donde un clip aportado por él hace de túnel y el scroll lo recorre (`npm run video`). No cambies estas decisiones técnicas sin consultarlo. Detalles: `docs/motor.md`.
