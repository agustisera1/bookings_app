# TD-14 — Config de entorno unificada y validada

| | |
|---|---|
| **Branch** | `chore/env-config` |
| **Bloque** | Deploy |
| **Prioridad** | 🔴 Alta |
| **Momento** | Pre-deploy |
| **Depende de** | **TD-13** (el destino define qué formato de conexión conviene) |
<<<<<<< Updated upstream
| **Origen** | `tech_debt/EVENTS_FEATURE_NEXT_STEPS.md` § Recordatorio de runtime + auditoría propia |
| **Repos** | `bookings_app` + `bookings-app-worker` |
=======
| **Origen** | Auditoría de config de entorno de los dos repos |
| **Repos** | `bookings_app` + `bookings-worker` |
>>>>>>> Stashed changes

## Problema

Cuatro cosas distintas, todas verificadas, que juntas hacen que el proyecto no sea reproducible
fuera de tu máquina.

### 1. La app no tiene `.env.example`

El worker sí lo tiene, y está bien hecho (agrupado por servicio, con `CHANGE_ME` en los secretos).
**`bookings_app` no tiene ninguno.** Clonar el repo y no poder levantarlo sin leer el código
buscando `process.env` es el primer muro para cualquiera que mire el proyecto — vos incluido dentro
de seis meses.

Las variables que la app realmente lee hoy:

```
PGHOST · PGPORT · PGUSER · PGPASSWORD · PGDATABASE
MONGODB_URI
REDIS_HOST · REDIS_PORT · REDIS_USER · REDIS_PASSWORD
JWT_SECRET
AWS_S3_REGION · AWS_ACCESS_KEY_ID · AWS_SECRET_ACCESS_KEY · AWS_LISTINGS_BUCKET
NEXT_PUBLIC_API · NEXT_PUBLIC_CHAT_SERVER_URL
```

### 2. Dos esquemas para la misma conexión de Redis

| Repo | Cómo lee Redis |
|---|---|
| `bookings_app` | `REDIS_HOST` + `REDIS_PORT` + `REDIS_USER` + `REDIS_PASSWORD` |
| `bookings-worker` | `REDIS_URL` |

**Es el mismo Redis.** El producer encola y el worker consume de la misma instancia, configurada de
dos formas que hay que mantener sincronizadas a mano. En un solo ambiente ya es frágil; con app y
worker en hosts distintos es una desincronización esperando a pasar — y falla de la peor manera
posible: sin error, simplemente los jobs se encolan en un Redis y se consumen de otro.

### 3. Nada valida el entorno al arranque

Las variables se leen donde se usan y se asume que están. El caso más claro está en `lib/s3.ts:11`:

```ts
accessKeyId: process.env.AWS_ACCESS_KEY_ID!,   // el ! afirma algo que nadie verificó
```

El `!` no chequea nada — le dice a TypeScript que se calle. Si la variable falta, el proceso arranca
normal, la app sirve, y **explota en el primer upload de fotos**, en producción, con un error de AWS
que no dice "te falta una env var".

### 4. El historial de git no está auditado

Los secretos que importan (`JWT_SECRET`, `AWS_SECRET_ACCESS_KEY`, `RESEND_API_KEY`, passwords de las
tres bases) nunca se revisaron contra el historial. Una clave que estuvo commiteada y después se
borró **sigue estando en el repo**: `git log` la tiene.

> Lo que **sí** está bien y no hay que tocar: las dos variables `NEXT_PUBLIC_*` son URLs
> (`NEXT_PUBLIC_API`, `NEXT_PUBLIC_CHAT_SERVER_URL`), no secretos. Verificado. Importa porque
> `NEXT_PUBLIC_*` se inlinea en el bundle del cliente: cualquier secreto con ese prefijo es público
> aunque viva en `.env.local`.

## Por qué entra

**Pregunta 1.** Los cuatro puntos son formas distintas de que el sistema funcione en `localhost` y
falle desplegado, que es la definición operativa de "no bloquea un deploy honesto".

El punto 3 tiene además la propiedad más molesta: **falla tarde**. Un arranque que no valida
convierte un error de configuración de dos segundos en un incidente de producción.

## Alcance

**1. `.env.example` en `bookings_app`**, con el formato del worker: agrupado por servicio,
comentado, `CHANGE_ME` en todo lo sensible. Nunca valores reales.

**2. Unificar Redis en `REDIS_URL`** en los dos repos. Una URL lleva host, puerto, usuario y password
en un solo valor — que es además el formato que entregan los Redis administrados, así que se copia y
se pega en vez de descomponerse a mano.

**3. Validar el entorno al arranque**, en los dos repos. Un módulo que parsea `process.env` con Zod y
exporta un objeto tipado; el resto del código lo importa en vez de leer `process.env` suelto. Si
falta algo, **el proceso no arranca** y el mensaje dice qué falta.

Efecto lateral bueno: se terminan los `!` de `lib/s3.ts`, porque el tipo pasa a ser `string` de
verdad.

**4. Auditoría del historial de git.** Si aparece algo, **se rota** — borrarlo del historial no
alcanza, hay que asumir que la clave está comprometida.

## Criterio de aceptación

- [x] `bookings_app/.env.example` existe, lista todas las variables que la app lee, y no tiene un
      solo valor real.
- [ ] Los dos repos leen Redis de `REDIS_URL`. `REDIS_HOST`/`PORT`/`USER`/`PASSWORD` no aparecen más
      en el código.
- [ ] Arrancar cualquiera de los dos repos con una variable requerida faltante **falla al boot**, con
      un mensaje que nombra la variable.
- [ ] No queda ningún `process.env.X!` con `!` en el código.
- [ ] El historial de git está auditado, y lo que haya aparecido está rotado.

## Si esto escalara

Aguanta bien: un esquema de variables validado al arranque es lo mismo con uno o con cien procesos.

El primer techo aparece con varios ambientes (staging, producción, preview por PR): mantener las
variables sincronizadas a mano entre ellos se vuelve el problema. El próximo movimiento sería un
secret manager con versionado y rotación, o la gestión de secretos del propio proveedor a nivel
organización. **A un ambiente, montar eso es sobreingeniería** — las variables del PaaS alcanzan y
sobran.

## Fuera de alcance

- **Secret manager dedicado** (Vault y similares). Ver `Descartado y por qué`.
- **Rotación automática de credenciales.**
- La decisión de qué proveedor de cada base → **TD-13**.

## Estado

- **Hecho:** `bookings_app/.env.example` — documenta las variables que la app lee hoy (incluidos los
  cuatro vars de Redis, tal como los lee `lib/redis-config.ts`), con `CHANGE_ME` en todo lo sensible.
  La config de entorno queda **documentada y asentada** como referencia.
- **Pendiente (código, corre local — desacoplado del deploy):** unificar Redis en `REDIS_URL` en los
  dos repos; validación del entorno al boot con Zod (que además elimina los `!` de `lib/s3.ts`); y la
  auditoría del historial de git con rotación de lo que aparezca. Los cuatro criterios de arriba sin
  tildar cubren esto — se pueden hacer sin destrabar TD-13, porque ninguno depende del deploy.
