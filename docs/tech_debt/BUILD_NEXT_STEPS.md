# BUILD_NEXT_STEPS.md — Deuda estructural del build

## 1. Módulos que abren I/O en el import — [TD-11](../tickets/TD-11-ci-pipeline.md)

- **Dónde:** `lib/mongo.ts` (`client.connect()` en el top-level, sin `await` ni `.catch()`) y
  `lib/events.ts` (construye las `Queue` de BullMQ, que conectan a Redis).

- **Qué pasa:** conectan como efecto del import, no cuando alguien los usa. `app/(app)/layout.tsx`
  los arrastra por transitividad vía `lib/services/notifications`, y Next ejecuta ese top-level
  durante *collecting page data*. Postgres no entra: su `Pool` es lazy.

- **Por qué duele:** `pnpm build` necesita Mongo y Redis **alcanzables**, no sólo las env vars
  presentes — un valor dummy pasa la validación de import, no un `connect()`. Por eso
  [`ci.yml`](../../.github/workflows/ci.yml) corre lint y test nada más, y **nada verifica tipos en
  CI**. El modo de falla exacto no está medido: para verlo, `pnpm build` con Mongo y Redis apagados.

- **Idea de fix:** mover la conexión detrás de una función lazy (`getMongoClient()`), para que el
  import quede inerte y el I/O ocurra en la primera llamada real. Con eso el build vuelve al CI.
  Parche sólo-CI si se pospone: `services:` con `mongo` y `redis` en el job.
