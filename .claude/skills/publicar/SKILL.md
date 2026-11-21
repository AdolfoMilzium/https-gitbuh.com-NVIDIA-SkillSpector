---
name: publicar
description: Sube la web a Hostinger (una web por empresa, en un subdominio temporal gratuito, desplegada con un zip) usando el MCP de Hostinger. Solo la invoca el usuario.
disable-model-invocation: true
argument-hint: [slug]
---

# /publicar · Subir a Hostinger

Español sencillo. **Publicar es una acción externa: confirma con el usuario antes de crear el sitio y antes de desplegar.**

## 0. Comprobaciones
- Proyecto = argumento o `.proyecto-actual`. `estado.aprobaciones.control2` debe ser `true`; si no, pídele antes el visto bueno de la web (`npm run ver -- <slug>`).
- Si el creador no está configurado en `marca.config.json`, lanza antes `empezar`.

## 1. ¿Tiene hosting?
Pregunta si ya tiene un hosting de Hostinger. Si no, muestra **una sola vez en el flujo**:
- Enlace: `marca.config.json → afiliados.hostinger`. Ruta en la web: **Productos → Hosting → Hosting web**.
- Recomienda el plan **Unlimited**: el plan Premium solo admite 3 webs y aquí se crea una web por empresa.
- Aviso «#publicidad»: son enlaces de afiliado; el creador del kit puede recibir una comisión sin coste extra para el usuario.

## 2. Con el MCP de Hostinger (`https://mcp.hostinger.com`, herramientas `search` y `execute`)
Si no está conectado: `/mcp` → hostinger → Authenticate (si no hay forma, pasa al plan B).
1. `search` para descubrir las operaciones necesarias (listar/crear sitios web de hosting, subdominio temporal gratuito, desplegar un sitio estático desde un archivo comprimido). **No asumas nombres de endpoints: búscalos.**
2. Crea **una web de Hostinger por empresa** (nombre = slug) en un **subdominio temporal gratuito**. Antes de crear, enséñale al usuario qué vas a crear y pide confirmación.
3. Con la URL pública, reconstruye con la dirección real (para la imagen al compartir): `npm run construir -- <slug> --url https://…` y empaqueta: `npm run empaquetar -- <slug>` → `proyectos/<slug>/<slug>.zip`.
4. Despliega el zip con `execute` (confirmación previa). El `index.html` queda en la raíz y se sube el `.htaccess`.
5. Verifica: abre la URL, comprueba que responde 200, que carga el 3D y que la cabecera `X-Robots-Tag: noindex` está (`curl -sI`). Guarda en `estado.publicacion` {sitio, dominio, url} y `fase = "publicacion"`.
6. Dale la URL y ofrece `/contactar`.

## 3. Plan B manual (hPanel)
`npm run empaquetar -- <slug>` y guía paso a paso: hPanel → **Sitios web** → añadir sitio web (subdominio temporal) → **Administrador de archivos** → carpeta `public_html` → vaciar lo que haya → subir `<slug>.zip` → **Extraer** → comprobar que `index.html` y `.htaccess` están dentro de `public_html` (no en una subcarpeta) → abrir la URL.

## Reglas
- Todo es provisional: la web tiene `noindex` y el aviso de concepto no oficial. No conectes dominios propios de la empresa.
- No pidas ni guardes contraseñas en el chat.
