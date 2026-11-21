---
name: contactar
description: Prepara el contacto legal con la empresa: guion de llamada, carta A4 con QR a la web y email para enviar solo después de tener permiso. Nunca envía emails. Úsala cuando el usuario escriba /contactar o pida acercarse a la empresa.
argument-hint: [slug]
---

# /contactar · Contacto legal con la empresa

La web se le **regala a la empresa como propuesta**. Antes de nada, explica la regla legal en 3 líneas:

> En España (LSSI, art. 21) y en Andorra (Llei 20/2014, art. 19) está **prohibido el email comercial no solicitado, también a empresas**. Por eso el primer contacto es por **teléfono o carta postal / en mano**, y el email solo se envía **después de tener permiso**.

**Nunca envíes emails tú** (no uses herramientas de Gmail ni similares para enviar). Solo redactas borradores en archivos.

## Qué generas en `proyectos/<slug>/contacto/`

Necesitas: URL publicada de la web (`estado.publicacion.url`; si no hay, pide la URL o lanza `/publicar`), datos de la empresa (`empresa.json`) y del creador (`marca.config.json → creador`; si está vacío, `empezar`). Pregunta el país (ES / AD) para el pie legal.

1. **`guion-llamada.md`** — guion de 60–90 s: quién eres, por qué llamas (has hecho, por tu cuenta y sin compromiso, una propuesta de web inmersiva con su información), qué pides (permiso para enviarles el enlace por email o que lo vean en pantalla), cómo responder a «no me interesa», «mándame algo» y «¿cuánto cuesta?». Tono cercano, sin presión. Usa una cifra o frase real de su web como gancho (con la fuente).
2. **`carta.json` → `carta.pdf`** — redacta `carta.json` (`destinatario{nombre,cargo,empresa,direccion}`, `asunto`, `saludo`, `parrafos[]` (3–4, cortos), `texto_qr`, `despedida`, `pie`) y ejecuta `npm run contactar -- <slug> --url <URL publicada>`: genera `carta.html`, `carta.pdf` (A4) y `qr.png`. Sin datos inventados. Aclara que es una propuesta de cortesía, no un trabajo contratado, y que el aviso «concepto no oficial · imágenes generadas con IA» es intencionado.
3. **`email-tras-permiso.md`** — borrador para usar **solo si la empresa ha dado permiso** (por teléfono o por escrito). Debe llevar: identificación del remitente (nombre, y datos de contacto reales), el enlace a la web, **una opción clara de baja** («si no quieres recibir más comunicaciones, responde “baja”»), y, si es Andorra, **«Comunicació comercial»** al inicio del asunto. Cabecera visible en el archivo: «NO ENVIAR SIN PERMISO PREVIO».
4. Resume al usuario qué hacer, en orden: llamar → (si hay permiso) email; o carta por correo/en mano. Actualiza `estado.fase = "contacto"`.

No inventes nombres de personas de la empresa; si no los conoces, dirige la carta «A la atención de la dirección».
