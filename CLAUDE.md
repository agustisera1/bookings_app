# Bookings App — CLAUDE.md

Marketplace de reservas de alojamientos (estilo Airbnb simplificado). Objetivo de aprendizaje: persistencia políglota, procesamiento asíncrono y APIs GraphQL.

## Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS v4
- **Package manager**: pnpm
- **API**: REST simple en Fase 1, GraphQL (Apollo Server) desde Fase 2
- **DBs**: PostgreSQL (núcleo transaccional), MongoDB (listados), Redis (locks/cache/sesiones), Elasticsearch (búsqueda)
- **Cola de mensajes**: RabbitMQ (o Redis Streams para Fase 4)
- **Auth**: JWT (access + refresh)
- **Infra local**: Docker Compose

## Roles de usuario

| Rol   | Descripción                                                   |
|-------|---------------------------------------------------------------|
| Guest | Busca, reserva, deja reseñas                                  |
| Host  | Crea y administra listados, gestiona reservas recibidas       |

Un usuario puede tener rol guest y host simultáneamente. El rol admin se quitó del sistema
(migración `006` dropea `users.is_admin`).

## Modelo de datos

### PostgreSQL (transaccional)
- `USERS`: id, email, password_hash, name, is_host, created_at
- `BOOKINGS`: id, listing_id (ref MongoDB), guest_id, start_date, end_date, status, total_price, created_at
- `REVIEWS`: id, booking_id, author_id, rating (1-5), comment, host_reply, created_at

### MongoDB (listados — desde Fase 2)
- `LISTINGS`: _id, type, host_id, title, description, price, location, attributes, photos, created_at
- `attributes` varía según `type`: `accommodation` | `experience` | `equipment`

## Plan de fases

1. **Fase 1** — Solo PostgreSQL: auth + RBAC, CRUD de listados (solo `accommodation`), reservas sin solapamiento, reseñas
2. **Fase 2** — MongoDB: migrar listados, múltiples tipos, API GraphQL
3. **Fase 3** — Redis: locks de concurrencia en reservas, cache de disponibilidad, sesiones
4. **Fase 4** — Elasticsearch: búsqueda full-text y filtros; cola de mensajes para sincronizar Mongo → ES
5. **Fase 5** — Workers: notificaciones email por eventos de reserva, trazabilidad
6. **Fase 6** — Hardening: Nginx (rate limiting), Prometheus/Grafana, OpenTelemetry, pruebas de carga (k6)

## Reglas clave

- Las reservas deben ser atómicas: sin solapamiento de fechas para el mismo listado, incluso bajo concurrencia (RNF-01)
- El índice de búsqueda puede tener lag de segundos respecto a la fuente de verdad (RNF-02)
- Cada mutación GraphQL valida rol y ownership del recurso (RNF-05)
- Notificaciones y sincronización de búsqueda son siempre asíncronas (RNF-04)

## Comandos

```bash
pnpm dev      # servidor de desarrollo
pnpm build    # build de producción
pnpm lint     # linting
```

## Documentación — `/docs`

| Carpeta | Qué vive ahí |
|---------|-------------|
| `docs/architecture/` | Decisiones de arquitectura (ADRs): transporte realtime, colas BullMQ |
| `docs/tech_debt/` | **Deuda técnica conocida.** `PERFORMANCE.md` (backlog de tuning, por impacto) + un `<FEATURE>_NEXT_STEPS.md` por feature |
| `docs/tickets/` | **Backlog priorizado.** Un `TD-XX-*.md` por tarea = un branch. `README.md` tiene el criterio de triage, la tabla y el grafo de dependencias |
| `docs/insights/` | Notas de aprendizaje sobre APIs y conceptos |
| `docs/guides/` | Setup de servicios externos |

**Relación entre los dos primeros:** `tech_debt/` responde *por qué esto es deuda*; `tickets/`
responde *qué hago y cómo sé que terminé*. Se enlazan, no se duplican. Un ítem de deuda que se
decide trabajar lleva su marca `TD-XX` inline; el que se descarta se saca de `tech_debt/` (que es un
backlog de trabajo, no un archivo histórico) y su motivo de descarte va a la sección **"Descartado y
por qué"** del `README.md` de `tickets/`. Esa lista no se borra: lo que evaluaste y decidiste no
hacer, con el motivo, es tanta evidencia de criterio como el backlog mismo.

### Regla de deuda técnica

**La deuda técnica se documenta en `docs/tech_debt/`, no en comentarios del código.** Cuando
se identifica un costo conocido, una simplificación deliberada o algo que hay que revisitar:

- Va a `PERFORMANCE.md` si es un costo de queries/rendering, siguiendo el formato existente
  (**Dónde / Qué pasa / Por qué duele / Cómo medirlo / Idea de fix**), ordenado por impacto.
- Va a `<FEATURE>_NEXT_STEPS.md` si es estructural de una feature (contratos, límites entre
  servicios, gaps funcionales).
- En el código queda **como mucho un puntero de una línea** al doc correspondiente.

El motivo es que la deuda se revisa en bloque cuando se prioriza, no leyendo docstrings uno
por uno. Un bloque de deuda enterrado en un comentario es deuda que nadie va a encontrar.

## Librería compartida — `/lib`

Antes de escribir cualquier utilidad, formatter o constante en un componente, **verificar si ya existe en `/lib`**. Si no existe y es reutilizable, agregarla ahí. No duplicar lógica.

| Archivo | Qué contiene |
|---------|-------------|
| `lib/utils.ts` | `cn` (classnames), `formatPrice`, `bookingStatusVariant`, `listingTypeGradient` |
| `lib/dates.ts` | `parseTs`, `formatDate`, `calcNights`, `datePickerTriggerClass` |
| `lib/types/index.ts` | Tipos compartidos (`ServiceResult`, etc.) |
| `lib/services/*` | Lógica de negocio server-side (siempre retornan `ServiceResult`) |
| `lib/bookings/policy.ts` | Reglas puras del ciclo de vida de una reserva: transiciones legales, `canCancel`, `refundFor` |
| `lib/apollo/*` | Cliente Apollo, resolvers, schema, tipos generados |
| `lib/postgres.ts` | Cliente PostgreSQL y helpers de error |
| `lib/mongo.ts` | Cliente MongoDB |
| `lib/permissions.ts` | Roles, permisos y helpers de autorización |
| `lib/jwt.ts` | Sign/verify de tokens |
| `lib/events.ts` | Colas BullMQ: conexión, `*Queue`, contratos `*Payload` y mappers `to*Payload` |

> **Colas / workers (BullMQ + Redis):** antes de agregar un worker, job processor o payload de cola, leer `docs/architecture/BULLMQ_QUEUES.md`. Define el contrato del payload, las convenciones (`processorKey`, fechas ISO, sin secretos) y el paso a paso en el producer y en el worker. El productor encola desde `lib/services/*`; el contrato se replica a mano en el repo del worker.

### Regla DRY

- **Formatters de fecha** (`formatDate`, `calcNights`, `parseTs`) → siempre de `lib/dates.ts`
- **Formatters de precio** (`formatPrice`) → siempre de `lib/utils.ts`
- **Variantes de badge por status** (`bookingStatusVariant`) → siempre de `lib/utils.ts`
- **Tipos de dominio** → siempre de `lib/types/index.ts` o del service correspondiente
- Si una función aparece en más de un componente → moverla a `/lib` antes de copiarla

### Regla de cohesión y acoplamiento

**Siempre que se agregue código, evaluar los agregados desde la perspectiva de alta cohesión y bajo acoplamiento.** Antes de dar por cerrado un cambio, preguntarse:

- **Cohesión:** ¿las piezas que agregué que se referencian entre sí viven juntas? Un conjunto que forma una unidad conceptual (p. ej. un tipo + sus transiciones + sus defaults + sus derivados) debería estar en un mismo lugar, no disperso.
- **Acoplamiento:** ¿estoy mezclando cosas con dependencias distintas? Lógica pura (sin React, sin DB, sin framework) no debería quedar enredada con rendering o I/O. Si una parte no depende de React y la otra es toda React, separarlas baja el acoplamiento y sube la testeabilidad.
- **Dónde ubicarlo:** dominio/utils general → `/lib`; estado o lógica pura específica de una feature → módulo colocado al lado del componente (`.ts` sin `"use client"`), importado de vuelta por el componente. Ref: `components/search/filters-draft.ts` (modelo del draft) consumido por `components/search/filters.tsx` (rendering + wiring).

Esta evaluación es parte de "terminar" un cambio, igual que pasar `tsc`/`lint`.

### Regla de tipos — revisar SIEMPRE antes de escribir uno nuevo

**Antes de declarar cualquier `type`/`interface` nuevo — sea para una feature o un ajuste — revisar primero las bibliotecas de tipos existentes y reutilizar/derivar en vez de re-inlinear.** Escribir un tipo desde cero es la última opción, no la primera. Esta verificación es obligatoria y precede a escribir el tipo, igual que buscar en `/lib` antes de escribir una utilidad.

**Dónde buscar antes (en este orden):**

| Fuente | Qué vive ahí | Ejemplos |
|--------|--------------|----------|
| `lib/types/*` | Tipos de dominio (entidades, `ServiceResult`, `ErrorCode`) | `User`, `Booking`, `ListingDocumentValues` |
| `lib/events.ts` | Contratos de cola `*Payload` y sus mappers `to*Payload` | `BookingEmailPayload`, `toBookingEmailPayload` |
| El service correspondiente | Tipos de parámetros y re-exports del dominio | `CreateBookingParams` |
| `__generated__/resolvers-types.ts` / `operations.ts` | Tipos de schema/inputs y de operaciones GraphQL | `FiltersInput`, `GetListingsQuery` |

**Cómo reutilizar en vez de duplicar:**

- Si un tipo nuevo comparte forma con uno existente, **derivarlo** con `Pick`/`Omit`/`Partial`/`&` o `ReturnType`, no re-escribir los campos a mano. Un sub-shape que ya existe (p. ej. `BookingEmailPayload["booking"]`) se referencia, no se re-inlina.
- Si la misma forma aparece en más de un módulo → extraerla a su lugar canónico (`lib/types/*` si es dominio; `lib/events.ts` si es contrato de cola; al lado del componente si es estado de feature) **antes** de copiarla. Es la regla DRY de `/lib` aplicada a los tipos.
- Un tipo va donde ya viven sus pares conceptuales (cohesión): dominio → `lib/types/*`; wire contract + mapper → `lib/events.ts`; params de un service → el propio service; estado puro de feature → módulo colocado junto al componente.

> **Anti-patrón concreto (a no repetir):** re-inlinear el shape `{ id, checkIn, checkOut, guests, totalPrice }` en tres lugares (el `*Payload`, el input del mapper y el param del helper) en vez de definirlo una vez y derivar las variantes. Si estás por escribir una forma que "se parece" a otra, casi siempre corresponde derivar.

---

## Patrón de error handling en servicios

Todo service en `lib/services/*` devuelve `ServiceResult` (ver `lib/types/index.ts`). El manejo de errores sigue este esquema, que separa errores de negocio conocidos de errores inesperados del sistema.

### Regla fundamental

**Nunca reenviar `error.message` al cliente.** Los mensajes de error de PostgreSQL o de Node exponen detalles de implementación (nombres de constraints, columnas, tablas, stack traces). Solo los mensajes escritos explícitamente en el service llegan al cliente.

### Estructura obligatoria del catch

```ts
} catch (error) {
  const code = db.pgErrorToCode(error);

  // Errores de negocio conocidos: devolver mensaje friendly específico
  if (code === "CONFLICT") {
    return { ok: false, error: "Mensaje específico para el usuario", code };
  }

  // Error inesperado: loguear server-side, devolver genérico al cliente
  console.error("[nombreDeLaFuncion]", error);
  return { ok: false, error: "Could not complete the operation", code };
}
```

### Tabla de códigos PG → ErrorCode

| Código PG | Causa | `ErrorCode` | Acción en el catch |
|-----------|-------|-------------|-------------------|
| `23505` unique_violation | Email/campo único duplicado | `CONFLICT` | Devolver mensaje friendly |
| `23P01` exclusion_violation | Solapamiento de fechas (reservas) | `CONFLICT` | Devolver mensaje friendly |
| `23503` foreign_key_violation | FK referencia un registro inexistente | `NOT_FOUND` | Devolver mensaje friendly |
| `23502` not_null_violation | Campo requerido faltante | `VALIDATION` | Devolver mensaje friendly |
| `23514` check_violation | Valor fuera del rango permitido | `VALIDATION` | Devolver mensaje friendly |
| Cualquier otro | Error del sistema | `UNEXPECTED` | `console.error` + mensaje genérico |

### Errores de negocio fuera del try/catch

Los errores de lógica que se detectan **antes** de tocar la base de datos se devuelven directamente como `ServiceResult`, sin throw. El throw dentro de un try/catch es solo para hacer que el flujo caiga al catch; como manejamos el flujo con early returns, no es necesario.

```ts
// ✅ Correcto: early return, no throw
if (bookings.length === 0)
  return { ok: false, error: "You need a completed booking to leave a review", code: "FORBIDDEN" };

// ❌ Incorrecto: throw que cae al catch con error.message expuesto
throw new Error("No bookings found");
```

### Reglas adicionales

| Situación | Solución |
|-----------|----------|
| Error inesperado | `console.error("[fn]", error)` siempre antes del return |
| Formato del log | `"[nombreDeLaFuncion]"` entre corchetes |
| Mensaje al cliente en UNEXPECTED | Siempre genérico ("Could not …") — nunca `error.message` |
| Consumer (componente/route handler) | Mostrar `result.error` tal cual — ya es un string friendly |

### Consumer: manejo en formularios

```ts
async function onSubmit(data: FormValues) {
  const result = await myService(data);
  if (!result.ok) {
    toast.error(result.error);  // ya es friendly, se puede mostrar directo
    throw new Error(result.error);  // evita que RHF marque isSubmitSuccessful = true
  }
  // happy path
}
```

---

## Arquitectura de componentes (UI)

Los componentes se organizan en tres capas. **Antes de escribir markup nuevo, buscar si el patrón ya existe como primitivo** — es la regla DRY de `/lib`, aplicada a la UI.

```
components/ui/        Primitivos vendorizados de shadcn / Base UI. NO editar a mano
      ↑               (se regeneran con `shadcn add`): Button, Input, Card, Dialog…
components/common/    Primitivos propios reutilizables, construidos sobre ui/.
      ↑               Agnósticos al dominio: no conocen bookings, listings, etc.
components/<feature>/ Componentes de feature: componen common/ + ui/ + servicios.
                      bookings/, listings/, reviews/, layout/, search/
```

Regla de dependencia: `feature → common → ui`. Un primitivo de `common/` **nunca** importa de una feature ni llama a un service: recibe datos y callbacks por props. Los archivos de `ui/` son código vendorizado — si algo de shadcn no alcanza, se envuelve en `common/`, no se edita en `ui/`.

### Catálogo de `components/common/`

| Primitivo | Qué resuelve | Server-safe |
|-----------|--------------|-------------|
| `Field`, `FieldError`, `FormField` | Fila de formulario: label + control + error. `FormField` es la forma canónica | ✓ |
| `StarRating` / `StarRatingInput` | Rating de estrellas: display de solo lectura vs. picker interactivo | Client |
| `ConfirmDialog` | Confirmación de acción destructiva (encapsula open + pending + retry) | Client |
| `EmptyState` | Estado vacío centrado (icono + título + descripción + acción) | ✓ |
| `PriceLabel` | Precio "por noche" formateado con `formatPrice` | ✓ |
| `DatePicker` | Campo de fecha única: trigger (ícono + fecha formateada) + `Calendar` en `Popover`. `open`/`onOpenChange` opcionales para coordinar pickers hermanos | Client |
| `PageLayout` | Shell de página: heading grande sticky + contenido scrollable, con slots `actions`/`toolbar`. Es el borde de la ruta | ✓ |
| `Section` | Encabezado (título + subtítulo) sobre un bloque **dentro** de una página, con `Card` opcional | ✓ |

### Reglas de consistencia

| Situación | Solución |
|-----------|----------|
| Encabezado + estructura de una página (ruta) | `PageLayout` con `title` (y `subtitle`/`actions`/`toolbar` opcionales) — nunca rearmar el `<div className="p-10 flex flex-col …">` con un `<h1>` a mano |
| Bloque titulado **dentro** de una página | `Section` (h2). Regla de altitud: `PageLayout` en el borde de la ruta, `Section` para los bloques que viven adentro |
| Fila de formulario (label + control + error) | `FormField` — nunca reconstruir el `<div className="flex flex-col gap-1.5">` a mano |
| Mensaje de error de un campo suelto | `FieldError` (o el prop `error` de `FormField`) — nunca `<p className="text-xs text-destructive">` |
| Área de texto | `Textarea` de `ui/` — nunca un `<textarea>` con clases crudas |
| Precio "por noche" | `PriceLabel` — centraliza el formato en `formatPrice` |
| Rating de estrellas | `StarRating` (display) / `StarRatingInput` (form, vía `Controller`) |
| Campo de selección de fecha | `DatePicker` de `components/common/date-picker.tsx` — nunca rearmar `Popover` + `Calendar` + `datePickerTriggerClass` + trigger a mano. Refs: `bookings/booking-form.tsx`, `search/filters.tsx` |
| Estado vacío con protagonismo | `EmptyState` centrado; para un status inline compacto dentro de una lista, un `<p className="text-sm text-muted-foreground">` es más liviano |
| Acción destructiva fuera de un form | `ConfirmDialog` (ver "Patrón de acciones de confirmación") |
| Icono como dato hacia un Client Component | Pasar el elemento renderizado (`icon={<X />}`), nunca la referencia al componente (rompe la serialización RSC) |

### Diseño de estados

Un componente que consume datos async (`use(promise)` sobre un `ServiceResult`) debe cubrir **explícitamente los tres estados**: error, vacío y cargado. Referencias: `components/reviews/listing-reviews.tsx`, `components/bookings/listing-bookings.tsx`.

```tsx
const res = use(promise);
if (!res.ok) return <p className="text-sm text-muted-foreground">Could not load…</p>;
if (res.data.length === 0) return <EmptyState … /> /* o <p> inline si es compacto */;
return <List data={res.data} />;
```

### Partición de un componente de feature en archivos

Cuando un componente de feature crece y **acumula varios sub-componentes, mezcla lógica pura con rendering, o junta estado/efectos con presentación**, se parte en una carpeta de feature con un archivo por responsabilidad. No es fragmentar por fragmentar: cada archivo aísla una dependencia distinta (React vs. lógica pura, estado vs. markup), lo que baja el acoplamiento y sube la testeabilidad — es la regla de cohesión/acoplamiento aplicada al árbol de archivos.

**Disparadores (cualquiera basta):**
- El archivo acumula muchos componentes internos y cuesta ubicarse.
- Hay lógica pura (transformación de datos, derivados) enredada con JSX.
- Conviven un hook con estado/efectos y componentes puramente presentacionales.

**Roles y dónde va cada uno:**

| Archivo | Responsabilidad | `"use client"` |
|---------|-----------------|----------------|
| `<feature>.tsx` | Orquestador: default export, cablea las piezas, sostiene el hook y el layout | Sí (usa el hook) |
| `use-<feature>.ts` | Hook: estado, efectos, fetch | Sí |
| `<feature>-model.ts` | **Lógica pura**: transformaciones, derivados y los tipos de esos derivados. Sin React, sin I/O | No |
| `types.ts` | Tipos de la feature compartidos entre las piezas | No (solo tipos) |
| `<pieza>.tsx` | Cada bloque presentacional (header, item, composer, estados…) | Solo si tiene hooks/interactividad |

**Regla de `"use client"`:** solo el orquestador y el hook (y cualquier pieza con estado/eventos propios) llevan la directiva. Un componente presentacional **sin hooks no la necesita** aunque se renderice dentro del árbol cliente: lo arrastra su importador. Ponerla de más agranda el bundle cliente sin motivo.

**Lógica pura fuera del rendering:** toda transformación que no dependa de React va a un módulo `.ts` colocado (mismo criterio que `components/search/filters-draft.ts`). Así se testea sin montar nada y el componente solo compone. Ubicar ahí también el sort/derivado que el orquestador no necesita conocer.

**Naming:** archivos en kebab-case; prefijo de feature cuando ayuda a desambiguar (`chat-header.tsx`, `message-bubble.tsx`). El default export vive en `<feature>.tsx`.

**Dependencias:** la partición **no** rompe `feature → common → ui`. Las piezas importan de `common/` y `ui/`, nunca de otra feature.

**Referencia canónica:** `components/chat/` — `chat.tsx` (orquestador) + `use-booking-chat.ts` (hook) + `thread-model.ts` (lógica pura del hilo, testeable) + `types.ts` + piezas presentacionales (`chat-header`, `message-thread`, `message-bubble`, `chat-composer`, `chat-states`, `chat-avatar`).

> La UI ya construida todavía no sigue este patrón en todos lados; se aplica de forma **gradual** (refactor futuro, no bloqueante). Cuando un componente de feature toque los disparadores de arriba, partirlo es parte de "terminar" el cambio.

---

## Patrón de formularios (RHF + Zod)

Todo formulario en este proyecto sigue este patrón. Referencias canónicas:
- `components/bookings/booking-form.tsx`
- `components/reviews/review-form.tsx`

### Estructura obligatoria

```tsx
// 1. Schema Zod — fuera del componente, exportar el tipo inferido
const mySchema = z.object({ ... });
export type MyFormValues = z.infer<typeof mySchema>;

// 2. useForm con zodResolver
const {
  control,
  register,
  handleSubmit,
  formState: { errors, isSubmitting, isSubmitSuccessful },
} = useForm<MyFormValues>({
  resolver: zodResolver(mySchema),
  defaultValues: { ... },
});

// 3. onSubmit recibe los datos ya validados y tipados
async function onSubmit(data: MyFormValues) { ... }

// 4. Render del éxito con isSubmitSuccessful (sin useState extra)
if (isSubmitSuccessful) return <SuccessUI />;
```

### Reglas

| Situación | Solución |
|-----------|----------|
| Fila de campo (label + control + error) | `FormField` de `components/common/field.tsx`: `<FormField label htmlFor error={errors.x?.message}>…control…</FormField>` |
| Control de entrada | `Input` / `Textarea` de `ui/` con `{...register("field")}` — nunca un elemento nativo con clases crudas |
| Componente controlado (Calendar, Select de Shadcn, `StarRatingInput`) | `<Controller control={control} name="field" render={...} />` |
| Observar un campo reactivamente | `useWatch({ control, name: "field" })` — **no** `watch("field")` (incompatible con React Compiler) |
| Función impura en el render de un Client Component (`Date.now()`, `Math.random()`) | Capturarla una sola vez con `useState(() => Date.now())` — nunca llamarla directo en el cuerpo del render (el React Compiler lo marca como impuro). Regla general de pureza, no solo en forms. Ref: `components/bookings/user-bookings.tsx` |
| Estado de envío | `isSubmitting` de RHF — **no** `useState` |
| Estado de éxito | `isSubmitSuccessful` de RHF — **no** `useState` |
| Estado puramente visual (hover, popover open) | `useState` local — no pertenece a RHF |
| Estado local estructurado/complejo (varios campos relacionados + múltiples transiciones; p. ej. un panel de filtros con draft) | `useReducer`, no una maraña de `useState`. Reducer + acciones + defaults a nivel módulo (pensar en colocarlo aparte), acciones semánticas, y el componente solo despacha intención. El estado puramente visual (open, valor vivo de un slider) queda como `useState`. Ref: `components/search/filters.tsx` |
| Mensajes de error | prop `error` de `FormField`, o `FieldError` suelto — nunca `<p className="text-xs text-destructive">` a mano |
| Atributo `required` en inputs | Omitir — Zod ya lo valida |

---

## Patrón de acciones de confirmación (`ConfirmDialog`)

Para acciones destructivas o irreversibles disparadas fuera de un formulario RHF (eliminar, cancelar, etc.), no usar `alert()`/`confirm()` nativos ni un `onClick` directo al service. Usar **`ConfirmDialog`** (`components/common/confirm-dialog.tsx`), que encapsula el estado `open` + `isPending` + retry. Referencias canónicas:
- `components/bookings/cancel-booking-button.tsx`
- `components/listings/delete-listing-button.tsx`

### Estructura obligatoria

El componente de feature solo aporta el trigger y el `onConfirm` (que llama al service). `ConfirmDialog` maneja el resto.

```tsx
"use client";

export function MyActionButton({ id }: { id: string }) {
  async function handleConfirm() {
    const result = await myService(id);
    if (!result.ok) {
      toast.error(result.error); // ya es friendly, se muestra directo
      return false; // devolver false mantiene el diálogo abierto para reintentar
    }
    toast.success("Mensaje de éxito");
    // devolver undefined/true cierra el diálogo
  }

  return (
    <ConfirmDialog
      tooltip="Eliminar"                       // opcional: envuelve el trigger en Tooltip
      trigger={
        <Button variant="ghost" size="icon-sm">
          <Icon />
          <span className="sr-only">Eliminar</span>
        </Button>
      }
      title="¿Confirmar acción?"
      description="Explicar qué pasa y si es irreversible."
      confirmLabel="Sí, eliminar"
      pendingLabel="Eliminando…"               // gerundio durante el request
      onConfirm={handleConfirm}
    />
  );
}
```

### Reglas

| Situación | Solución |
|-----------|----------|
| Confirmación antes de ejecutar | `ConfirmDialog` — nunca `window.confirm` ni un `AlertDialog` armado a mano |
| Trigger | Pasar un `<Button>` plano por `trigger`; `ConfirmDialog` lo compone con `AlertDialogTrigger` internamente. **No** pre-envolver el trigger en `AlertDialogTrigger` en un Server Component (rompe la hidratación) |
| Tooltip sobre el trigger | Prop `tooltip="…"` — `ConfirmDialog` arma la composición `Tooltip → AlertDialogTrigger` del lado cliente |
| Error del service | `toast.error(result.error)` y `return false` desde `onConfirm` — mantiene el diálogo abierto para reintentar |
| Éxito del service | `toast.success(...)` y devolver `undefined`/`true` — cierra el diálogo |
| Texto del botón de confirmar durante el request | `pendingLabel` en gerundio ("Deleting…", "Cancelling…") |
| Diálogo con contenido propio (p. ej. un form con textarea) | No usar `ConfirmDialog`; armar `AlertDialog` a mano con el mismo contrato de estados. Referencia: `components/bookings/manage-booking-actions.tsx` |
| Botón que dispara solo un mock (sin service real) | `alert("...")` directo en el `onClick`, sin diálogo — reservar el diálogo para acciones con efecto real |

---

## Arquitectura de `lib/`

### Capas y responsabilidades

```
components / app/          Entry points (Server Actions, GraphQL resolvers, route handlers)
      ↓
lib/services/              Lógica de negocio: auth, validación de permisos, reglas de dominio
      ↓
lib/repositories/          Acceso a datos: queries a una única DB, sin lógica de negocio
      ↓
lib/types/                 Tipos de dominio compartidos entre capas
```

Cada capa solo conoce a su vecina inmediata hacia abajo. Los componentes no importan de `repositories/`, los repositorios no importan de `services/`.

---

### `lib/types/` — Tipos de dominio

Tipos que representan entidades del negocio, independientes de la DB y del cliente.

| Archivo | Tipos |
|---------|-------|
| `index.ts` | `ServiceResult<T>`, `ErrorCode` |
| `user.ts` | `User`, `PublicUser`, `SessionRecord`, `CurrentUser` |
| `booking.ts` | `Booking`, `GuestBooking` |
| `review.ts` | `Review` |

**Regla:** los services re-exportan los tipos que consumen para mantener compatibilidad hacia arriba (`export type { Booking } from "../types/booking"`). Los consumers pueden importar del service o del archivo de types — ambos son válidos.

---

### `lib/repositories/` — Acceso a datos

Una función por operación. El nombre del archivo indica la DB: `.pg.ts` para PostgreSQL, `.mongo.ts` para MongoDB.

| Archivo | Operaciones |
|---------|-------------|
| `users.pg.ts` | `findUserByEmail`, `createUser` |
| `sessions.pg.ts` | `findValidSession`, `createSession`, `rotateSession`, `deleteSessionsByUser` |
| `bookings.pg.ts` | `findBookingsByGuestId`, `createBookingRecord`, `hasGuestBookingForListing`, `updateBooking` |
| `reviews.pg.ts` | `findReviewsByListingId`, `createReviewRecord` |
| `listings.mongo.ts` | `findListingById`, `findListings`, `findListingsByIds` |
| `notifications.mongo.ts` | `getNotifications`, `getNotificationsCount`, `updateNotification` |

**Reglas:**
- Sin `"use server"`, sin `authorize()`, sin lógica de negocio
- Reciben y devuelven tipos de dominio (`lib/types/`), nunca tipos de DB crudos hacia afuera
- No tienen try/catch — los errores propagan al service que los llama

#### Los repositorios NO manejan lógica de negocio

Un repositorio expone **operaciones de datos genéricas**, no acciones de dominio. Traduce parámetros ↔ query y devuelve filas; no *decide* nada del negocio. La decisión ("marcar una notificación como leída", "rechazar una reserva") vive en el service; el repo solo ofrece el `update`/`insert`/`select` que esa decisión necesita.

**Qué es acceso a datos (va en el repo):**
- CRUD y queries parametrizadas; proyección de tipos de DB a dominio (p. ej. `_id: ObjectId` → `string`).
- **Scoping por ownership en el `WHERE`** (`... AND guest_id = $2`, `{ target_id: userId }`): es un predicado de query, patrón aceptado. Refs: `findBookingsByGuestId`, `updateNotification`.
- Atomicidad a nivel DB (CTEs, transacciones). Ref: `rotateSession`.

**Qué es lógica de negocio (NO va en el repo → va en el service):**
- Autorización (`authorize`), validación de reglas, orquestación de varias operaciones.
- **Codificar qué valores de dominio "cuentan"**: el conjunto de estados, umbrales o defaults que representan una regla del negocio. Si cambia la regla y hay que editar el repo, la regla estaba en el lugar equivocado.

**Convención de nombres — operación genérica, no acción de dominio:**

| ✅ Repo (genérico, orientado a datos) | ❌ Repo (acción de dominio disfrazada) |
|---|---|
| `updateNotification(id, userId, values: Partial<…>)` | `markAsRead(id)` |
| `updateBooking(id, values: Partial<…>)` | `rejectBooking(id)` / `acceptBooking(id)` |

El nombre de dominio (`markAsRead`, `rejectBooking`) es el del **service**, que delega en el `update*` genérico del repo pasando los `values` concretos. Modelo canónico: `notificationsService.markAsRead` → `notificationsRepo.updateNotification(id, userId, { is_read: true })`. El tipo de `values` se deriva del dominio con `Pick` (`UpdateBookingFields`, `UpdateNotificationFields`), nunca se re-inlinea.

> **Deuda técnica conocida (refactor futuro, no tocar sin pedirlo):** `bookings.pg.ts` → `findBookedListingIds` hardcodea en el `WHERE` los estados que liberan un slot (`status NOT IN ('cancelled', 'rejected')`). Ese conjunto es una regla de negocio (qué estados invalidan disponibilidad) filtrada dentro del repo. Refactor ideal: definir esos estados en el dominio/service y pasarlos como parámetro, o exponerlos como constante compartida. Hasta entonces, no replicar el patrón en repos nuevos.

---

### `lib/services/` — Lógica de negocio

Todos los services son `"use server"`. Cada función sigue este flujo:

```
1. authorize(permissionKey)   → verifica identidad y permisos
2. validación de negocio      → early return si aplica (sin throw)
3. try { repo calls }         → delega el acceso a datos al repositorio
   catch (error) {            → traduce errores de DB a mensajes friendly
     pgErrorToCode(error)
   }
```

**Regla de parámetros:** los services no importan tipos de componentes (`FormValues`). Reciben tipos planos (`{ checkIn: Date; guests: number; ... }`). Los componentes pasan sus form values que coinciden con esos shapes.

**Regla de reglas puras:** una regla de dominio que la UI también necesita evaluar (¿se puede cancelar?, ¿cuánto reembolsa?) **no** va dentro del service. Los services son `"use server"`: todo lo que exportan se vuelve una Server Action async, así que no pueden exportar un predicado sync que un componente use en render. Esas reglas van en un módulo puro aparte — sin `"use server"`, sin DB, sin React — que el service y el componente importan por igual. Así el botón nunca ofrece una acción que el server va a rechazar, y la regla es testeable sin levantar nada. Ref: `lib/bookings/policy.ts` (`canCancel`, `refundFor`) consumido por `lib/services/bookings.ts` y `components/bookings/cancel-booking-button.tsx`.

---

### Auth — cómo fluye la identidad

**Server Actions / RSC directos:**
`cookies()` de `next/headers` accede al JWT del request actual via AsyncLocalStorage. `authorize()` llama a `getCurrentUser()` que lee de ahí.

**GraphQL (Apollo Server):**
El Apollo Client (RSC) reenvía las cookies del request original en el header HTTP. El handler de `/api/graphql` las recibe en su propio contexto de Next.js, por lo que `authorize()` en los resolvers funciona igual que en Server Actions.

```
Browser → cookies → Next.js (AsyncLocalStorage store A)
                        ↓ RSC Apollo Client reenvía cookies
                    /api/graphql (AsyncLocalStorage store B: mismas cookies)
                        ↓
                    authorize() → getCurrentUser() → ✓
```

**Configurado en:** `lib/apollo/client.ts` (reenvío de cookies) y `lib/authorize.ts` (verificación de permisos).

---

### GraphQL — de dónde importar los tipos generados

`pnpm codegen` produce **dos** archivos en `lib/apollo/__generated__/`, con responsabilidades distintas. La configuración vive en `codegen.ts`:

| Archivo | Plugins | Contiene | Fuente |
|---------|---------|----------|--------|
| `resolvers-types.ts` | `typescript` + `typescript-resolvers` | Tipos del schema (outputs **e inputs**) y las firmas `*Resolvers` | `schema.graphql` |
| `operations.ts` | `typescript-operations` + `typed-document-node` | Tipos por operación (`*Query`, `*QueryVariables`) y los `TypedDocumentNode` (`*Document`) | documentos `.graphql` |

**Regla de import — "operación → `operations.ts`; schema/inputs → `resolvers-types.ts`; dominio → `lib/types`":**

| Necesitás… | Importá desde | Ejemplos |
|------------|---------------|----------|
| Resultado de una query / sus variables / el document | `__generated__/operations.ts` | `GetListingsQuery`, `GetListingsQueryVariables`, `GetListingsDocument` |
| Tipos del schema (outputs) e **inputs** | `__generated__/resolvers-types.ts` | `Listing`, `Location`, `GuestBooking`, `FiltersInput`, `LocationInput` |
| Resolvers del server GraphQL | `__generated__/resolvers-types.ts` | `QueryResolvers`, `ListingResolvers` |
| Tipo de dominio de la app (no-GraphQL) | `lib/types/*` o el service | `Booking`, `Review`, `ServiceResult` |

**Reglas:**
- El bloque de `operations.ts` **no** incluye el plugin `typescript` — si se agrega, re-emite los input types (usados como variables) y colisionan con los del propio archivo → `TS2300: Duplicate identifier`. Los inputs se generan una sola vez ahí, vía `typescript-operations`.
- Los input types (`FiltersInput`, `LocationInput`) existen en **ambos** archivos. Fuente canónica: **`resolvers-types.ts`** (reflejo directo del schema). Así los imports de inputs no dependen de cómo se generan las operaciones.
- Los documentos `.graphql` bajo `lib/apollo/queries/**` contienen **solo** operaciones (`query`/`mutation`/`fragment`). Nunca `type`/`input`/`enum` — esos viven únicamente en `schema.graphql`. Meter definiciones de schema en un documento las duplica en `operations.ts`.
- Para modelar dominio, preferir `lib/types/*` sobre los tipos generados de GraphQL cuando ya existe el equivalente (regla DRY de `/lib`).

