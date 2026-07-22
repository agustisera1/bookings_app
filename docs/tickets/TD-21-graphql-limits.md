# TD-21 — Cotas del endpoint GraphQL

| | |
|---|---|
| **Branch** | `feat/graphql-limits` |
| **Bloque** | Seguridad |
| **Prioridad** | 🔴 Alta |
| **Momento** | Pre-deploy |
| **Depende de** | — |
| **Origen** | Re-triage del backlog contra el objetivo de deploy público |
| **Repos** | `bookings_app` |

## Problema

`/api/graphql` va a quedar expuesto a internet y **el cliente controla cuánto trabajo pide.**

### Lo que NO es el problema — diagnóstico corregido

El reflejo ante un GraphQL público es limitar la **profundidad** de las queries. Verificado contra
`lib/apollo/schema.graphql`: **acá no aplica.** El schema es plano —`Listing` referencia `Location`,
que es todo escalares; `GuestBooking` no referencia ningún objeto— y **no hay un solo ciclo**. La
profundidad máxima alcanzable es 3.

No hay `Listing.host: User` ni `Booking.listing: Listing`, que es lo que haría posible un anidamiento
recursivo. Poner un límite de profundidad acá sería defenderse de un ataque que el schema no permite.

> Que el schema sea plano es lo que **desplaza** el vector, no lo que lo elimina. Los dos que siguen
> existen justamente porque es plano.

### 1. `limit` no tiene techo — `lib/services/listings.ts:93`

```ts
const limit = filters?.limit || 12;
```

`limit` viene de `FiltersInput`, o sea del cliente, y **nada lo acota por arriba**:

```graphql
query { listings(filters: { limit: 1000000 }) { _id title description photos } }
```

Devuelve la colección entera. Y se combina con el punto 4 de `PERFORMANCE.md`: **no hay índices sobre
los campos de filtro**, así que cada una de esas queries es un `COLLSCAN` completo que además viaja
por la red con `description` y `photos` adentro.

El `12` de default hacía parecer que había una cota. Es un default, no un límite.

### 2. Amplificación por alias

Un schema plano no impide **repetir** el mismo campo raíz dentro de un solo documento:

```graphql
query {
  a: listings(filters: { limit: 10000 }) { _id title }
  b: listings(filters: { limit: 10000 }) { _id title }
  c: listings(filters: { limit: 10000 }) { _id title }
  # … cientos de alias
}
```

Cada alias es una ejecución independiente del resolver. **Un request HTTP, N `COLLSCAN`.** El rate
limiting de TD-20 no lo cubre: cuenta requests, y esto es un solo request.

## Por qué entra

**Preguntas 1 y 2.**

- **Deploy:** un endpoint público donde el cliente decide cuánto trabajo hace el servidor es la
  definición de superficie de abuso abierta. Y a diferencia de la fuerza bruta de TD-20, acá no hace
  falta ni intención: un cliente mal escrito pidiendo `limit: 99999` produce el mismo efecto.
- **Adorno:** GraphQL traslada al cliente el poder de componer la query. **Ese poder es la
  característica, y acotarlo es la contraparte obligatoria** — un GraphQL público sin cotas es haber
  tomado la mitad conveniente de la tecnología. Es la lección específica del ticket.

## Alcance

**1. Acotar `limit` en el service** (`lib/services/listings.ts`). Dos constantes de dominio
(default y máximo) y un clamp por ambos lados: `Math.min(Math.max(filters?.limit ?? DEFAULT, 1), MAX)`.
El clamp inferior es parte del fix, no cosmético: `findListings` aplica `cursor.limit()` del driver
nativo de Mongo, que trata un `limit` negativo como `abs(limit)` en un solo batch. Sin cota inferior,
`limit: -1000000` devuelve un millón de documentos y evade el tope superior.

Va en el **service**, no en el resolver: es una regla del dominio, y `getListings` también se llama
desde RSC sin pasar por GraphQL. Acotarlo en el resolver dejaría el otro camino abierto.

**2. Limitar la cantidad de campos raíz por documento.** Una validation rule que corre en la fase de
validación —antes de la ejecución, así ningún resolver llega a correr— y rechaza los documentos que
superen N campos raíz, contando a través de fragment spreads para que un `query { ...F }` no cuele
alias por la ventana. Es la defensa directa contra el punto 2.

## Criterio de aceptación

- [ ] `listings(filters: { limit: 1000000 })` devuelve como mucho el máximo definido, sin error —
      se acota, no se rechaza.
- [ ] El tope aplica también llamando a `getListings` desde un RSC, sin pasar por GraphQL.
- [ ] Una query con más de N alias del mismo campo raíz es **rechazada antes de ejecutar** ningún
      resolver.
- [ ] Las queries reales de la aplicación (`lib/apollo/queries/**`) siguen funcionando sin cambios.

## Si esto escalara

Aguanta mientras el schema siga siendo plano. **El techo es el propio schema**: el día que aparezca
`Listing.host: User` o `Booking.listing: Listing` —que es la evolución natural— el vector de
profundidad se vuelve real y hay que sumar límite de profundidad y análisis de costo por campo
(asignar peso a cada campo y rechazar por presupuesto total, no por forma).

Vale la pena dejarlo anotado en el ADR: **la defensa correcta hoy no es la correcta después**, y el
disparador para revisarla es la primera relación cíclica en el schema.

El movimiento siguiente en un sistema con clientes conocidos son las *persisted queries*: el servidor
acepta solo un catálogo de operaciones registradas y deja de ejecutar queries arbitrarias. Elimina la
clase entera de problemas, a cambio de perder la flexibilidad que hace atractivo a GraphQL — un
intercambio que a esta escala no conviene.

## Fuera de alcance

- **Límite de profundidad.** El schema no lo permite hoy. Ver arriba.
- **Declarar `introspection` y `allowBatchedHttpRequests` explícitos.** Evaluado y descartado:
  Apollo ya apaga la introspección con `NODE_ENV === "production"` y el batching HTTP viene
  deshabilitado por default, así que en cualquier deploy real ambos ya están cubiertos. Declararlos
  a mano solo blinda el caso de un `NODE_ENV` mal seteado —improbable en un host manejado— a cambio
  de config que hay que mantener. No compensa.
- **Persisted queries / allowlist de operaciones.**
- **Los índices de Mongo que hacen barato el `COLLSCAN`** → **TD-23** y Fase 4. Este ticket acota
  cuánto se pide; el costo de cada query es otro problema.
- **Rate limiting por IP** → **TD-20**.
