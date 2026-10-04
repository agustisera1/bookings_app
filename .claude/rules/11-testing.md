---
paths:
  - "**/*.test.ts"
  - "vitest.config.ts"
---

# Testing (dimensión 11)

**Runner:** Vitest, en ambos repos. Corren en Node (sin entorno DOM): **lógica pura** —sin DB, sin
red, sin montar componentes— y los **services** con mocks acotados al borde (ver abajo).

| | |
|---|---|
| **Ubicación** | Colocado: `foo.ts` → `foo.test.ts` en la misma carpeta |
| **Alcance** | Lógica pura, viva donde viva. `greenaway`: `lib/**` (dominio: `policy`, `permissions`, filtros, fechas) y los `components/**/*-model.ts` (feature-models puros: reducers, derivados). Worker: `src/**` |
| **Config** | `vitest.config.ts` en la raíz de cada repo — `environment: "node"`; en `greenaway` el alias `@` → raíz resuelve los imports `@/…` |
| **Correr** | `greenaway` (pnpm): `pnpm test` / `pnpm test:watch`. Worker (npm): `npm test` / `npm run test:watch` |

**Qué entra a un test:** una función es testeable acá cuando es **pura** —determinística, sin
DB/red/React—. Los bordes son el punto: un caso a cada lado de un `<`/`<=`, con el límite exacto
explícito. Referencia canónica: `lib/bookings/policy.test.ts`.

**Sin mocks en la capa pura.** Si un test de lógica pura necesita un mock, es señal de que lo que
estás testeando no es puro y no corresponde acá. Los `*-model.ts` colocados junto a un componente
**sí** entran: son lógica pura, no rendering. Quedan fuera de esta capa los repos (son el acceso a
datos: necesitan DB real) y los componentes con render (`.tsx`, DOM).

## Tests de services (`lib/services/*`)

Los services **sí** se testean con mocks, pero sólo en el **borde**, nunca de la lógica. Se mockea la
identidad (`../authorize`) y el acceso a datos (`../repositories/*`); quedan **reales** las reglas
puras (`../bookings/policy`) y el mapeo de error (`pgErrorToCode` de `../postgres`). Lo que se testea
es la **orquestación**: gate de auth, validaciones de negocio y el `catch` que traduce el código PG a
un mensaje friendly.

**Regla de mock:** los módulos que abren conexión en el import (`../events` → BullMQ/Redis) o
arrastran `next/headers` (`../authorize`) van con `vi.mock(path, factory)` — el automock ejecutaría su
top-level. `../postgres` queda real: su `Pool` es lazy y nunca se consulta.

**Plantilla — un branch por test:** (1) auth falla → devuelve el fallo, el repo mutador **no** se
llama; (2) validación de negocio → early return, no escribe; (3) happy path → escribe con los args
**normalizados**; (4) el repo hace `throw {code}` → `pgErrorToCode` real → mensaje friendly (el caso
estrella: `23P01` de solape → `CONFLICT` con copy de cara al usuario). Referencia canónica:
`lib/services/bookings.test.ts`.
