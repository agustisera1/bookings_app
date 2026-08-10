# Read cursors — una posición en vez de estado por ítem

> Nota conceptual, agnóstica a la implementación. Explica el patrón detrás del contador de mensajes
> sin leer y por qué las notificaciones in-app usan el enfoque opuesto. Referenciada desde
> [`REAL_TIME_TRANSPORT_AND_FAN_OUT.md`](../architecture/REAL_TIME_TRANSPORT_AND_FAN_OUT.md).

La pregunta que dispara esta nota: para saber qué mensajes no vio un usuario, ¿va un flag `seen` en
cada mensaje? Es la respuesta intuitiva y es la que **no** usan los sistemas de mensajería reales.

---

## El problema con el flag por ítem

Un `seen` por mensaje es en realidad estado por **par** (mensaje, destinatario). En una conversación
de N participantes con M mensajes eso son **O(N×M)** filas, y abrir el chat escribe N de una. Además
"leer" pasa a ser una escritura masiva que hay que hacer idempotente a mano: si el evento llega dos
veces, hay que no contarlo dos veces.

## El patrón

> Sobre una secuencia **totalmente ordenada**, guardar **una posición** en vez de estado por ítem.

Lo no leído deja de ser un conjunto de filas y pasa a ser una **query**: todo lo que está después de
la marca. El costo baja a **O(N)** —una fila por (usuario, conversación)— y actualizarla es un
`update` in-place.

Se lo encuentra con distintos nombres según la capa, pero es siempre lo mismo:

| Dónde | Cómo se llama ahí |
|---|---|
| Sistemas distribuidos (nombre general) | **high-water mark** / *watermark* |
| Kafka | **consumer offset** — "consumí hasta el offset 4820 de esta partición" |
| Réplicas de Postgres | **LSN** — hasta qué posición del WAL aplicó la réplica |
| Replicación de MongoDB | timestamp del **oplog** |
| APIs paginadas | **keyset / cursor pagination** — `WHERE id > :cursor` en vez de `OFFSET` |
| Stream processing | **checkpoint** — hasta dónde procesé, para poder reanudar |
| Mensajería | **read cursor** / *read pointer* |

Que los productos de mensajería lo hacen así no hay que deducirlo: lo exponen en su API pública.
Slack tiene `last_read` por conversación; Telegram, `read_inbox_max_id` por diálogo; Discord, un
`read_state` por canal con `last_message_id`. Ninguno expone estado por mensaje y por usuario.

## Por qué funciona tan bien: es monotónico

La marca **sólo avanza**. Eso hace que mezclar dos valores sea `max(a, b)`, que es conmutativa,
asociativa e idempotente — o sea, no hay conflicto que resolver:

- **Multi-dispositivo.** Leíste hasta 100 en el teléfono y hasta 130 en la laptop; sincronizan y
  queda 130, sin importar el orden de llegada ni cuántas veces se repita el mensaje.
- **Reintentos gratis.** Aplicar dos veces "avanzá a 130" da lo mismo que aplicarlo una.

Un conjunto de flags no tiene ninguna de las dos: mezclar dos conjuntos de leídos es un merge de
verdad, y el reenvío obliga a pensar la idempotencia caso por caso.

---

## Cuándo **no** aplica

Es la parte que decide cuál usar, y este repo tiene los tres casos a la vista:

| Feature | Estado | Por qué |
|---|---|---|
| Mensajes sin leer | **cursor** | Se leen en bloque y en orden: entrar a la bandeja da por visto todo lo anterior |
| Notificaciones in-app | **`is_read` por documento** | El usuario marca una suelta, salteada, dejando otras sin leer. Una posición no puede representar eso |
| Filas de `outbox` | **`published_at` por fila** | Una fila puede fallar y reintentarse sola mientras las siguientes ya se publicaron: el avance no es ordenado |

> **Regla mental:** el cursor sirve mientras nadie necesite marcar el ítem #5 dejando el #3 sin
> marcar. En cuanto el acceso es salteado —o el avance no respeta el orden— la posición deja de
> describir el estado y hace falta estado por ítem.

Elegir mal duele de los dos lados: un cursor donde se necesita granularidad no puede expresarla, y
flags donde alcanzaba el cursor cuestan O(N×M) filas para nada.

---

## Cómo se escala desde acá

Cuando el cursor ya está, los pasos siguientes **no** son agregar un flag por mensaje:

1. **Un cursor por (usuario, conversación)**, no uno global por usuario. Es lo que habilita el
   contador por conversación en el rail.
2. **Marcar con un id de mensaje monotónico** en vez de un timestamp. Dos mensajes pueden caer en el
   mismo milisegundo, y con varios nodos los relojes no coinciden; por eso Discord usa snowflakes y
   Slack su `ts` ordenado.
3. **Denormalizar el conteo** en la fila del cursor, incrementándolo al vuelo, para no recorrer la
   colección en cada carga de página.

Los tildes azules ("¿lo vio?") tampoco piden flags: en un chat 1:1 salen de comparar el cursor del
otro contra el id del mensaje. El único caso que realmente necesita filas por (mensaje, usuario) es
el "visto por" de un grupo **con la lista de quiénes** — y no es casualidad que sea justo la feature
que los productos limitan por tamaño de grupo o directamente no ofrecen.
