---
name: construir-web
description: Construye la web, la revisa con capturas automáticas de escritorio y móvil, corrige hasta que se vea bien y la abre en local para el visto bueno. Skill interna que usa /crear-web.
user-invocable: false
---

# Construir y revisar

Bucle (máximo 4 vueltas antes de consultar al usuario):

1. `npm run validar -- <slug>` → corrige errores (los avisos se leen y se valoran).
2. `npm run construir -- <slug>` → genera `proyectos/<slug>/dist`.
3. `npm run capturas -- <slug>` → saca capturas de escritorio (1440×900) y móvil (390×844) y las **hojas de contacto** `capturas/hoja-escritorio.jpg` y `hoja-movil.jpg`. Usa `--cap=3,5` para repetir solo algunos capítulos y `--solo=movil` para una vista.
4. **Mira las hojas con Read** (y las capturas sueltas que dudes). Revisa esta lista y corrige lo que falle:

   - [ ] El texto se lee (contraste, nada de texto sobre zonas muy brillantes). El script avisa si algún texto no cabe o hay scroll horizontal.
   - [ ] Los paneles 3D **nunca tapan el texto**: van en la mitad libre; en capítulos centrados van por encima. La galería se reparte en su tramo sin invadir el capítulo siguiente.
   - [ ] La portada cabe en pantallas de 800 px de alto; el menú lateral no choca con el texto.
   - [ ] En móvil el texto va abajo y legible; paneles arriba.
   - [ ] La luz del final no lava la pantalla y el texto del cierre se lee.
   - [ ] Con un acento muy luminoso, el bloom no emborrona (el motor lo ajusta; si ves saturación, baja `escenario.bloom` a 0.6–0.8).
   - [ ] Cifras con separador de miles, sin cortes en los números grandes.
   - [ ] Las imágenes de Higgsfield encajan con la metáfora; el logo real está en la cabecera (nunca generado).
   - [ ] Consola del navegador sin errores (el script los lista).
   - [ ] Aviso «concepto no oficial · imágenes generadas con IA» visible y crédito del creador (si lo hay).

   Qué tocar: casi todo se arregla en `contenido/web.json` (textos más cortos, `posicion`, `escenario.bloom`, `semilla`, colores). Si es un fallo del **motor** (`motor/src/*`), arréglalo allí, reconstruye y vuelve a mirar.
5. Cuando todo esté bien: `npm run ver -- <slug>` abre la web en local (`http://127.0.0.1:4173`). Dile cómo usarla (scroll, menú lateral) y pasa al CONTROL 2 en `crear-web`.

Notas del motor: calidad adaptativa (si bajan los fps baja la resolución y luego se quita el bloom), respeta `prefers-reduced-motion`, solo se reproduce un vídeo a la vez, y sin JavaScript la web sigue siendo legible (HTML semántico). Plan B si el equipo no tiene WebGL: se muestra la versión de texto.
