# TD-18 — Partición de componentes pendiente

| | |
|---|---|
| **Branch** | `refactor/component-partition` |
| **Bloque** | Frontend |
| **Prioridad** | 🟡 Baja |
| **Momento** | Post-deploy |
| **Depende de** | — |
| **Origen** | `CLAUDE.md` § Partición de un componente de feature (deuda declarada sin ticket) |
| **Repos** | `bookings_app` |

## Problema

`CLAUDE.md` define el patrón de partición de componentes de feature (orquestador + hook + modelo puro
+ piezas) y admite explícitamente que **la UI existente no lo sigue en todos lados** y se aplica de
forma gradual. Esa es deuda declarada por el propio proyecto, sin ticket que la enganche.

`components/chat/` es la referencia canónica y está bien: `chat.tsx` orquesta, `use-booking-chat.ts`
tiene el estado, `thread-model.ts` es lógica pura testeable, y las piezas presentacionales están
separadas. El objetivo del ticket es llevar a ese estándar los componentes que tocan los disparadores
del patrón — **no** partir por partir.

### Candidatos, verificados por tamaño y estructura

**1. `components/search/filters.tsx` — 496 líneas. El caso claro.**

Toca los tres disparadores a la vez:

- **Acumula sub-componentes inline:** `MinCountField` está definido en la línea 464, dentro del mismo
  archivo que el orquestador.
- **Mezcla mucho estado con render:** 10 `useQueryState`, un `useReducer`, más estado vivo del slider
  (`range`/`prevPrice`) y de los date pickers (`fromOpen`/`untilOpen`), todo en el cuerpo del
  componente antes de llegar al JSX.
- **Ya empezó la partición y quedó a mitad:** `filters-draft.ts` (reducer + modelo del draft) ya está
  extraído y es exactamente lo que el patrón pide. Falta sacar el hook y las piezas.

Partición sugerida, siguiendo `chat/`:

| Archivo | Qué se lleva |
|---|---|
| `filters.tsx` | Orquestador: cablea el panel, sostiene el layout |
| `use-filters.ts` | Todo el estado: los `useQueryState`, el reducer, el estado del slider y de los pickers |
| `filters-draft.ts` | **Ya existe.** El modelo puro del draft |
| piezas (`min-count-field.tsx`, etc.) | `MinCountField` y los bloques presentacionales |

**2. `components/listings/create-listing-form.tsx` — 326 líneas.** No es partición de feature sino
adherencia al patrón de formularios: es largo y mete varios `Controller` y campos inline. Evaluar si
se beneficia de extraer sub-secciones del form, o si con el patrón RHF ya alcanza. Menos urgente que
filters.

**3. `sign-in` / `sign-up` (`app/auth/*`)** — no es partición: **no usan el patrón RHF + Zod** que
`CLAUDE.md` marca como obligatorio. Manejan `useState` + `safeParse` + `fieldErrors` a mano.
Migrarlos a `useForm` + `FormField` cierra de paso el gap de `aria-describedby` de TD-17. Va acá
porque es el mismo tipo de trabajo —alinear UI vieja al patrón vigente— aunque el disparador sea otro
doc.

## Por qué entra

**Pregunta 3**, con un matiz de la 2.

- **Defendibilidad:** el proyecto define un patrón de arquitectura de componentes explícito y después
  no lo sigue en su archivo más grande. Un revisor que lea `CLAUDE.md` y abra `filters.tsx` ve la
  distancia. Cerrarla es lo que hace que el estándar sea creíble.
- **Testeabilidad (roza la 2):** el patrón separa lógica pura para poder testearla sin montar React,
  igual que `thread-model.ts`. `filters.tsx` tiene lógica de draft que hoy solo se testea montando el
  panel entero. Partir habilita testear el modelo solo — que es la razón de ser del patrón.

No entra por deploy: los componentes funcionan. Por eso es 🟡 y post-deploy.

## Alcance

**1. Partir `filters.tsx`** siguiendo `components/chat/` como molde: orquestador + `use-filters.ts` +
el `filters-draft.ts` que ya existe + piezas presentacionales. Regla de `"use client"`: solo el
orquestador y el hook la llevan; las piezas sin hooks no.

**2. Evaluar `create-listing-form.tsx`** y partir sus sub-secciones solo si aporta. Documentar la
decisión si se decide dejarlo como está.

**3. Migrar `sign-in`/`sign-up` al patrón RHF + Zod**, con `FormField`.

**Sin cambios de comportamiento.** Es refactor estructural: la UI se ve y se comporta igual. Lo que
cambia es dónde vive cada responsabilidad.

## Criterio de aceptación

- [ ] `filters.tsx` queda como orquestador; el estado vive en `use-filters.ts` y las piezas están
      separadas. Ningún sub-componente inline.
- [ ] Solo el orquestador y el hook tienen `"use client"`; las piezas presentacionales no.
- [ ] El panel de filtros se comporta **idéntico**: draft local, commit en "Show results", Clear all.
- [ ] `sign-in` y `sign-up` usan `useForm` + `zodResolver` + `FormField`.
- [ ] `tsc` y `lint` en verde; ningún cambio visual.

## Si esto escalara

La partición es exactamente lo que hace que el crecimiento no duela: más features tocando el patrón
canónico en vez de más archivos de 500 líneas. No tiene techo de escala — es la herramienta *contra*
el problema de escala del código.

Lo único que crece con el proyecto es la presión por aplicarlo: cuantas más features, más caro es el
componente que no lo sigue. El movimiento natural no es un cambio de arquitectura sino de proceso:
que el disparador del patrón se chequee en la revisión de cada feature nueva, para no volver a
acumular deuda de partición.

## Fuera de alcance

- **Cambios de comportamiento o visuales.** Esto es refactor.
- **Componentes que no tocan los disparadores.** Un archivo chico y cohesivo se deja como está —
  partir por partir contradice el propio patrón.
- **La accesibilidad de `sign-in`/`sign-up`** → **TD-17**, aunque se crucen: acá se migra la
  estructura, allá se verifica el resultado accesible.
