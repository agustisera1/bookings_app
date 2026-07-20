# TD-17 — Baseline de accesibilidad

| | |
|---|---|
| **Branch** | `feat/a11y-baseline` |
| **Bloque** | Frontend |
| **Prioridad** | 🟡 Baja |
| **Momento** | Post-deploy |
| **Depende de** | **TD-16** (los boundaries nuevos también necesitan foco y `role`) |
| **Origen** | Re-triage del backlog: el eje de frontend no tenía representación |
| **Repos** | `bookings_app` |

## Problema

No hay ninguna verificación de accesibilidad, y hay lugares concretos donde la app no es operable sin
mouse ni legible con lector de pantalla. Nada de esto rompe en desarrollo — por eso es deuda y no bug.

Lo que ya está bien y **no** hay que rehacer: los primitivos de `ui/` vienen de shadcn/Base UI, que
traen roles y manejo de foco correctos de fábrica. El problema no son los primitivos — es cómo se
componen y los huecos de contenido propio.

Focos concretos, verificados contra el código:

- **El hilo de chat no anuncia mensajes nuevos.** `components/chat/message-thread.tsx` no tiene
  `aria-live`. Un lector de pantalla no se entera de que llegó un mensaje — que es *el* evento de la
  feature.
- **Estados de solo-ícono sin nombre accesible.** El patrón `<span className="sr-only">` existe en
  algunos botones (lo pide el patrón de `ConfirmDialog`) pero no está aplicado de forma pareja.
- **Foco visible.** Verificar que ningún primitivo propio pise el `focus-visible` que traen los de
  `ui/`, y que la navegación por teclado tenga anillo en todos lados.
- **`sign-in` / `sign-up` no asocian error con campo.** Como no usan el patrón `FormField` (ver
  TD-18), los mensajes de error no están atados al input con `aria-describedby`.
- **Contraste.** Los tokens de color están en `oklch`, lo que hace el chequeo fácil de hacer bien —
  pero nunca se hizo. Verificar los pares texto/fondo, sobre todo `muted-foreground`.

## Por qué entra

**Pregunta 3.** Es defendibilidad pura: la accesibilidad es de los primeros lugares donde alguien que
sabe de frontend mira para calibrar si el resto está cuidado. Un chat que no anuncia mensajes es una
señal concreta de que la feature se construyó mirando la pantalla y no el árbol de accesibilidad.

No entra por deploy —la app funciona sin esto— y por eso es 🟡 y post-deploy. Pero para un portfolio,
el techo de calidad que comunica es alto respecto de lo que cuesta.

## Alcance

**1. `aria-live` en el hilo de chat.** La región de mensajes anuncia los que llegan (`polite`).
Distinguir el mensaje propio (no hace falta anunciarlo, el usuario lo escribió) del entrante.

**2. Nombres accesibles parejos.** Pasada por todos los botones de solo-ícono asegurando
`sr-only` o `aria-label`. Es mecánico y de bajo riesgo.

**3. Cerrar el gap de foco.** Navegar la app entera solo con teclado: sidebar, formularios, dialogs,
date pickers, el chat. Anillo visible en cada parada, y el foco atrapado dentro de los dialogs (esto
último ya lo dan los primitivos — es verificar, no construir).

**4. Contraste.** Chequear los pares de tokens y ajustar los que no lleguen a AA. Como están en
`oklch`, el ajuste es acotado.

**5. Un chequeo automatizado.** `eslint-plugin-jsx-a11y` atrapa la clase entera de regresiones
(ícono sin label, `onClick` sin equivalente de teclado) en el lint que TD-11 ya corre. Es la red que
hace que esto no se vuelva a degradar.

## Criterio de aceptación

- [ ] Recibir un mensaje con un lector de pantalla activo lo anuncia; el propio no genera ruido.
- [ ] Ningún botón de solo-ícono queda sin nombre accesible.
- [ ] La app completa es operable solo con teclado, con foco visible en cada parada.
- [ ] Los errores de `sign-in`/`sign-up` quedan asociados a su campo (llega con TD-18).
- [ ] Ningún par texto/fondo de los tokens está por debajo de AA.
- [ ] `eslint-plugin-jsx-a11y` corre en el lint y pasa.

## Si esto escalara

Un baseline con lint automatizado aguanta bien el crecimiento — la regresión la ataja el CI.

El techo es de profundidad, no de escala: este ticket cubre lo estructural, no una auditoría WCAG
completa. Si la accesibilidad pasara a ser un requisito formal (un cliente con obligación legal, un
público con necesidades específicas), el movimiento sería una auditoría con usuarios reales de
tecnología asistiva y las partes de WCAG AA/AAA que no se cubren con lint —orden de lectura, gestión
de foco en flujos complejos, alternativas a interacciones por gesto—. A esta escala eso es
desproporcionado; el baseline comunica el criterio sin el costo.

## Fuera de alcance

- **Auditoría WCAG formal.** Ver arriba.
- **Internacionalización.** `BOOK_LANG` aparece en el entorno pero i18n es otro eje y otro ticket.
- **Rediseño visual.** Ajustar contraste puede tocar un token; rediseñar no es parte de esto.
