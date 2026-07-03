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
| `lib/utils.ts` | `cn` (classnames), `formatPrice`, `bookingStatusVariant` |
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
| Input nativo (`<input>`, `<textarea>`, `<select>`) | `{...register("field")}` |
| Componente controlado (Calendar, Select de Shadcn, star-picker) | `<Controller control={control} name="field" render={...} />` |
| Observar un campo reactivamente | `useWatch({ control, name: "field" })` — **no** `watch("field")` (incompatible con React Compiler) |
| Estado de envío | `isSubmitting` de RHF — **no** `useState` |
| Estado de éxito | `isSubmitSuccessful` de RHF — **no** `useState` |
| Estado puramente visual (hover, popover open) | `useState` local — no pertenece a RHF |
| Mensajes de error | `{errors.field && <p className="text-xs text-destructive">{errors.field.message}</p>}` |
| Atributo `required` en inputs | Omitir — Zod ya lo valida |

---

## Patrón de acciones de confirmación (AlertDialog + pending + error)

Para acciones destructivas o irreversibles disparadas fuera de un formulario RHF (eliminar, cancelar, etc.), no usar `alert()`/`confirm()` nativos ni un `onClick` directo al service. Referencias canónicas:
- `components/bookings/cancel-booking-button.tsx`
- `components/listings/delete-listing-button.tsx`

Este patrón es el equivalente, para acciones puntuales, del patrón de formularios (RHF) — reemplaza `isSubmitting`/`isSubmitSuccessful` por `useState` porque no hay un `useForm` de por medio.

### Estructura obligatoria

```tsx
"use client";

export function MyActionButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleAction() {
    setIsPending(true);
    const result = await myService(id);
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error); // ya es friendly, se puede mostrar directo
      return; // el diálogo queda abierto para reintentar
    }

    setOpen(false);
    toast.success("Mensaje de éxito");
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <Icon />
      </AlertDialogTrigger>

      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Confirmar acción?</AlertDialogTitle>
          <AlertDialogDescription>
            Explicar qué pasa y si es irreversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <Button variant="destructive" disabled={isPending} onClick={handleAction}>
            {isPending ? "Procesando…" : "Confirmar"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### Reglas

| Situación | Solución |
|-----------|----------|
| Confirmación antes de ejecutar | `AlertDialog` (`components/ui/alert-dialog.tsx`) — nunca `window.confirm` |
| Estado de apertura del diálogo | `useState<boolean>` controlado (`open`/`onOpenChange`) — necesario para poder cerrarlo manualmente en el happy path |
| Estado de envío | `useState<boolean>` (`isPending`) — no hay RHF de por medio, así que no aplica `isSubmitting` |
| Error del service | `toast.error(result.error)` y **no cerrar el diálogo** (`return` sin `setOpen(false)`), para permitir reintentar |
| Éxito del service | `setOpen(false)` + `toast.success(...)` |
| Deshabilitar acciones durante el request | `disabled={isPending}` en el botón de cancelar y en el de confirmar |
| Texto del botón de confirmar durante el request | Verbo en gerundio ("Deleting…", "Cancelling…") en vez de spinner |
| Botón que dispara solo un mock (sin service real) | `alert("...")` directo en el `onClick`, sin `AlertDialog` — reservar el diálogo para acciones con efecto real |
| Tooltip sobre un ícono con `AlertDialogTrigger` | Anidar `render`: `TooltipTrigger render={<AlertDialogTrigger render={<Button>...} />}` — los íconos van como children del `Button` más interno, no de los triggers |

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

