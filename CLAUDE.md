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
