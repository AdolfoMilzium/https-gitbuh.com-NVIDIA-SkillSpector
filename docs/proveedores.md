# Proveedores visuales: Higgsfield (principal) y Coverr (alternativa)

Todo lo visual sale de un proveedor de IA generativa conectado por MCP. Hace falta **uno** (si hay los dos, se usa Higgsfield salvo que el usuario pida Coverr). Nunca bancos de imágenes, otros generadores ni fotos de la web de la empresa. La biblioteca de vídeos de stock de Coverr **no se usa**: la web declara «imágenes generadas con IA» y el kit solo trabaja con generación.

## Puerta de entrada (`/empezar` y `/crear-web`, siempre lo primero)

1. Llama a `balance` (Higgsfield). Si responde → proveedor **higgsfield**. (Si además quieres comprobar Coverr, `get_account_status`.)
2. Si no responde, llama a `get_account_status` (Coverr). Si responde → pregunta con AskUserQuestion: «Higgsfield no está conectado, pero Coverr sí. ¿Seguimos con Coverr (no genera modelos 3D) o prefieres conectar Higgsfield?». Proveedor = lo que elija.
3. Si no responde ninguno → el kit se **para** y guía (esperando confirmación en cada paso):
   - **Higgsfield (recomendado):** 1) «Créala gratis con este enlace: {`afiliados.higgsfield`} . Ábrelo y regístrate en ese mismo navegador, sin cerrar la pestaña.» 2) «Ahora conéctala: escribe /mcp, elige higgsfield y pulsa Authenticate.» 3) Volver a llamar a `balance`.
   - **Coverr (alternativa):** 1) Cuenta en https://coverr.co con una suscripción que incluya créditos (sin ella no se puede generar). 2) Obtener la **clave de API** en su cuenta (guía: https://api.coverr.co/docs/mcp/). 3) El usuario ejecuta él mismo, en una terminal normal (no en el chat; la clave no se pega aquí): `claude mcp add --transport http --scope local coverr https://mcp.coverr.co/mcp --header "x-coverr-api-key: PEGA_AQUÍ_TU_CLAVE"`, y reinicia Claude Code. 4) Volver a llamar a `get_account_status`.
   - Hasta que un proveedor responda, **no se avanza a ninguna otra fase**.
4. Guarda `estado.json → proveedor` (`"higgsfield"` | `"coverr"`) y el saldo que devuelva.

El enlace de Higgsfield sale siempre de `marca.config.json → afiliados.higgsfield`, tal cual. El de Coverr es normal (no de afiliado). El aviso «#publicidad» se refiere a Higgsfield y Hostinger.

## Diferencias que importan

| | Higgsfield | Coverr |
|---|---|---|
| Imágenes (textura, capítulos, galería, social) | sí | sí |
| Vídeos en bucle para los paneles | sí | sí |
| **Modelo 3D (GLB)** | sí (`generate_3d`) | **no** → la portada va con panel, sin objeto 3D |
| Cotizar sin gastar | `estimate_*` y `get_cost` | no hay herramienta: se calcula con `pricePerUnit` y `featurePrices` de `get_ai_model` |
| Lotes | `generate_image_batch` (12) + `jobs_wait` | una llamada por visual, hasta `parallelLimit` en paralelo (6) + `wait_*_generation` |
| Referencias | `job_id` de otra generación | **URL** pública (`promptImage`, `imageUrls`) |
| Identificador del trabajo | `job_id` | `taskId` (se guarda igualmente en `job_id`) |
| Moneda | créditos de Higgsfield | créditos de Coverr (no equivalen) |
| Proyecto por empresa | `create_project` + `folder_id` | no hace falta |

## Cómo se registra en `estado.json`
`proveedor` a nivel de proyecto; en cada visual, `job_id` = id/taskId del proveedor. Es lo que evita pagar dos veces al reintentar, con cualquiera de los dos.
