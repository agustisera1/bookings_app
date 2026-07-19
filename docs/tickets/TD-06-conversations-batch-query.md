# TD-06 — N+1 en el rail de mensajería

| | |
|---|---|
| **Branch** | `perf/conversations-batch-query` |
| **Bloque** | Queries |
| **Prioridad** | 🟠 Media |
| **Esfuerzo** | ~1 h |
| **Depende de** | — |
| **Origen** | [`tech_debt/PERFORMANCE.md`](../tech_debt/PERFORMANCE.md) § Alto impacto |
| **Repos** | `bookings_app` |

## Problema

`getUserConversations` (`lib/services/chat.ts`) resuelve el lado host pidiendo las reservas **de a
un listing por vez**:

```ts
const hostBookings = (
  await Promise.all(
    hostListings.map((listing) => bookingsRepo.getBookingsByListingId(listing._id)),
  )
).flat();
```

El `Promise.all` las corre en paralelo, así que la latencia no se suma — pero siguen siendo N round
trips y N conexiones del pool ocupadas a la vez. Un host con 40 listings dispara 40 queries en cada
carga de `/messages`, y el paralelismo empeora la presión sobre el pool en vez de aliviarla.

## Por qué entra

**Aprendizaje**, con un matiz que lo hace mejor que el N+1 de manual.

El N+1 clásico se detecta porque es lento y secuencial. Este está envuelto en `Promise.all`, así
que **parece resuelto**: el código se ve concurrente y el tiempo de pared no es terrible. La lección
es que el paralelismo esconde el N+1 sin arreglarlo, y que el recurso que se agota no es el tiempo
sino el pool de conexiones.

Es barato y es un patrón que conviene tener hecho una vez bien antes de que aparezca en otros lados.

## Alcance

Función nueva en `lib/repositories/bookings.pg.ts`:

```sql
SELECT * FROM bookings WHERE listing_id = ANY($1)
```

`= ANY($1)` con un array de ids en un solo parámetro — no interpolar una lista de placeholders.

En `lib/services/chat.ts`, reemplazar el `Promise.all(map(...))` por la llamada única con todos los
`hostListings.map(l => l._id)`.

El filtro `booking.guest_id !== user.id` (que descarta reservar tu propio listing) se mantiene en el
service: es una regla de negocio y no baja al repo — `CLAUDE.md` § "Los repositorios NO manejan
lógica de negocio".

## Criterio de aceptación

- [ ] Abrir `/messages` con un host de varios listings dispara **una** query para el lado host, no N.
      Verificable contando queries en el log de PG.
- [ ] El rail muestra exactamente las mismas conversaciones que antes, incluida la exclusión de las
      reservas propias.
- [ ] La función nueva del repo no decide nada de negocio: recibe ids, devuelve filas.

## Fuera de alcance

- **Cota / paginación de la lista de conversaciones**, y `prefetch={false}` en las filas. Este
  ticket arregla *cómo* se traen, no *cuántas*.
- El `SELECT *` que trae 14 columnas para usar 6. Requiere una proyección aparte: esos repos
  devuelven `Booking[]` y otros consumers dependen del tipo completo.
