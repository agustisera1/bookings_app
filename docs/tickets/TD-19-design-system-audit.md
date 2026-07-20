# TD-19 — Auditoría del design system

| | |
|---|---|
| **Branch** | `refactor/design-system-audit` |
| **Bloque** | Frontend |
| **Prioridad** | 🟡 Baja |
| **Momento** | Post-deploy |
| **Depende de** | — |
| **Origen** | Re-triage del backlog: el eje de design system no tenía representación |
| **Repos** | `bookings_app` |

## Problema

El design system está **en buen estado** — este ticket es una auditoría de cierre, no una
reescritura. Conviene decirlo de entrada porque el instinto ante "auditar el design system" es
suponer un desastre, y el código no lo respalda.

Lo que ya está bien, verificado:

- **Tokens completos en `app/globals.css`:** color, tipografía (`--font-sans`/`mono`/`heading`) y una
  escala de radios derivada de un solo `--radius`. Todo en `oklch`.
- **Tres capas de componentes** (`ui/` → `common/` → feature) con la regla de dependencia respetada.
- **Muy pocos escapes:** solo **4** colores hardcodeados en toda la app fuera de `ui/`, y ~15 valores
  arbitrarios en px.

El trabajo es cerrar esos escapes y verificar consistencia, no rehacer nada. Hallazgos concretos:

| Dónde | Qué | Debería |
|---|---|---|
| `components/common/star-rating.tsx:32,86` | `text-yellow-400` hardcodeado | Un token — `--color-rating` o similar |
| `app/(app)/listings/[id]/page.tsx:96` | Mismo `text-yellow-400` | El mismo token — hoy el amarillo de rating vive en dos lados con el valor a mano |
| `components/search/filters.tsx:395` | `bg-blue-500` hardcodeado | Un token semántico |
| ~15 valores `[Npx]` arbitrarios | Medidas mágicas fuera de la escala | Verificar cuáles son legítimos (un alto de imagen puntual) y cuáles deberían ser un token de spacing |

El caso del amarillo de rating es el que mejor muestra por qué esto importa: **el mismo valor
hardcodeado en dos archivos** es la definición de un token que falta. El día que el rating cambie de
color, hay que acordarse de los dos lugares.

## Por qué entra

**Pregunta 3.** Un design system consistente es lo que hace que una app se lea como *un producto* y
no como pantallas cosidas. Para un portfolio es señal directa de criterio de frontend: tokens en
`oklch`, tres capas limpias y cero colores sueltos comunican que sabés construir un sistema, no solo
componentes.

Está en 🟡 post-deploy porque la app se ve bien hoy; esto sube el techo, no destraba nada.

## Alcance

**1. Cerrar los colores hardcodeados.** Los 4 a token. Definir `--color-rating` (o el nombre que
corresponda) y usarlo en los dos lugares del amarillo.

**2. Revisar los valores arbitrarios en px.** Uno por uno: legítimo (se documenta o se deja) vs.
debería-ser-token (se migra a la escala).

**3. Verificar consistencia de uso de primitivos.** Que no haya markup crudo donde ya existe un
primitivo de `common/` — es la regla DRY de UI que `CLAUDE.md` ya define, aplicada como pasada de
auditoría. Foco en los `<p className="text-...">` sueltos que deberían ser `FieldError`, y bloques de
página que deberían ser `Section`/`PageLayout`.

**4. Revisar la paridad light/dark.** El `dark:` aparece en 5 componentes de feature — verificar que
los tokens cubran los dos temas de forma pareja y que no haya un override manual que se saltee el
sistema.

**5. Documentar la escala.** Una nota corta (en `CLAUDE.md` o un doc de `docs/`) de qué tokens hay y
cuándo usar cada uno, para que el próximo color no nazca hardcodeado.

## Criterio de aceptación

- [ ] Cero colores hardcodeados fuera de `ui/`: los 4 actuales son token.
- [ ] El amarillo de rating es un solo token usado en los dos lugares.
- [ ] Cada valor arbitrario en px está justificado o migrado a la escala.
- [ ] Ningún bloque de UI rearma a mano un primitivo que ya existe en `common/`.
- [ ] Light y dark tienen paridad; ningún override manual se saltea los tokens.
- [ ] La escala de tokens está documentada.

## Si esto escalara

Un sistema basado en tokens es lo que hace barato el crecimiento visual: un rebrand es cambiar valores
en un lugar, no barrer la app. Ya está en la forma correcta para eso.

El techo aparece con un equipo o una librería de componentes que se consuma desde afuera: ahí el
movimiento es documentar los primitivos de forma navegable (Storybook), tests visuales de regresión, y
tokens versionados como paquete. **A esta escala —una persona, una app— Storybook es mantener un
segundo proyecto al lado del primero**, y no lo justifica nadie. La versión honesta es la nota de la
sección Alcance: qué token hay y cuándo se usa.

## Fuera de alcance

- **Storybook, tests de regresión visual, tokens como paquete.** Ver arriba.
- **Rediseño.** Esto consolida el sistema que hay; no lo cambia.
- **Refactor estructural de componentes** → **TD-18**. Acá se auditan tokens y uso de primitivos, no
  cómo está partido el árbol de archivos.
