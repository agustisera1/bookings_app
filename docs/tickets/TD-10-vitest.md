# TD-10 — Infra de tests + specs de `policy.ts`

| | |
|---|---|
| **Branch** | `chore/vitest` |
| **Bloque** | Calidad |
| **Prioridad** | 🔴 Alta |
| **Esfuerzo** | ~2-3 h |
| **Depende de** | — |
| **Origen** | [`tech_debt/CANCELLATION_FEATURE_NEXT_STEPS.md`](../tech_debt/CANCELLATION_FEATURE_NEXT_STEPS.md) § `chore/vitest` |
| **Repos** | `bookings_app` |

## Problema

El proyecto **no tiene ninguna infra de tests**: ni `vitest` ni `jest` en `devDependencies`, ni
script `test` en `package.json`. Verificado en los dos repos — el worker tampoco.

Lo que lo vuelve más notorio: `lib/bookings/policy.ts` se diseñó **puro a propósito** —sin DB, sin
React, sin framework— explícitamente para poder testearlo sin levantar nada. Se justificó esa
decisión de diseño en su momento y se entregó sin un solo test. La arquitectura pagó el costo de
ser testeable y nunca cobró el beneficio.

## Por qué entra

**Deploy**, sin vueltas.

"Sólido y desplegable" no significa que funcione hoy: significa que se pueda cambiar algo mañana
sin miedo. Sin ninguna verificación automatizada, cada refactor del backlog —TD-03 tocando la query
de disponibilidad, TD-08 reescribiendo la autorización del chat, TD-12 moviendo los estados que
liberan un slot— se valida a mano y a ojo.

Es también **habilitante**: TD-11 (CI) no tiene qué correr hasta que esto exista, y varios tickets
de este backlog se verifican mucho mejor con tests que con clicks.

Y el primer sujeto ya está elegido y es el ideal que va a haber: funciones puras, sin mocks, con
`Date` fijas y objetos literales. Si no se testea `policy.ts`, no se va a testear nada.

## Alcance

**1. Infra:** `vitest` en `devDependencies`, config mínima, script `test` (y `test:watch`) en
`package.json`. Sin entorno de DOM por ahora — lo que se va a testear es lógica pura.

**2. Specs de `lib/bookings/policy.ts`.** Los casos ya están enumerados en el doc de origen:

- La ventana de 48 h de `refundFor`: justo antes, justo después, y **el borde exacto**.
- `canCancel` con `hasStarted` en el límite (`now === start_date`).
- Host cancelando una `accepted` → reembolso total, sin importar la proximidad al check-in.
- Guest cancelando una `pending` → reembolso total aunque falten 2 horas.
- Estados terminales (`rejected` / `cancelled`) → siempre rechaza.
- Host sobre una `pending` → rechaza y sugiere `rejectBooking`.

Los bordes son el punto: son exactamente donde un `<` en vez de un `<=` pasa desapercibido para
siempre.

**3. Documentar la convención** (dónde viven los tests, cómo se corren) donde corresponda en
`CLAUDE.md`.

## Criterio de aceptación

- [ ] `pnpm test` corre y pasa.
- [ ] Los seis casos de arriba están cubiertos, con los bordes explícitos.
- [ ] Ningún test necesita DB, red ni montar un componente.
- [ ] La convención queda escrita para que el próximo test no tenga que inventarla.

## Fuera de alcance

- **Tests de componentes / E2E.** Requieren entorno de DOM o browser y son otro orden de esfuerzo.
- **Tests de services o repos.** Necesitan DB o mocks; `policy.ts` se eligió justamente porque no.
- **Tests en el worker.** Mismo problema, otro repo, otro ticket si hace falta.
- Cobertura como métrica. No aporta nada a esta escala.
