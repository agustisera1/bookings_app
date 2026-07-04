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
| Admin | Modera contenido, accede a métricas globales                  |

Un usuario puede tener rol guest y host simultáneamente.

## Modelo de datos

### PostgreSQL (transaccional)
- `USERS`: id, email, password_hash, name, is_host, is_admin, created_at
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

## Librería compartida — `/lib`

Antes de escribir cualquier utilidad, formatter o constante en un componente, **verificar si ya existe en `/lib`**. Si no existe y es reutilizable, agregarla ahí. No duplicar lógica.

| Archivo | Qué contiene |
|---------|-------------|
| `lib/utils.ts` | `cn` (classnames), `formatPrice`, `bookingStatusVariant`, `listingTypeGradient` |
| `lib/dates.ts` | `parseTs`, `formatDate`, `calcNights`, `datePickerTriggerClass` |
| `lib/types/index.ts` | Tipos compartidos (`ServiceResult`, etc.) |
| `lib/services/*` | Lógica de negocio server-side (siempre retornan `ServiceResult`) |
| `lib/apollo/*` | Cliente Apollo, resolvers, schema, tipos generados |
| `lib/postgres.ts` | Cliente PostgreSQL y helpers de error |
| `lib/mongo.ts` | Cliente MongoDB |
| `lib/permissions.ts` | Roles, permisos y helpers de autorización |
| `lib/jwt.ts` | Sign/verify de tokens |

### Regla DRY

- **Formatters de fecha** (`formatDate`, `calcNights`, `parseTs`) → siempre de `lib/dates.ts`
- **Formatters de precio** (`formatPrice`) → siempre de `lib/utils.ts`
- **Variantes de badge por status** (`bookingStatusVariant`) → siempre de `lib/utils.ts`
- **Tipos de dominio** → siempre de `lib/types/index.ts` o del service correspondiente
- Si una función aparece en más de un componente → moverla a `/lib` antes de copiarla

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
| `bookings.pg.ts` | `findBookingsByGuestId`, `createBookingRecord`, `hasGuestBookingForListing` |
| `reviews.pg.ts` | `findReviewsByListingId`, `createReviewRecord` |
| `listings.mongo.ts` | `findListingById`, `findListings`, `findListingsByIds` |

**Reglas:**
- Sin `"use server"`, sin `authorize()`, sin lógica de negocio
- Reciben y devuelven tipos de dominio (`lib/types/`), nunca tipos de DB crudos hacia afuera
- No tienen try/catch — los errores propagan al service que los llama

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

