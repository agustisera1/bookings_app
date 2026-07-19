# TD-07 — Suspense en el rail de `/messages`

| | |
|---|---|
| **Branch** | `perf/messages-rail-suspense` |
| **Bloque** | Queries |
| **Prioridad** | 🟡 Baja |
| **Esfuerzo** | ~30 min |
| **Depende de** | — (mejor **después** de TD-06) |
| **Origen** | [`tech_debt/PERFORMANCE.md`](../tech_debt/PERFORMANCE.md) § Bajo impacto |
| **Repos** | `bookings_app` |

## Problema

`app/(app)/messages/layout.tsx` hace `await getUserConversations()` antes de renderizar nada. Como
el layout envuelve al hilo, **el panel derecho —que es lo que el usuario fue a ver— espera a que
termine la query del rail**, incluyendo el N+1 de TD-06.

La estructura es correcta: el rail es un layout justamente para no refetchearse al cambiar de
conversación. El problema es solo que bloquea la primera pintura, que es la carga que más se nota.

## Por qué entra

**Aprendizaje**, y es el único ticket del backlog sobre el modelo de rendering de Next.js.

Muestra que en RSC un `await` en un layout no es "cargar datos": es **poner una barrera de
streaming delante de todo lo que ese layout envuelve**. El fix no cambia ninguna query — cambia
dónde está el límite de suspensión — y hace visible que `<Suspense>` no es un spinner sino el punto
donde el server puede empezar a mandar HTML.

Entra a prioridad baja porque el impacto real es chico y TD-06 se lleva la mayor parte del síntoma.
Es aprendizaje barato, no una urgencia.

## Alcance

`app/(app)/messages/layout.tsx`: extraer el rail a su propio componente async y envolverlo en
`<Suspense>` con un skeleton, para que el layout deje de esperarlo y el hilo pinte primero.

El skeleton debería aproximar la forma de las filas del rail — un bloque vacío del mismo alto evita
el salto de layout cuando llegan los datos.

## Criterio de aceptación

- [ ] El panel del hilo se pinta sin esperar a que resuelva la query del rail.
- [ ] El rail muestra un skeleton mientras carga y no produce salto de layout al llegar.
- [ ] Cambiar de conversación **sigue sin** refetchear el rail: la propiedad que hace que sea un
      layout no se pierde. Es lo único que este cambio podría romper.

## Fuera de alcance

- La query en sí → **TD-06**.
- Los thumbnails del rail con `unoptimized`. Configurar `remotePatterns` en `next.config.ts` puede
  viajar acá si molesta, pero no es el objetivo del branch.
- El layout de mobile (rail **o** hilo según la ruta).
