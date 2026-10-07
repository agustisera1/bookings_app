---
paths:
  - "lib/*/actions.ts"
  - "lib/*/resolvers.ts"
  - "lib/*/schema.graphql"
  - "lib/chat/socket.ts"
  - "lib/shared/result.ts"
  - "lib/shared/http.ts"
  - "lib/apollo/**"
  - "app/api/**"
  - "codegen.ts"
---

# Contrato de API (dimensión 3)

Criterios para auditar el contrato entre clientes y server en tres transportes: REST (incluye RPC tipo
Server Actions), GraphQL y realtime (WebSocket/SSE). Las secciones de criterios no dependen del
proyecto. Lo propio de este repo está al final, en **En este repo**.

**Cómo se usa:** cada criterio es **Base** (se audita siempre) o **Condicional** (se audita solo si
se cumple su "Aplica cuando"). En el informe, un condicional que no aplica se lista con el motivo
concreto del proyecto, para que la omisión sea una decisión y no un olvido.

Los ejemplos usan TypeScript. `fail(code, msg)` abrevia `{ ok: false, code, error: msg }`.

---

## Común — todo transporte (Base)

- **C1. Un solo formato de error, sin detalles internos.** Todo error que sale del server tiene la
  misma forma: un `code` para la máquina y un mensaje para la persona. Un error inesperado se loguea
  completo y sale con un mensaje genérico. Verificación: grep de `error.message`, `String(error)` y
  `err.stack` en el código que arma respuestas da 0.

  ```ts
  type ErrorCode = "VALIDATION" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "RATE_LIMITED" | "UNAVAILABLE" | "UNEXPECTED";
  type Result<T> = { ok: true; data: T } | { ok: false; code: ErrorCode; error: string };

  try {
    return { ok: true, data: await repo.insertOrder(order) };
  } catch (err) {
    log.error("[createOrder]", err);
    return fail("UNEXPECTED", "Could not create the order");
  }
  ```

- **C2. Cada error lleva el código que corresponde a su causa.** Verificación: revisar cada
  `return fail(...)` contra la tabla.

  | Situación | Código |
  |---|---|
  | El input no cumple el schema | `VALIDATION` |
  | No hay sesión | `UNAUTHORIZED` |
  | Hay sesión pero no hay permiso | `FORBIDDEN` |
  | El recurso no existe, su id está mal formado, o es ajeno y no se quiere confirmar que existe | `NOT_FOUND` |
  | El **estado actual** del recurso impide la operación, o perdió una carrera | `CONFLICT` |
  | Superó la cota | `RATE_LIMITED` |
  | Una dependencia está caída y reintentar tiene sentido | `UNAVAILABLE` |
  | Bug o falla no prevista | `UNEXPECTED` |

  ```ts
  if (!isValidId(id)) return fail("NOT_FOUND", "Order not found");
  if (order.status !== "pending") return fail("CONFLICT", `This order is already ${order.status}`);
  ```

- **C3. Autenticado por defecto y con ownership del recurso.** Cada entrada autoriza en su primera
  línea, y toda carga por id compara al dueño. Lo público se marca como excepción explícita.
  Verificación: cada handler, action y resolver raíz arranca con el gate; cada `find*ById` sobre datos
  de un usuario va seguido de un chequeo de ownership.

  ```ts
  const auth = await authorize("orders:manage");
  if (!auth.ok) return auth;

  const order = await repo.findOrderById(id);
  if (!order || order.ownerId !== auth.data.id) return fail("NOT_FOUND", "Order not found");
  ```

- **C4. El input se valida con un schema en el borde, antes de tocar la DB.** Verificación: toda
  entrada que recibe datos hace `safeParse` (o equivalente) antes del primer acceso a la DB.

  ```ts
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0].message);
  ```

- **C5. El input no trae valores que el server puede calcular o que lo identifican.** Precio,
  totales, autor, dueño y timestamps los pone el server. Verificación: ningún schema de input tiene
  campos `total*`, `price`, `*_by`, `owner*`, `author*`, `created_at` ni `timestamp`.

  ```ts
  // ❌ { productId, quantity, total }
  const input = z.object({ productId: z.string(), quantity: z.int().min(1) });
  const total = product.price * parsed.data.quantity;
  ```

- **C6. Naming consistente en todo el contrato.** El id del recurso tiene un solo nombre, el
  casing es uno solo por capa y las fechas viajan en ISO-8601. Verificación: grep de los nombres de
  id y de los args en los schemas de entrada; todo campo de fecha es `DateTime`/ISO, nunca `String`
  suelto ni epoch.

- **C7. Una escritura crítica se puede reintentar sin duplicar ni mentir.** Una escritura es
  crítica cuando duplicarla cuesta plata, stock o un cupo. Hay dos formas válidas: una unicidad
  natural en la DB que además **reconoce el reintento** y devuelve el resultado original, o una
  clave de idempotencia. Verificación: para cada escritura crítica, ¿qué pasa si el mismo request
  llega dos veces?

  ```ts
  // Cliente: la clave se genera una vez por intención (al montar el form), no por intento.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  // Server: índice único en (user_id, idempotency_key).
  const previous = await repo.findOrderByKey(auth.data.id, input.idempotencyKey);
  if (previous) return { ok: true, data: previous };
  ```

- **C8. Toda lista que crece tiene tope, y la que crece sin fin, paginación.** El tope lo pone el
  server aunque el cliente no mande `limit`. Para listas donde se insertan datos mientras se pagina
  (feeds, chat, notificaciones) se usa cursor, no offset. Verificación: cada query que devuelve una
  lista tiene `limit`; el `limit` del cliente pasa por un clamp.

  ```ts
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
  const items = await col.find({ createdAt: { $lt: input.before ?? new Date() } })
    .sort({ createdAt: -1 }).limit(limit).toArray();
  return { items, nextCursor: items.length === limit ? items.at(-1)!.createdAt : null };
  ```

## REST y RPC (route handlers, Server Actions)

### Base

- **R1. `GET` nunca escribe.** Crear es `POST`, reemplazar `PUT`, modificar `PATCH`, borrar
  `DELETE`. Las Server Actions son siempre `POST`, así que esto aplica a los route handlers.
  Verificación: ningún handler `GET` llama a un insert, update o delete.

- **R2. El status HTTP se asigna en un único lugar, a partir del `code`.** Todo route handler
  responde a través de ese mapper, también en los errores que ocurren antes de abrir un stream.
  Verificación: grep de `status:` fuera del mapper da 0; los handlers no responden texto plano.

  ```ts
  const STATUS: Record<ErrorCode, number> = {
    VALIDATION: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404,
    CONFLICT: 409, RATE_LIMITED: 429, UNAVAILABLE: 503, UNEXPECTED: 500,
  };
  export const toHttp = <T>(r: Result<T>) => Response.json(r, { status: r.ok ? 200 : STATUS[r.code] });
  ```

- **R3. Las entradas abusables tienen cota y responden 429.** Login, signup, reset de password y
  todo lo que dispare un mail o un trabajo caro. La cota va antes del trabajo caro y devuelve el
  mismo mensaje exista o no la cuenta (anti-enumeración). Verificación: cada entrada de ese tipo
  llama al rate limiter antes del hash, la query o el envío.

  ```ts
  const limit = await rateLimit(`rl:login:email:${email.toLowerCase()}`, { limit: 5, windowMs: 600_000 });
  if (!limit.allowed) return fail("RATE_LIMITED", "Too many attempts. Please try again later.");
  ```

- **R4. Todas las actions tienen la misma forma: un solo objeto de input y un `Result` de salida.**
  Con un objeto, sumar un campo no rompe a quien llama y el mismo schema valida el form y la action.
  Verificación: ninguna action exportada recibe más de un parámetro ni devuelve otra cosa que `Result`.

  ```ts
  export async function cancelOrder(input: CancelOrderInput): Promise<Result<{ id: string }>>
  ```

### Condicionales

| # | Criterio | Aplica cuando |
|---|---|---|
| R5 | Recursos con sustantivos en plural, anidados solo si dependen del padre (`/events/{id}/tickets`), filtros por query string | REST es la API pública de recursos, no un endpoint puntual (upload, stream) |
| R6 | Versionado explícito (`/v1/...`) y cambios solo aditivos dentro de una versión | Hay clientes que no se despliegan junto al server (mobile, terceros) |
| R7 | API keys para server-to-server | Hay consumidores externos o servicios que llaman sin sesión de usuario |
| R8 | Cache HTTP (`Cache-Control`, `ETag`) | Hay lecturas públicas o costosas servidas por REST |

## GraphQL

### Base

- **G1. La nullability es una decisión.** Lo que siempre existe es non-null. Un campo que hace I/O
  propio y puede fallar sin invalidar al padre es nullable, para que su error no tire la query entera.
  Verificación: cada campo nullable tiene un motivo; cada campo resuelto por otra fuente es nullable.

  ```graphql
  type Order {
    id: ID!
    status: OrderStatus!
    shipment: Shipment   # otro servicio: si falla, la orden igual se muestra
  }
  ```

- **G2. Los errores salen con `extensions.code` y los inesperados se enmascaran.** El código lo
  pone un único mapper de dominio a GraphQL. Una excepción no prevista (un throw de la DB dentro de un
  resolver) sale con un mensaje genérico, nunca con el suyo. Verificación: los resolvers lanzan solo
  vía el mapper; el server tiene `formatError` con enmascarado.

  ```ts
  import { unwrapResolverError } from "@apollo/server/errors";

  new ApolloServer({
    schema,
    formatError: (formatted, error) =>
      unwrapResolverError(error) instanceof GraphQLError
        ? formatted
        : { message: "Unexpected error", extensions: { code: "INTERNAL_SERVER_ERROR" } },
  });
  ```

- **G3. La autorización es por campo.** Un campo que expone datos de otro usuario verifica ownership
  en su resolver: llegar al padre no da derecho a sus hijos. Verificación: cada field resolver que
  devuelve datos de un usuario compara su dueño con el caller.

  ```ts
  Listing: {
    bookings: async (listing, _, { user }) => {
      if (listing.hostId !== user.id) return null;
      return repo.findBookingsByListingId(listing.id);
    },
  },
  ```

- **G4. Un campo de lista no dispara una consulta por elemento (N+1).** Se resuelve en lote: en el
  padre con una sola consulta `IN`, o con un DataLoader por request. Verificación: cada field
  resolver alcanzable desde una lista usa un loader o lo resuelve el padre en lote.

  ```ts
  const userLoader = new DataLoader(async (ids: readonly string[]) => {
    const users = await repo.findUsersByIds([...ids]);
    const byId = new Map(users.map((u) => [u.id, u]));
    return ids.map((id) => byId.get(id) ?? null);
  });
  // Order.customer: (order) => ctx.loaders.user.load(order.customerId)
  ```

- **G5. Una query tiene límites.** Hay un tope de campos raíz (o alias) por operación, y las listas
  tienen tope (C8). Verificación: el server registra la regla de validación; ninguna lista del schema
  queda sin tope.

- **G6. El endpoint HTTP existe solo si tiene consumidor.** Si todas las lecturas corren dentro del
  server, el endpoint público es superficie de ataque sin uso y no se monta. Si se monta,
  introspection queda apagada en producción y `csrfPrevention` activo (los dos son el default de
  Apollo Server 4 con `NODE_ENV=production`). Verificación: hay al menos un consumidor HTTP real; la
  config no pisa esos defaults.

- **G7. El schema modela el dominio.** Estados como `enum`, fechas como un scalar `DateTime`, ids
  como `ID`. Verificación: ningún campo de estado es `String`; ningún campo de fecha es `String`.

  ```graphql
  scalar DateTime
  enum OrderStatus { pending paid shipped }
  type Order { id: ID!  status: OrderStatus!  created_at: DateTime! }
  ```

### Condicionales

| # | Criterio | Aplica cuando |
|---|---|---|
| G8 | Persisted queries / allowlist de operaciones | Clientes públicos o mobile, o se quiere cerrar el endpoint a operaciones conocidas |
| G9 | Análisis de costo o de profundidad | El endpoint HTTP está expuesto y el schema tiene ciclos (`A.b → B.a`) |
| G10 | Federation / schema registry | Varios equipos o servicios son dueños de partes del grafo |
| G11 | Subscriptions | El realtime no tiene otro canal (WebSocket/SSE propio) |
| G12 | Connections estilo Relay (`edges`, `pageInfo`) | El cliente es Relay; si no, alcanza `{ items, nextCursor }` (C8) |

## Realtime (WebSocket / socket.io, SSE)

### Base

- **T1. La conexión se autentica en el handshake con una credencial corta, y cada room se autoriza
  al entrar.** Conectarse no da acceso a ninguna room. Verificación: hay un middleware de handshake
  que rechaza sin token; el evento `join` verifica que el usuario sea parte y lo confirma por ack.

  ```ts
  io.use((socket, next) => {
    try { socket.data.user = verify(socket.handshake.auth.token); next(); }
    catch { next(new Error("UNAUTHORIZED")); }
  });
  socket.on("room:join", async (roomId, ack) => {
    if (!(await isMember(socket.data.user.id, roomId))) return ack(fail("NOT_FOUND", "Room not found"));
    socket.join(roomId);
    ack({ ok: true, data: null });
  });
  ```

- **T2. El contrato de eventos tiene una sola fuente de verdad y está tipado de punta a punta.**
  Los nombres de evento, los payloads y los acks viven en un único módulo que importan cliente y
  server (paquete compartido) y se pasan como genéricos. Si los repos no pueden compartir código, la
  copia se marca como espejo y se diffea. Verificación: ni el `Server` ni el `Socket` usan `any` como
  mapa de eventos; los dos lados importan los mismos tipos o la copia coincide.

  ```ts
  interface ClientToServer { "message:send": (p: SendMessage, ack: (r: Result<Message>) => void) => void }
  interface ServerToClient { "message:new": (m: Message) => void }
  const io = new Server<ClientToServer, ServerToClient>();
  ```

- **T3. Los acks usan el mismo formato de error que el resto de la API (C1).** El cliente sabe por
  qué falló y puede elegir entre reintentar y avisar. Verificación: todo ack es un `Result<T>`.

- **T4. El server valida el payload y pone él la identidad y el timestamp.** Se valida igual que en
  C4, incluido el largo máximo de los textos. El emisor sale de la sesión del socket, nunca del
  payload (C5). Verificación: cada handler de evento entrante hace `safeParse`; el objeto que se
  persiste toma `senderId` y `createdAt` del server.

  ```ts
  const parsed = sendMessageSchema.safeParse(payload); // body: z.string().trim().min(1).max(2000)
  if (!parsed.success) return ack(fail("VALIDATION", parsed.error.issues[0].message));
  const message = { ...parsed.data, senderId: socket.data.user.id, createdAt: new Date() };
  ```

- **T5. La garantía de entrega es explícita y el fallo se ve.** socket.io es *at-most-once*: se
  confirma con ack y el cliente emite con timeout. El server **siempre** responde el ack, también
  cuando algo lanza. Verificación: el cliente emite con `.timeout()`; cada handler con ack tiene
  `try/catch` que responde `fail("UNEXPECTED", ...)`.

  ```ts
  socket.on("message:send", async (payload, ack) => {
    try { ack({ ok: true, data: await persist(payload) }); }
    catch (err) { log.error("[message:send]", err); ack(fail("UNEXPECTED", "Message not sent")); }
  });
  ```

- **T6. Al reconectar, el cliente vuelve a pedir el estado a la fuente de verdad.** Lo que se
  emitió mientras estaba desconectado se perdió. Verificación: hay un handler de `reconnect` que
  vuelve a entrar a las rooms y refetchea; en SSE, el `onopen` posterior al primero refetchea los
  contadores.

  ```ts
  socket.io.on("reconnect", () => { rejoinRooms(); refetchThread(); });
  ```

- **T7. SSE: un error antes de abrir el stream responde con su status, y al cerrar se libera la
  suscripción.** Verificación: los errores previos al stream pasan por el mapper (R2); el `abort` del
  request desuscribe del broker.

### Condicionales

| # | Criterio | Aplica cuando |
|---|---|---|
| T8 | Exactly-once: id de mensaje generado por el cliente + índice único | Hay reintentos automáticos (`retries` de socket.io, reenvío manual) o un duplicado cuesta |
| T9 | Recuperación de estado sin refetch (connection state recovery, `Last-Event-ID`) | No hay una DB que refetchear, o el refetch es caro |
| T10 | Escalado horizontal: adapter de pub/sub + sticky sessions | Hay más de una instancia del server realtime |
| T11 | Rate limit por evento | Hay emisores anónimos o públicos, o riesgo real de spam |
| T12 | Re-autenticación de conexiones largas | Revocar una sesión debe cortar un socket ya abierto antes de que se reconecte |

---

## En este repo

Ejemplos canónicos de los criterios que ya se cumplen.

| Criterio | Ref |
|---|---|
| C1 `Result` | `lib/shared/result.ts` (`ServiceResult`) |
| R2 mapper HTTP | `lib/shared/http.ts` (`toHttpResponse`) |
| G2 mapper GraphQL | `lib/apollo/errors.ts` (`toGraphQLError`) |
| C2 id mal formado y carrera | `lib/bookings/actions.ts` (`parseBookingInput`, `updateBooking` con estado esperado) |
| C7 reintento reconocido | `lib/bookings/actions.ts` (`createBooking`, rama `CONFLICT`) |
| C8 clamp de `limit` | `lib/listings/queries.ts` (`getListings`) |
| C8 cursor | `lib/chat/queries.ts` (`getChatThread`) + `?from=` en `app/(app)/messages/[bookingId]/page.tsx` |
| R3 cota de login | `lib/auth/actions.ts` (`authUser`) |
| R4 un objeto de input | `lib/bookings/actions.ts`, `lib/bookings/validation.ts` |
| G4 DataLoader por request | `lib/apollo/loaders.ts` + `lib/apollo/context.ts` |
| G6 sin endpoint HTTP | `lib/apollo/client.ts` (`SchemaLink`) |
| T1 vida del socket | `components/chat/chat-connection.tsx` |
| T2 contrato del socket | `lib/chat/socket.ts` ↔ `greenaway-worker/src/chat/types.ts` |
| T4, T5 validación y ack garantizado | `greenaway-worker/src/chat/validation.ts`, `src/redis/socket.ts` |
| T6 refetch al reabrir el SSE | `components/notifications/provider.tsx` |

**Tipos generados (`pnpm codegen`, config en `codegen.ts`):** los resultados, variables y
documents de una operación se importan de `__generated__/operations.ts`; los tipos del schema, los
inputs y las firmas de resolvers, de `__generated__/resolvers-types.ts`; el dominio, de
`lib/<service>/types.ts`. Los `.graphql` de `lib/apollo/queries/**` contienen solo operaciones,
nunca `type`/`input`/`enum`. El bloque de `operations.ts` no lleva el plugin `typescript`: si lo
lleva, re-emite los inputs y da `TS2300: Duplicate identifier`.
