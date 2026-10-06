# Auditoría — Contrato de API (dimensión 3)

**Alcance:** las superficies que tocan los flujos 1–3 de [scope.md](scope.md):
- Server Actions de `bookings`, `auth`, `chat` y `notifications`.
- Schema y resolvers GraphQL de `bookings`, `chat`, `listings` (tipo `Listing` y query `listing`), `notifications` y `users`.
- `app/api/graphql` y `app/api/subscribe`.
- socket.io en los dos lados (`lib/chat/socket.ts` y `greenaway-worker/src/redis/socket.ts`).
- Los componentes que consumen todo lo anterior.

Quedan afuera reviews, el alta y la edición de listings, `/api/s3` y la búsqueda (`FiltersInput`).

**Criterio:** `.claude/rules/03-api.md`. **Verificación:** lectura de código, sin correr la app.

## Resumen

| Criterio | Veredicto | Hallazgos |
|---|---|---|
| C1 Formato de error único | ❌ en GraphQL, SSE y socket; ✅ en actions | 12, 16, 23 |
| C2 Código correcto | ❌ | 1–5 |
| C3 Auth + ownership | ✅ salvo lo ya registrado | seguridad #2 |
| C4 Validación en el borde | ✅ salvo el socket | 3, 24 |
| C5 El server calcula | ✅ salvo lo ya registrado | seguridad #3 |
| C6 Naming | ❌ | 6–8 |
| C7 Reintento seguro | ❌ | 9 |
| C8 Tope y paginación | ❌ | 10, 11 |
| R1 GET no escribe | ✅ | |
| R2 Status en un lugar | ❌ | 12 |
| R3 Cota en lo abusable | ✅ | |
| R4 Forma de las actions | ❌ | 13, 14 |
| G1 Nullability | ❌ | 15 |
| G2 Errores enmascarados | ❌ | 16 |
| G3 Auth por campo | ❌ ya registrado | seguridad #2 |
| G4 Sin N+1 | ❌ latente | 17 |
| G5 Límites | ✅ tope de campos raíz; listas en C8 | |
| G6 Endpoint con consumidor | ❌ | 18 |
| G7 Schema modela el dominio | ❌ | 19, 20 |
| T1 Auth de conexión y room | ❌ | 21 |
| T2 Contrato único y tipado | ❌ | 22 |
| T3 Acks con formato de error | ❌ | 23 |
| T4 Validación del payload | ❌ | 24 |
| T5 Entrega explícita | ❌ | 25 |
| T6 Refetch al reconectar | ✅ chat; ❌ SSE | 26 |
| T7 SSE: status y limpieza | ✅ (el formato, en 12) | |

## A. Común

| # | Criterio | Hallazgo | Dónde |
|---|---|---|---|
| 1 | C2 | Una reserva cuyo estado impide la operación responde `VALIDATION` en vez de `CONFLICT` | `bookings/actions.ts` → `acceptBooking`, `rejectBooking` (`status !== "pending"`), `cancelBooking` (`canCancel`) |
| 2 | C2 | Si el `UPDATE` pierde una carrera, responde `NOT_FOUND` en vez de `CONFLICT` | `bookings/actions.ts` → las tres ramas `if (!cancelled/accepted/rejected)` |
| 3 | C2, C4 | Un `listing_id` mal formado hace lanzar a `new ObjectId` y sale `UNEXPECTED` en vez de `NOT_FOUND` | `listings/queries.ts` → `getListing`; `listings/repository.ts` → `findListingById` |
| 4 | C2 | `createBooking` no verifica que el listing exista: se crea una reserva sobre un listing inexistente | `bookings/actions.ts` → `createBooking` |
| 5 | C2 | Un id de notificación mal formado responde `VALIDATION` en vez de `NOT_FOUND` | `notifications/actions.ts` → `markAsRead` |
| 6 | C6 | El id del recurso tiene dos nombres: `_id` en `Listing`, `Notification`, `ChatMeta` y `ChatMessage`; `id` en `Booking`, `Conversation` y `UserSummary` | `lib/*/schema.graphql` |
| 7 | C6 | Los argumentos de id siguen tres convenciones: `listing(listing_id)`, `booking(id)`, `chatThread(bookingId)` | `listings`, `bookings`, `chat` `schema.graphql` |
| 8 | C6 | `Listing` mezcla casing: `availabilityRange` entre campos en snake_case | `listings/schema.graphql` |
| 9 | C7 | Un reintento de `createBooking` no duplica (`no_overlap`), pero le responde al mismo guest "These dates are no longer available" sobre su propia reserva | `bookings/actions.ts` → rama `CONFLICT` |
| 10 | C8 | Listas sin tope | `notifications/repository.ts` → `getNotifications`; `bookings/repository.ts` → `findBookingsByGuestId`, `findBookingsByListingId`; `chat/queries.ts` → `getUserConversations` |
| 11 | C8 | El chat corta en 50 mensajes y no hay cursor: los anteriores no se pueden cargar | `chat/repository.ts` → `findMessagesByChatId` |

## B. REST y RPC

| # | Criterio | Hallazgo | Dónde |
|---|---|---|---|
| 12 | R2, C1 | `/api/subscribe` calcula el status a mano y responde texto plano. Su 503 no tiene `ErrorCode` | `app/api/subscribe/route.ts` |
| 13 | R4 | Actions con parámetros sueltos. El ejemplo canónico de `02-services.md` (`replyToReview`) tiene la misma forma: hay que alinear esa regla | `bookings/actions.ts` → `cancelBooking`, `acceptBooking`, `rejectBooking`; `notifications/actions.ts` → `markAsRead` |
| 14 | R4 | `getUserToken` es una action que devuelve `string \| null` en vez de `ServiceResult` | `auth/actions.ts` |

## C. GraphQL

| # | Criterio | Hallazgo | Dónde |
|---|---|---|---|
| 15 | G1 | `Booking.party` es nullable, pero los tres resolvers que devuelven `Booking` siempre lo setean | `bookings/schema.graphql` |
| 16 | G2 | No hay `formatError`: una excepción no prevista sale con su mensaje crudo. Camino concreto: `guestBookings` llama a `findListingsByIds` fuera de un `try` | `apollo/index.ts`; `bookings/resolvers.ts` |
| 17 | G4 | N+1 latente: `Booking.host`, `Listing.availability` y `Listing.bookings` hacen una consulta por padre. Hoy solo se piden sobre una entidad a la vez, pero `Booking` es alcanzable desde `guestBookings` | `users/resolvers.ts`; `bookings/resolvers.ts` |
| 18 | G6 | `/api/graphql` no tiene consumidor: todas las lecturas corren en proceso con `SchemaLink`. Los defaults de introspection y CSRF están intactos | `app/api/graphql/route.ts` |
| 19 | G7 | Fechas como `String` | `chat/schema.graphql` → `ChatMeta.started_at`, `ChatMessage.timestamp` |
| 20 | G7 | Ids como `String` en vez de `ID` | `Listing._id`, `host_id`, `listing_id`, `booking_id`, `chat_id`, `sender_id` en `listings`, `notifications` y `chat` `schema.graphql` |

## D. Realtime

| # | Criterio | Hallazgo | Dónde |
|---|---|---|---|
| 21 | T1 | El socket sobrevive al logout. Es un singleton en `globalThis`, autenticado una sola vez en el handshake, y logout y login navegan en el cliente sin recargar. El siguiente usuario del mismo tab usa la conexión del anterior (deducido del código) | `chat/socket.ts`; `layout/sidebar-user-footer.tsx`; `auth/sign-in-form.tsx` |
| 22 | T2 | El contrato está copiado a mano en los dos repos y sin tipar: `Server<any, …>` en el worker, `Socket` sin genéricos en la app. Lo mismo pasa con el frame SSE `UnreadNudge` | `chat/socket.ts` ↔ `worker/src/chat/types.ts`; `notifications/notifications-model.ts` ↔ `worker/src/redis/client.ts` |
| 23 | T3, C1 | Los acks de error son `{ ok: false }`, sin `code` ni mensaje | `JoinAck`, `MessageAck` en los dos repos |
| 24 | T4 | `CLIENT_MESSAGE` no valida el payload: el body no se recorta, no tiene largo máximo y no se chequea su tipo | `worker/src/redis/socket.ts` |
| 25 | T5 | Si `upsertChatByBookingId` o `insertMessage` lanzan, el handler nunca responde el ack. El cliente se entera recién por el timeout de 10 s y el worker queda con un rechazo no manejado | `worker/src/redis/socket.ts` |
| 26 | T6 | El SSE no refetchea los contadores al reconectar: lo publicado durante la caída no suma al badge hasta recargar | `notifications/provider.tsx` |

## Ya registrados

Están en [security/services.md](security/services.md), así que no se repiten como hallazgos:

| Seguridad | Criterio | Qué |
|---|---|---|
| #2 | G3, C3 | `Listing.bookings` no chequea que el listing sea del caller |
| #3 | C5 | `createBooking` confía en el `totalPrice` del cliente |

## No aplica

| # | Criterio | Por qué no se evaluó |
|---|---|---|
| R5 | Recursos REST | Los route handlers son puntuales (transporte GraphQL, stream SSE, upload): no hay una API REST de recursos |
| R6 | Versionado | Un solo cliente web, que se despliega junto con el server |
| R7 | API keys | No hay consumidores externos; el worker no llama a la API, comparte DB y Redis |
| R8 | Cache HTTP | Las lecturas no van por REST: GraphQL en proceso + cache de Next |
| G8 | Persisted queries | Un solo cliente, que ejecuta las queries en proceso |
| G9 | Costo/profundidad | Depende de #18. Si `/api/graphql` se cierra, no aplica. Si se mantiene, sí: el schema tiene el ciclo `Listing.bookings → Booking.listing` |
| G10 | Federation | Un solo server GraphQL |
| G11 | Subscriptions | El realtime va por socket.io y SSE |
| G12 | Connections Relay | El cliente no es Relay |
| T8 | Exactly-once | El cliente no reintenta (ni `retries` ni reenvío manual): no hay duplicados que deduplicar |
| T9 | Recuperación sin refetch | Mongo es la fuente de verdad y el cliente refetchea al reconectar (T6) |
| T10 | Escalado horizontal | Hay una sola instancia. El adapter de Redis ya está; si se escala, faltan las sticky sessions |
| T11 | Rate limit por evento | Solo hay usuarios autenticados y el proyecto es para demos |
| T12 | Re-auth de conexiones largas | Tampoco hay revocación en HTTP (JWT stateless de 24 h), así que cortar sockets no agrega nada. No confundir con #21, que es el mismo tab |

## Resolución

Resueltos en `refactor/api-contracts` (este repo y `greenaway-worker`). G9 queda en "No aplica": `/api/graphql` se cerró (#18).

| # | Cómo se resolvió |
|---|---|
| 1, 2 | `CONFLICT` para un estado que impide la operación. El `UPDATE` ahora exige el estado leído (`updateBooking(id, expectedStatus, …)`): antes no detectaba ninguna carrera, solo una fila borrada |
| 3, 5 | Un id mal formado responde como inexistente (`listing` en `null`, `markAsRead` en `NOT_FOUND`). `markAsRead` compara `matchedCount`: releer una notificación leída no es "no encontrada" |
| 4 | `createBooking` verifica que el listing exista antes de insertar |
| 6–8, 19, 20 | `id` en todo el schema (los resolvers de Mongo lo derivan de `_id` vía mappers de codegen), argumentos `id`, fechas `DateTime`, ids `ID`. `Listing.rating` y `Listing.availabilityRange` se sacaron: nadie los resolvía |
| 9 | En un `CONFLICT`, si la reserva superpuesta es del mismo guest y la misma estadía, se devuelve esa reserva |
| 10 | Tope de 100 en las listas de reservas y conversaciones, de 50 en notificaciones |
| 11 | Cursor en la URL (`?from=`) y "Load older messages" |
| 12 | `/api/subscribe` responde por `toHttpResponse`; código nuevo `UNAVAILABLE` (503) |
| 13, 14 | Las actions del alcance reciben un objeto validado por zod; `getUserToken` devuelve `ServiceResult` |
| 15 | `Booking.party` non-null |
| 16 | `guestBookings` pasó a `getUserBookings`, dentro de su `try`. Sin endpoint HTTP, ningún error sale del server |
| 17 | DataLoader por request (`lib/apollo/loaders.ts`, `context.ts`) |
| 18 | Endpoint borrado junto con `@apollo/server` |
| 21 | La conexión la maneja `ChatConnection` en el layout de `/messages`: conecta al montar, desconecta en el cleanup |
| 22–25 | Contrato tipado en los dos repos, acks `{ ok, code, error }`, validación del payload y ack en todo camino |
| 26 | Al reabrirse el `EventSource`, `router.refresh()` vuelve a traer los contadores de la DB |
