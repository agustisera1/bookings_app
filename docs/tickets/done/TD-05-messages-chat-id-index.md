# TD-05 — Índice y cota en `messages`

| | |
|---|---|
| **Branch** | `perf/messages-chat-id-index` |
| **Bloque** | Índices |
| **Prioridad** | 🔴 Alta |
| **Esfuerzo** | ~1 h |
| **Depende de** | **TD-04** (mecanismo de índices de Mongo) |
| **Origen** | [`tech_debt/PERFORMANCE.md`](../tech_debt/PERFORMANCE.md) § Alto impacto, punto 1 |
| **Repos** | `bookings_app` |

## Problema

```ts
// lib/repositories/messages.mongo.ts
export async function findMessagesByChatId(chatId: string) {
  const collection = await getCollection();
  const documents = await collection.find({ chat_id: chatId }).toArray();
  ...
}
```

Tres problemas en una línea:

1. **No hay índice sobre `chat_id`.** Abrir cualquier hilo es un COLLSCAN sobre **todos los
   mensajes de todos los chats de la aplicación**.
2. **No hay `sort`.** El orden es el natural de inserción. Hoy coincide con el cronológico por
   casualidad; deja de coincidir apenas Mongo mueva un documento o entren escrituras concurrentes.
   Un hilo de chat con orden "casi siempre correcto" es un bug esperando.
3. **No hay `limit`.** Se traen todos los mensajes del hilo desde el principio de los tiempos, en
   cada apertura.

Los tres escalan con el uso total del sistema, no con el hilo que se está mirando.

## Por qué entra

**Es el peor problema de la capa de datos del proyecto.** Un COLLSCAN sobre la colección que más
rápido crece, en la acción más frecuente de la feature más nueva.

Pasa por los dos criterios: es la lección de índices de Mongo en su forma más pura —filtro por
igualdad + orden, resuelto con un compuesto— y es un deploy que se degrada solo con el tiempo, sin
que nada avise.

## Alcance

En el script de índices que crea TD-04:

```js
db.messages.createIndex({ chat_id: 1, timestamp: 1 });
```

Compuesto y en ese orden a propósito: `chat_id` como prefijo de igualdad resuelve el filtro, y
`timestamp` deja el resultado **ya ordenado**. Los índices compuestos de Mongo siguen la regla del
prefijo, igual que un B-tree de Postgres: igualdad primero, rango/orden después.

En `findMessagesByChatId`:

- `sort({ timestamp: 1 })` explícito. Aunque el índice ya devuelva ordenado, el contrato tiene que
  estar en la query, no depender de un plan.
- `limit` a los N más recientes (sugerido: 50). Ojo: para traer **los últimos** hay que ordenar
  descendente, limitar, y revertir — o resolverlo en el service. Decidir dónde y dejarlo anotado.

## Criterio de aceptación

- [ ] `db.messages.find({chat_id}).explain("executionStats")` **antes**: `COLLSCAN`, con
      `totalDocsExamined` ≫ `nReturned`. Guardado en el PR.
- [ ] **Después**: `IXSCAN`, con `totalDocsExamined` ≈ `nReturned`.
- [ ] El hilo se sigue viendo en orden cronológico, ahora garantizado por la query.
- [ ] Abrir un hilo trae como mucho N mensajes.

## Fuera de alcance

- **Paginación / scroll infinito hacia atrás** en la UI. El `limit` acota el costo; la UI para
  navegar el historial viejo es feature de producto. Si el corte molesta al usarlo, se abre un
  ticket aparte.
- Índices de otras colecciones fuera de `messages`.
