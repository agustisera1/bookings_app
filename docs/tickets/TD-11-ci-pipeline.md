# TD-11 — Pipeline de CI

| | |
|---|---|
| **Branch** | `chore/ci` |
| **Bloque** | Calidad |
| **Prioridad** | 🟠 Media |
| **Esfuerzo** | ~1-2 h |
| **Depende de** | **TD-10** (para el paso de tests) |
| **Origen** | Detectado al auditar el backlog — no había doc de deuda que lo cubriera |
| **Repos** | `bookings_app` (+ `bookings-worker`) |

## Problema

No hay CI. Ningún `.github/workflows/`, en ninguno de los dos repos. Nada verifica un branch antes
de que se mergee: ni typecheck, ni lint, ni build.

Que hoy funcione depende enteramente de acordarse de correr las cosas a mano.

## Por qué entra

**Deploy.** Es el ticket que hace que "desplegable" sea una afirmación verificable en vez de una
impresión.

Tiene además un precedente concreto en el propio historial del proyecto: `fix/permission-ref` fue un
`permission.ref` que no existía en el tipo y que **ponía en rojo el build de cualquier branch**. Un error de tipos de una línea que sobrevivió lo
suficiente como para bloquear trabajo no relacionado y merecer su propio branch en el ledger. Eso
es exactamente lo que un CI agarra en el primer push.

El backlog además está diseñado como una serie de branches independientes que se van a mergear de
a uno. Sin CI, cada merge es una apuesta.

## Alcance

Workflow de GitHub Actions en `bookings_app`, disparado en push y PR:

1. **Setup** — pnpm con cache de dependencias. ✅
2. **Typecheck** — `tsc --noEmit`. Hoy no existe como script suelto: hay que agregarlo. Es el paso
   que habría atajado `permission.ref`.
3. **Lint** — `pnpm lint`. ✅
4. **Test** — `pnpm test` (llega con TD-10). ✅
5. **Build** — `pnpm build`. ⏸️ Bloqueado: ver la nota al pie.

Detalle que vale la pena: los archivos generados de GraphQL (`lib/apollo/__generated__/`) **están
trackeados**. Un paso que corra `pnpm codegen` y falle si el diff no queda limpio detecta el caso
de alguien que tocó el schema y no regeneró — una desincronización que hoy solo aparece cuando
rompe en runtime.

**Worker:** un workflow análogo, más corto (`tsc` + build). No comparte lockfile ni pipeline con la
app; son deploys separados y conviene que los CI también lo sean.

> **El paso de build no entra por ahora.** No alcanza con valores dummy: `lib/mongo.ts` y
> `lib/events.ts` abren I/O en el import, así que el build necesita Mongo y Redis *alcanzables*, no
> sólo las env vars presentes. El detalle y el fix de raíz están en
> [`tech_debt/BUILD_NEXT_STEPS.md`](../tech_debt/BUILD_NEXT_STEPS.md) — punto 1. Mientras siga así,
> el workflow corre lint y test, y **nada verifica tipos en CI**: el typecheck del paso 2 es lo que
> tapa ese hueco sin depender de infra.
>
> Cuando el build vuelva: valores dummy en el workflow, **nunca** secretos reales en el repo.

## Criterio de aceptación

- [ ] Un PR muestra los checks corriendo y en verde.
- [ ] Un error de tipos introducido a propósito hace fallar el pipeline.
- [ ] Un cambio en `schema.graphql` sin regenerar hace fallar el pipeline.
- [ ] El worker tiene su propio workflow.
- [x] No hay secretos reales en el workflow.
- [ ] `pnpm build` corre en CI — depende de `tech_debt/BUILD_NEXT_STEPS.md` punto 1.

## Fuera de alcance

- **CD / deploy automático.** El proyecto no tiene ambiente de deploy definido; automatizar un
  destino que no existe es trabajo perdido.
- **Docker.** El repo de la app no tiene Dockerfile ni compose (solo el worker tiene un compose con
  Redis, aunque `CLAUDE.md` mencione Docker Compose como infra local). Es una brecha real, pero es
  otro ticket y solo se justifica si aparece un destino de deploy.
- Matriz de versiones de Node. Una sola versión, la del proyecto.
