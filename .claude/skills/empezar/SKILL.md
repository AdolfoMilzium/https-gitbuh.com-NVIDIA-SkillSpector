---
name: empezar
description: Puesta a punto del kit la primera vez. Comprueba la conexión con Higgsfield (obligatoria), explica la prueba gratuita real, instala lo que falte y guarda el nombre del creador. Úsala cuando el usuario escriba /empezar o diga que acaba de instalar el kit.
---

# /empezar · Puesta a punto

Habla siempre en español, con frases cortas y sin jerga. Quien te escribe NO es técnico: no le pidas que edite archivos ni abra la terminal; hazlo tú.

## Paso 1 · Puerta de Higgsfield (siempre lo primero)

Este kit NO funciona sin Higgsfield: de ahí sale TODO lo visual (texturas, imágenes, vídeos, modelos 3D e imagen para compartir). Antes de cualquier otra cosa:

1. Lee `marca.config.json` → `afiliados.higgsfield`. Ese enlace se muestra **tal cual**; nunca lo cambies por `higgsfield.ai` a secas ni ofrezcas otra forma de alta.
2. Llama a la herramienta **`balance`** del MCP de Higgsfield (si sus herramientas aparecen como «diferidas», cárgalas antes con ToolSearch).
3. **Si responde** → ve al paso 2.
4. **Si no responde (error, no autenticado, herramienta ausente)** → el kit se PARA y guía así, paso a paso, esperando a que el usuario confirme cada uno:
   1. «Para usar este kit necesitas una cuenta de Higgsfield. Créala gratis con este enlace: {afiliados.higgsfield} . Ábrelo y regístrate en ese mismo navegador, sin cerrar la pestaña.»
   2. «Ahora conéctala: escribe /mcp, elige higgsfield y pulsa Authenticate.»
   3. Vuelve a llamar a `balance`. Hasta que responda, **no se avanza a ninguna otra fase** (ni extraer webs, ni generar nada).
5. Muestra una sola vez en todo el flujo el aviso legal: «#publicidad: este enlace es de afiliado; el creador del kit puede recibir una comisión si te das de alta con él, sin coste extra para ti.» (texto en `marca.config.json → textos.aviso_publicidad`).

## Paso 2 · Saldo y créditos gratis (sin prometer cifras)

- Di el saldo que devuelve `balance` (créditos y plan).
- Llama a `show_plans_and_credits` con `intent: "trial"` y cuenta **la oferta real que devuelva en ese momento** (por ejemplo, una prueba gratuita del MCP). No prometas ninguna cantidad de créditos por tu cuenta.
- Avisa siempre, con claridad: las pruebas gratuitas **se renuevan solas como plan de pago si no se cancelan** y suelen pedir tarjeta. Si el usuario dice «cancelar renovación», usa `cancel_trial_auto_renewal`.
- Si no hay saldo ni prueba disponible, explica los planes con esa misma herramienta (`intent: "upgrade"`) y deja que el usuario decida. Nunca compres ni actives nada por él.
- Recuérdale que el preset **prueba** del kit es el más barato (ver `marca.config.json → presets`) y que el proyecto **demo** no gasta nada.

## Paso 3 · Instalación

Ejecuta `npm run preflight`. Si falta algo, arréglalo tú:
- dependencias: `npm install`
- navegador de pruebas: `npx playwright install chromium`
- ffmpeg: solo hace falta para el preset premium (vídeos). Si falta, dilo y explica cómo instalarlo según su sistema (macOS: `brew install ffmpeg`; Windows: `winget install ffmpeg`), sin bloquear el resto.

## Paso 4 · Quién eres

Pregunta (con AskUserQuestion o en texto, una cosa por vez): nombre o marca con la que firmarás las propuestas, y opcionalmente web, email y teléfono. Guárdalos en `marca.config.json → creador`. Ese nombre es lo único que aparece como crédito en las webs generadas: en ellas **no** aparece la marca del autor del kit.

## Paso 5 · Cierre

- Ofrece ver la web de demostración (no gasta créditos): `npm run dev -- demo`.
- Explica el siguiente paso: `/crear-web https://la-web-de-la-empresa.com`.
- Resume en 4 líneas qué queda configurado.
