# Terminología — job, fan-out y "el borde"

> Glosario conceptual, agnóstico a la implementación. Explica las ideas detrás de las decisiones de
> arquitectura async del proyecto (colas, notificaciones en vivo, mensajería). Referencia desde
> [`REAL_TIME_TRANSPORT_AND_FAN_OUT.md`](../architecture/REAL_TIME_TRANSPORT_AND_FAN_OUT.md).

La confusión típica es tratar "cola / BullMQ / Redis / WebSocket / socket.io" como una lista de
opciones que compiten entre sí. No compiten: resuelven **problemas distintos**. Entender tres
conceptos —**job**, **fan-out** y **el borde**— hace obvio cuál va en cada lado.

---

## Job (trabajo)

Un **job** es una unidad de trabajo que hay que ejecutar **una vez**, de forma confiable, quizás más
tarde y en otro proceso. "Mandá este email", "sincronizá este listing a Elasticsearch", "generá este
PDF".

Propiedades que definen a un job:

- **Consume-once (se consume una sola vez).** Un job lo agarra **un** worker y lo procesa. No es para
  todos: es una tarea con un dueño.
- **Durable.** Si el worker está caído, el job **espera** en la cola (Redis) y se ejecuta cuando
  vuelve. No se pierde.
- **Retriable.** Si falla (timeout, error transitorio), se puede reintentar con backoff.
- **Desacoplado en el tiempo.** El que encola (*producer*) no espera el resultado; sigue su vida.
  El trabajo pasa "en segundo plano".

**La herramienta:** una **cola de mensajes / job queue**. En este proyecto, **BullMQ sobre Redis**.
El productor hace `queue.add(...)`, el worker hace `new Worker(queue, processor)`.

> **Regla mental:** si perder la tarea sería un problema y tiene que pasar exactamente una vez → es
> un **job** → cola (BullMQ). Ver `docs/architecture/BULLMQ_QUEUES.md`.

---

## Fan-out (difusión / broadcast)

**Fan-out** es lo contrario de consume-once: **un** mensaje que hay que entregar a **N** destinatarios
a la vez. "Avisá a todos los que estén mirando esta conversación", "empujá esta notificación a la
pestaña abierta del usuario".

Propiedades que definen al fan-out:

- **Uno → muchos.** El mismo evento llega a todos los suscriptores interesados, no a uno solo.
- **Efímero (best-effort).** Se entrega a quien esté escuchando **ahora**. Si nadie escucha, se
  descarta — y está bien, porque la **fuente de verdad está en otro lado** (la DB). El cliente que
  estaba offline se pone al día leyendo la DB en el próximo load, no reintentando la entrega.
- **En vivo.** El valor es la baja latencia, no la durabilidad.

**La herramienta:** **pub/sub** (publish/subscribe). En este proyecto, **Redis pub/sub**. Un proceso
publica en un canal; todos los suscriptos a ese canal reciben el mensaje.

> **Job vs. fan-out en una línea:** un **job** es una tarea con **un** dueño que **no se puede
> perder** (cola, durable, retry). Un **fan-out** es un aviso para **muchos** que **se puede perder**
> porque la verdad vive en la DB (pub/sub, efímero). Usar una cola para fan-out fuerza durabilidad y
> consume-once donde no los querés; usar pub/sub para un job pierde la tarea si nadie escuchaba.

---

## El borde (the edge)

**El borde** es la frontera donde tu backend se encuentra con el **cliente** (el navegador). Es un
límite físico importante porque **el browser no habla tu infra interna**: no se conecta a Redis, ni a
BullMQ, ni a Postgres. Solo habla **HTTP** y, para tiempo real, **WebSocket**.

Consecuencia clave: por más que Redis pub/sub difunda un evento entre tus procesos, ese evento **no
llega solo al navegador**. Alguien tiene que **sostener una conexión abierta con el cliente** y
empujárselo. Eso es el trabajo del borde.

Herramientas del borde (transportes servidor→cliente):

| Transporte | Dirección | Notas |
|------------|-----------|-------|
| **HTTP normal (request/response)** | cliente pregunta, server responde | El default. No sirve para "avisar sin que pregunten". |
| **SSE** (Server-Sent Events) | solo server → cliente | Streaming one-way sobre HTTP; reconexión nativa del browser. Ideal para notificaciones puras. |
| **WebSocket** | bidireccional | Canal full-duplex persistente. Necesario para chat. |
| **socket.io** | bidireccional | Capa sobre WebSocket: rooms, acks, reconexión, fallbacks. |

> **Por qué "borde" y no "el servidor":** internamente podés tener varios procesos (API, worker,
> servidor de sockets) hablando por Redis. El **borde** es específicamente el proceso que tiene el
> socket abierto contra **el browser**. Un mensaje puede viajar API → Redis → servidor de sockets
> (todo interno) y recién en el último paso **cruzar el borde** hacia el cliente.

---

## Conexiones TCP y puertos: por qué un proceso sostiene muchas

Al hablar de clientes (pub, sub, BullMQ) surge la duda natural: ¿cómo conviven tres "conexiones" al
**mismo** Redis sin pisarse? La respuesta es un primitivo de TCP que conviene internalizar.

- Un **cliente** (el objeto en memoria, p. ej. de `createClient`) administra **una conexión TCP** con
  el servidor. El objeto se crea al instanciarlo; la conexión TCP se abre recién en `.connect()`.
- Una conexión TCP se identifica por una **tupla de 4**: `(IP local, puerto local, IP remota, puerto
  remoto)`. Dos conexiones son distintas si difieren en **cualquiera** de esos cuatro campos.
- Al conectarte a Redis, la **IP + puerto remoto son fijos** (el `IP:6379` del server). Lo que hace
  única a cada conexión es el **puerto local**, que **asigna el sistema operativo** automáticamente
  (un "puerto efímero" distinto por cada conexión saliente). Vos no elegís ni administrás esos puertos.
- Por eso **un proceso puede tener muchísimas conexiones al mismo servidor**: cada
  `createClient().connect()` sale por un puerto local distinto → tupla distinta → conexión
  independiente. Pub, sub y BullMQ son tres tuplas al mismo `IP:6379`.

Consecuencia práctica: no "reservás puertos" para separar pub de sub. Abrís sockets y el SO los
diferencia solo. Lo que sí importa es **cuántos** abrís y que no se te escapen (de ahí el patrón
**singleton**): cada socket es un recurso del proceso, y si un hot-reload abre uno nuevo sin cerrar el
anterior, la cuenta **gotea**.

> **Auditarlas:** desde el SO, `Get-NetTCPConnection -OwningProcess <PID> -RemotePort 6379`
> (PowerShell) lista una fila por socket, cada una con distinto puerto local. Desde Redis,
> `CLIENT LIST` muestra una línea por conexión; si nombrás los clientes
> (`createClient({ name: "sse-sub" })`), aparecen identificados y verificar el singleton es tan simple
> como contar que haya **uno solo** de cada nombre.

---

## Cómo encajan los tres (el flujo de una notificación)

```
1. Ocurre algo (una reserva cambia de estado) en la API.
2. La API encola un JOB (BullMQ): "armá y persistí la notificación de X".      ← job, consume-once
3. El worker lo procesa: rehidrata datos, INSERTA en Mongo (fuente de verdad). ← durable, la verdad
4. El worker hace FAN-OUT: publica el evento en Redis pub/sub.                 ← fan-out, efímero
5. El servidor de sockets recibe el evento y lo EMPUJA al cliente por el BORDE. ← borde (socket.io)
6. Si el cliente estaba offline, el paso 5 no hace nada — y no importa:
   al reconectar, lee la notificación de Mongo (paso 3).                       ← la verdad rescata
```

Cada herramienta hace **una** cosa: BullMQ garantiza que el trabajo se haga una vez (paso 2–3), Redis
pub/sub difunde el aviso (paso 4), socket.io lo cruza hasta el navegador (paso 5), y la DB es la red
de contención cuando el fan-out no alcanza (paso 6). Ninguna reemplaza a la otra.
