# Kit de webs inmersivas 3D · para Claude Code (marca blanca)

Convierte la web pública de cualquier empresa en una **web inmersiva en 3D**: al hacer scroll se viaja por un túnel con la temática de la empresa y su información aparece capítulo a capítulo con efectos espectaculares. Sirve para **prospectar**: la web se le regala a la empresa como propuesta.

Todo se maneja desde Claude Code, en español, sin tocar código. Escribes `/crear-web https://la-empresa.com` y el kit lee la web, propone el diseño, te enseña lo que costará y, cuando dices que sí, genera las imágenes y construye la web.

---

## 1. Requisito obligatorio: un proveedor visual (Higgsfield, o Coverr como alternativa)

> **Este kit NO funciona sin un proveedor de IA generativa conectado.** De él sale TODO lo visual: la textura de las paredes del túnel, las imágenes de cada capítulo y de la galería, los vídeos en bucle, el modelo 3D protagonista y la imagen para compartir el enlace. El código solo monta la escena.

### Opción recomendada: Higgsfield

1. **Crea tu cuenta (gratis)** con este enlace, en el mismo navegador y sin cerrar la pestaña:
   **https://higgsfield.ai/s/higgsfield-mcp-general-yt-juanpe-divisual-gKRvLj**
2. **Conéctala a Claude Code:** escribe `/mcp`, elige `higgsfield` y pulsa **Authenticate**.
3. El kit lo comprueba solo con la herramienta `balance`. Hasta que responda, no avanza.

**Créditos gratis.** Higgsfield ofrece a veces pruebas gratuitas del MCP. El kit te enseña la oferta *real* que haya en ese momento (no se promete ninguna cantidad). Ojo: las pruebas **se renuevan solas como plan de pago si no se cancelan** y suelen pedir tarjeta; en Claude Code puedes decir «cancelar renovación».

### Alternativa: Coverr ([coverr.co](https://coverr.co))

Sirve para generar imágenes y vídeos, **pero no genera modelos 3D**: con Coverr la portada lleva un panel de imagen en lugar del objeto 3D flotante (para ese objeto necesitas Higgsfield).

1. Cuenta en [coverr.co](https://coverr.co) con una **suscripción que incluya créditos** (sin ella no se puede generar).
2. Saca tu **clave de API** en tu cuenta (guía: [api.coverr.co/docs/mcp](https://api.coverr.co/docs/mcp/)).
3. En una terminal normal (no pegues la clave en el chat), ejecuta una vez:
   `claude mcp add --transport http --scope local coverr https://mcp.coverr.co/mcp --header "x-coverr-api-key: PEGA_AQUÍ_TU_CLAVE"` y reinicia Claude Code.
4. El kit lo comprueba con `get_account_status`. Si Higgsfield no responde pero Coverr sí, te pregunta con cuál seguir.

Solo se usa la **generación con IA** de Coverr (no su biblioteca de vídeos de stock), para que el aviso «imágenes generadas con IA» de la web siga siendo cierto. Los créditos de Coverr y de Higgsfield **no equivalen**. Más detalle: [`docs/proveedores.md`](docs/proveedores.md).

> **#publicidad** — Los enlaces de Higgsfield y Hostinger de este kit son enlaces de afiliado: el creador del kit puede recibir una comisión si te das de alta a través de ellos, sin coste extra para ti.

## 2. Lo que necesitas

| Qué | Para qué | Dónde |
|---|---|---|
| **Higgsfield** (cuenta + créditos) **o Coverr** (suscripción + clave de API) | Todo lo visual | enlaces de arriba |
| **Claude Code** | Manejar el kit en español | claude.com/claude-code |
| **Node.js 18.18 o superior** | Motor y scripts | nodejs.org |
| **Git** | Descargar el kit | git-scm.com |
| ffmpeg *(opcional)* | Solo para los vídeos del preset premium | macOS: `brew install ffmpeg` · Windows: `winget install ffmpeg` |
| **Hostinger** *(solo para publicar)* | Alojar las webs | enlace en el apartado 6 |

## 3. Instalación

```bash
git clone <la dirección de este repositorio> kit-webs-inmersivas
cd kit-webs-inmersivas
npm install
npx playwright install chromium
claude
```

Dentro de Claude Code escribe **`/empezar`**: comprueba Higgsfield, explica la prueba gratuita, comprueba que todo está instalado y te pregunta con qué nombre firmarás las propuestas (ese nombre es lo único que aparece como crédito en las webs; la marca del autor del kit no aparece nunca).

¿Quieres enseñar la web sin instalar nada? `npm run unico -- <proyecto>` la guarda en **un solo archivo** (`proyectos/<proyecto>/<proyecto>-unico.html`, con todo incrustado) que se abre con doble clic en cualquier navegador y se puede mandar por email o WhatsApp.

¿Solo quieres ver cómo queda? `npm run demo` abre la web de demostración (una empresa ficticia). **No gasta créditos**: los paneles se muestran como vista previa.

## 4. Cómo se usa

| Orden | Qué hace |
|---|---|
| `/empezar` | Puesta a punto (una vez) |
| `/crear-web <url>` | Todo el proceso: lectura → dirección de arte → **tu sí al gasto** → imágenes → construcción → **tu visto bueno** |
| `/publicar` | Sube la web a Hostinger |
| `/contactar` | Guion de llamada, carta con QR y email (solo tras tener permiso) |

Cada empresa tiene su carpeta `proyectos/<nombre>/` con un `estado.json`, así que puedes parar y retomar en cualquier fase sin pagar dos veces.

**Dos controles obligatorios:** (1) no se gasta ni un crédito sin tu sí explícito, con el coste cotizado antes; (2) no se da por buena la web sin tu visto bueno. Nada se publica sin que lo pidas.

## 5. Costes (orientativos)

**Higgsfield** — precios consultados en vivo el 21-11-2026; cambian, así que `/crear-web` vuelve a cotizar siempre antes de gastar.

| Preset | Qué incluye | Modelo de imagen (créditos/imagen) | Ejemplo para una web de 7 capítulos* |
|---|---|---|---|
| **prueba** | solo imágenes, el modelo más barato | `z_image` (0,15) | **≈ 2 créditos** |
| **estándar** | mejor calidad + modelo 3D | `seedream_5_0_flash` 2k (0,5) + 3D `tripo_h3_1` (≈ 9) | ≈ 15 créditos |
| **premium** | + vídeos en bucle en los paneles | `nano_banana_2` 2k (2) + vídeo `seedance_2_0_mini` 5 s (≈ 5 por clip) + 3D | ≈ 55 créditos con 4 vídeos |

\* ≈ 1 textura + 6 imágenes de capítulo + 3 de galería + imagen social (+ imagen del objeto 3D). Los presets se editan en `marca.config.json`.

**Coverr** — precios de lista consultados el 21-11-2026, en créditos de Coverr (no hay cotizador: el kit los calcula con la ficha de cada modelo y calibra con la primera imagen):

| Preset | Imagen | Por imagen | Ejemplo web de 7 capítulos* |
|---|---|---|---|
| **prueba** | `seedream-5-0-flash` | 200 | ≈ 2.200 créditos |
| **estándar** | `kling-image-o3` 2K | 400 | ≈ 4.400 créditos |
| **premium** | `kling-image-o3` 2K + vídeo `grok-imagine-video-1.5-lite` 720p | 400 + ≈ 1.000 por clip de 5 s (el vídeo se cobra por segundo) | ≈ 8.400 créditos con 4 clips |

Sin modelo 3D en ningún preset de Coverr.

**Hostinger** — recomendado el plan **Unlimited** (el plan Premium solo admite 3 webs y aquí se crea una web por empresa). Ruta: *Productos → Hosting → Hosting web*. Cada propuesta se publica en un subdominio temporal gratuito.

**Claude Code** — según tu suscripción o uso de la API.

## 6. Publicar en Hostinger

Alta (si aún no tienes hosting): **https://www.hostinger.com/juanpe** → *Productos → Hosting → Hosting web* → plan **Unlimited**.

`/publicar` usa el MCP de Hostinger (`https://mcp.hostinger.com`, declarado en `.mcp.json`; conéctalo con `/mcp`). Si algo falla, **plan B manual**: `npm run empaquetar -- <nombre>` crea un `.zip`; en hPanel → *Administrador de archivos* → `public_html` → sube el zip y pulsa *Extraer*.

## 7. Qué lleva cada web

- Túnel 3D en tiempo real con 5 arquetipos (neón, orgánico, arquitectónico, industrial, cósmico) y una semilla para que cada web sea distinta, con los colores y tipografías de la marca.
- La cámara se frena en cada capítulo para que dé tiempo a leer; «luz al final del túnel» en el cierre.
- Texto en HTML semántico (SEO, accesibilidad, legible sin JavaScript), versión móvil con el texto abajo, calidad adaptativa y respeto de «reducir movimiento».
- Salida estática para hosting compartido: `.htaccess` (tipos MIME incluidos `.glb` y `.mp4`, caché, `X-Robots-Tag: noindex`), `meta robots noindex` y aviso visible *«concepto no oficial · imágenes generadas con IA»*.

## 8. Modo «túnel de vídeo» (con tu propio clip)

Por defecto el túnel es 3D en tiempo real. Si ya tienes un clip de túnel (por ejemplo uno generado con Higgsfield o Coverr, o uno tuyo), la web puede usarlo como túnel: **el scroll recorre el clip hacia delante y hacia atrás**, se frena en cada capítulo (con una ligera «respiración» para que no quede congelado) y mantiene el texto animado, el menú lateral, el desenfoque del lado del texto, el grano y la luz final.

```bash
npm run video -- <proyecto> <ruta-del-clip.mp4>      # opcional: --tinte=0.7 (0 = colores del clip, 1 = colores de la marca)
```

Lo optimiza (sin audio, 24 fps, MP4 + WebM de reserva, ~5 MB), saca un póster, te propone los colores del clip y deja `escenario.modo = "video"` en `web.json`. Mejor con clips **verticales o cuadrados** (en pantalla apaisada el túnel se muestra entero y se desplaza hacia el lado libre de texto; en móvil ocupa toda la pantalla). En este modo no se usan imágenes, galería ni objeto 3D, así que **no hay que generar nada con IA**. Ejemplo incluido: `proyectos/milzium` (`npm run dev -- milzium`).

## 9. Reglas legales y de contenido

- **Email comercial no solicitado:** en España (LSSI, art. 21) y Andorra (Llei 20/2014, art. 19) está prohibido **también a empresas**. `/contactar` prepara un guion de llamada, una carta A4 con QR y un email para enviar **solo después de tener permiso** (con identificación, opción de baja y, en Andorra, «Comunicació comercial»). **El kit nunca envía emails.**
- Textos **reescritos y sin datos inventados**: cifras y citas solo si existen en la web de la empresa.
- Las fotos de la web de la empresa **no se reutilizan** (salvo permiso expreso del dueño); lo visual sale de Higgsfield. El **logo real** se coloca, nunca se genera.
- La lectura de webs respeta `robots.txt`.

## 10. Comandos técnicos

`npm run extraer -- <url>` · `validar` · `dev` · `construir` · `capturas` · `ver` · `descargar` · `video` · `unico` · `empaquetar` · `contactar` · `preflight`, todos con `-- <nombre-del-proyecto>`. Cómo funciona el motor: [`docs/motor.md`](docs/motor.md).

## 11. Personalizar (marca blanca)

Todo vive en `marca.config.json`: tu nombre como creador (lo rellena `/empezar`), los textos de aviso y créditos y los presets de generación. **No cambies los enlaces de `afiliados`.**
