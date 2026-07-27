# TD-15 — Health checks + visibilidad de la cola

| | |
|---|---|
| **Branch** | `feat/observability` |
| **Bloque** | Observabilidad |
| **Prioridad** | 🔴 Alta |
| **Momento** | Pre-deploy |
| **Depende de** | **TD-13** (el destino define qué consume el health check) |
| **Origen** | Re-triage del backlog: TD-01 y TD-02 no son verificables sin esto |
| **Repos** | `bookings_app` + `bookings-app-worker` |

## Problema

**No hay forma de saber si el sistema está sano.** Verificado en los dos repos:

- **Ningún health check.** Las únicas rutas de API son `auth/refresh`, `graphql`, `s3` y `subscribe`.
  El worker expone el puerto de socket.io y nada más.
- **Ninguna visibilidad de la cola.** No hay Bull Board ni equivalente: no hay forma de ver cuántos
  jobs esperan, cuántos fallaron, ni por qué.
- **Logs sin estructura.** `console.info` / `console.error` con prefijo `[nombre]`, que funciona
  leyendo una terminal en desarrollo y se vuelve inútil en un agregador de logs de producción.

El problema no es cosmético. **El worker es donde vive todo el trabajo asíncrono** —los mails y el
chat entero— y hoy la única forma de saber si está vivo es abrir la app y probar el chat a mano.

### Por qué esto bloquea a TD-01 y TD-02

TD-01 pide como criterio de aceptación:

> *"Con una `RESEND_API_KEY` inválida, el job aparece como **failed** en BullMQ — no como completed"*
> *"Se observan los 3 intentos con backoff creciente"*

**¿Observados dónde?** Hoy esa verificación se hace inspeccionando Redis a mano con `redis-cli`. Eso
funciona una vez en local; no funciona como comprobación de que el sistema se comporta bien en
producción.

> La fault tolerance que no se puede observar no es fault tolerance: es una afirmación. TD-01 y TD-02
> construyen la garantía; este ticket la vuelve **evidencia**.

## Por qué entra

**Preguntas 1 y 2.**

- **Deploy:** ningún orquestador puede reiniciar un servicio caído si no tiene cómo preguntarle si
  está vivo. Un worker muerto hoy es indistinguible de un worker ocioso.
- **Adorno:** BullMQ sin panel es una cola que no podés inspeccionar. Buena parte de lo que hace
  valiosa a una cola —ver la profundidad, los fallidos, reintentar a mano— es justamente lo que hoy
  no existe.

## Alcance

### 1. Health checks en los dos repos

**App:** `app/api/health/route.ts`. Chequea las dependencias que necesita para servir: PG y Mongo.

**Worker:** ya es un servidor HTTP —`chatServer.listen(socketPort)` en `src/index.ts:24`— así que
agregar una ruta es trivial. Chequea Redis (sin él no hay cola ni fan-out de socket) y reporta el
estado de los dos consumers.

Distinción que importa y conviene respetar:

| | Qué responde | Para qué |
|---|---|---|
| **liveness** | "el proceso está vivo" | Si falla, reiniciar |
| **readiness** | "puedo atender tráfico" (dependencias arriba) | Si falla, sacar de rotación pero **no** reiniciar |

Confundirlas tiene una consecuencia concreta: si el liveness chequea la base de datos, una caída de
la base reinicia todos tus procesos en loop y convierte un problema en dos.

### 2. Bull Board

Panel montado en el worker, **detrás de autenticación** — expone contenido de jobs. Da profundidad de
cola, fallidos con su stack, y reintento manual.

### 3. Logs estructurados

Pasar de `console.*` a JSON con nivel, timestamp y contexto. Lo mínimo que hace la diferencia en un
agregador: que el `jobId` viaje en el log del worker, para poder seguir un mail desde que se encoló
hasta que se envió o falló.

## Criterio de aceptación

- [ ] `GET /api/health` en la app responde `200` con el estado de PG y Mongo, y `503` si alguna está
      caída.
- [ ] El worker expone su propio health check con el estado de Redis y de los dos consumers.
- [ ] Bajar Redis hace que el health del worker pase a no-sano **sin matar el proceso**.
- [ ] Bull Board muestra los jobs y **pide autenticación**.
- [ ] Los 3 reintentos de TD-01 se pueden observar en Bull Board sin tocar `redis-cli`.
- [ ] Un log de job incluye el `jobId` y se puede seguir el recorrido completo de un mail.

## Si esto escalara

Aguanta bien mientras haya pocos procesos y una persona mirando.

El techo aparece cuando hay varias instancias y nadie mirando: los health checks te dicen si algo
está caído **ahora**, pero no te avisan, y los logs no te dan tendencias. El próximo movimiento sería
métricas (`prom-client` exponiendo profundidad de cola, latencia de jobs, tasa de fallo) con
Prometheus y alertas, y trazas distribuidas con OpenTelemetry para seguir un request desde la Server
Action hasta el mail enviado.

**A esta escala eso es un stack de observabilidad más grande que la aplicación que observa.** El plan
original lo tenía en Fase 6; este ticket es deliberadamente la versión chica: saber si está vivo, ver
la cola, poder seguir un job. Es lo que se usa de verdad cuando hay un solo par de ojos.

## Fuera de alcance

- **Prometheus, Grafana, OpenTelemetry.** Ver `Descartado y por qué` en el README del backlog.
- **Alertas y on-call.** No hay quién esté de guardia.
- **Uptime monitoring externo.** Puede sumarse después; es configuración de un servicio, no código.
