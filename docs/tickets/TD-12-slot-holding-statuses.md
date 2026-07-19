# TD-12 — `SLOT_HOLDING_STATUSES` fuera del repositorio

| | |
|---|---|
| **Branch** | `refactor/slot-holding-statuses` |
| **Bloque** | Higiene |
| **Prioridad** | 🟡 Baja |
| **Esfuerzo** | ~30 min |
| **Depende de** | — (afinidad con **TD-03**: misma query) |
| **Origen** | [`tech_debt/CANCELLATION_FEATURE_NEXT_STEPS.md`](../tech_debt/CANCELLATION_FEATURE_NEXT_STEPS.md) + `CLAUDE.md` |
| **Repos** | `bookings_app` |

## Problema

`findBookedListingIds` (`lib/repositories/bookings.pg.ts`) hardcodea en el `WHERE` los estados que
liberan un slot:

```sql
WHERE status NOT IN ('cancelled', 'rejected')
```

Decidir **qué estados invalidan la disponibilidad** es una regla de negocio, y está escrita dentro
de un repositorio. `CLAUDE.md` ya lo documenta como deuda conocida, con la instrucción explícita de
no replicar el patrón en repos nuevos.

Hoy la regla vive en **tres** lugares: el `WHERE` del repo, el predicado del constraint `no_overlap`
(`db/migrations/003_booking_no_overlap.sql`) y la definición de dominio. TD-03 va a agregar una
**cuarta** copia en el `WHERE` del índice parcial nuevo.

## Por qué entra

Es el ticket más débil del backlog y entra igual, por dos razones concretas:

1. **`CLAUDE.md` lo marca explícitamente.** Es la única deuda que las instrucciones del proyecto
   señalan por nombre. Dejarla es dejar el documento mintiendo sobre el estado del código.
2. **TD-03 la empeora.** El índice parcial replica el predicado una vez más. Hacer los dos seguidos
   evita agregar una copia y después salir a buscarla.

El aprendizaje es chico pero real: es el mismo criterio que `CLAUDE.md` formula para el naming de
repos (`updateBooking` sí, `rejectBooking` no) aplicado a un **valor** en vez de a una función. El
repo ofrece el filtro; el service decide qué filtrar.

**Media hora. Si aparece algo mejor que hacer, este espera.**

## Alcance

```ts
// lib/bookings/policy.ts
export const SLOT_HOLDING_STATUSES: BookingStatus[] = ["pending", "accepted"];
```

Va en `policy.ts` porque ahí ya viven las otras reglas puras del ciclo de vida (`canCancel`,
`refundFor`) — cohesión: la constante y las transiciones que la usan son la misma unidad conceptual.

El service la pasa como parámetro a `findBookedListingIds`; el repo la recibe y la usa en el
`WHERE`. Nota que el sentido se invierte: el repo hoy lista los estados que **no** cuentan
(`NOT IN ('cancelled','rejected')`) y la constante lista los que **sí** (`pending`, `accepted`).
Es la misma regla enunciada al derecho — más clara, pero hay que traducir el predicado con cuidado.

**La copia del constraint SQL se queda.** Es un invariante de la base y tiene que vivir ahí: la DB
no puede depender de que la app se acuerde. Lo que corresponde es un comentario cruzado entre
ambas, no borrar una.

## Criterio de aceptación

- [ ] `SLOT_HOLDING_STATUSES` está definida una sola vez, en `lib/bookings/policy.ts`.
- [ ] `findBookedListingIds` no menciona ningún estado literal: los recibe.
- [ ] El constraint SQL y la constante se referencian mutuamente por comentario.
- [ ] La deuda queda **borrada de `CLAUDE.md`** — si el doc la sigue anunciando, el ticket no
      terminó.
- [ ] La búsqueda con fechas sigue devolviendo lo mismo (una reserva cancelada no bloquea el slot).

## Fuera de alcance

- El índice GiST → **TD-03**.
- Auditar otros repos en busca del mismo patrón. Si aparece, se anota; no se sale a cazar.
