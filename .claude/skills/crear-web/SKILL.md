---
name: crear-web
description: Orquesta todo el proceso: lee la web pública de una empresa y la convierte en una web inmersiva 3D con túnel (Higgsfield, o Coverr como alternativa, para lo visual). Úsala cuando el usuario escriba /crear-web <url> o pida convertir la web de una empresa en una experiencia 3D.
argument-hint: <url de la empresa>
---

# /crear-web <url> · Orquestador

Eres el director del proceso. Habla en español sencillo. **No gastes créditos ni publiques nada sin un sí explícito del usuario.**

## Fase 0 · Puerta del proveedor visual (obligatoria)

Llama a `balance` del MCP de Higgsfield **antes de nada**. Si no responde, prueba `get_account_status` de Coverr (alternativa: no genera 3D). Si ninguno responde, detén todo y sigue la guía de `docs/proveedores.md` y de la skill `empezar` (paso 1): enlace de alta de Higgsfield desde `marca.config.json → afiliados.higgsfield` mostrado tal cual, luego `/mcp` → higgsfield → Authenticate, y volver a llamar a `balance` (o los pasos de Coverr). Hasta que un proveedor responda no se avanza. Guarda `estado.json → proveedor`.
Después: `npm run preflight`. Si el creador está vacío en `marca.config.json`, lanza antes la skill `empezar`.

## Retomar

Cada empresa tiene `proyectos/<slug>/estado.json` con su `fase` (`extraccion`, `direccion_arte`, `control1`, `generacion`, `construccion`, `control2`, `publicacion`, `contacto`). Si el usuario da una URL que ya tiene proyecto, o dice «sigue con…», lee ese archivo y **continúa desde esa fase** (confirmando en una línea). Actualiza `fase` al terminar cada una. `echo <slug> > .proyecto-actual` deja el proyecto activo.

## Fases

1. **Lectura** → invoca la skill interna `extraer-web` con la URL. Resultado: `empresa.json`.
2. **Dirección de arte** → invoca `direccion-arte`. Resultado: `contenido/web.json` (arquetipo, paleta, tipografías, 6–8 capítulos con textos reescritos) y el **plan de visuales de Higgsfield con su coste** en `estado.json`.
   Después construye la **vista previa sin imágenes**: `npm run construir -- <slug>` y `npm run capturas -- <slug>`; mira las hojas de contacto (`proyectos/<slug>/capturas/hoja-*.jpg`) y enséñaselas; abre la web con `npm run ver -- <slug>`.
3. **CONTROL 1 · permiso de gasto.** Presenta: arquetipo y metáfora, capítulos, preset elegido, **tabla de visuales con su coste en créditos (cotizado en vivo, sin gastar)**, total y saldo actual. Pregunta con AskUserQuestion: «Sí, genera los visuales» / «Quiero ajustar algo» / «Parar aquí». **Sin un sí explícito no se llama a ninguna herramienta de generación.** Al aprobar: `estado.aprobaciones.control1 = true`, guarda el total aprobado.
4. **Generación** → invoca `generar-visuales` (solo hasta el total aprobado). Termina con `npm run descargar -- <slug>`.
5. **Construcción y revisión** → invoca `construir-web` (build, capturas de escritorio y móvil, correcciones hasta que se vea bien, abrir en local).
6. **CONTROL 2 · visto bueno.** Enséñale la web local y las hojas de contacto. Pregunta si le gusta o qué cambiar. Itera. Al aprobar: `aprobaciones.control2 = true`.
7. **Siguientes pasos** (nunca los ejecutes sin que los pida): `/publicar` sube la web a Hostinger; `/contactar` prepara el contacto legal con la empresa.

## Reglas que no se rompen

- **Sin un proveedor visual conectado (Higgsfield o Coverr) no se hace nada.**
- Todo lo visual sale del proveedor elegido (Higgsfield o Coverr, generación con IA). Nada de bancos de imágenes (tampoco los vídeos de stock de Coverr), otros generadores de IA ni fotos de la web de la empresa (salvo permiso expreso del dueño). El **logo real** se coloca en la web, jamás se genera.
- Textos **reescritos**, sin datos inventados. Cifras y citas solo si existen en la web de la empresa (con su `origen`).
- Prompts al proveedor en inglés, sin marcas, logos, texto ni caras reconocibles.
- Guarda cada `job_id` (o `taskId` de Coverr) en `estado.json` nada más lanzarlo; nunca pagues dos veces al reintentar.
- Las webs llevan `noindex` y el aviso «concepto no oficial · imágenes generadas con IA».
- Los enlaces de afiliado (Higgsfield, Hostinger) salen de `marca.config.json`; el aviso «#publicidad» se muestra una vez por flujo.
