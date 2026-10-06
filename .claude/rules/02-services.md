---
paths:
  - "lib/*/tables.ts"
  - "lib/*/types.ts"
  - "lib/*/validation.ts"
  - "lib/*/policy.ts"
  - "lib/*/repository.ts"
  - "lib/*/queries.ts"
  - "lib/*/actions.ts"
  - "lib/*/resolvers.ts"
  - "lib/*/schema.graphql"
  - "lib/apollo/**"
---

# Services (dimensión 2)

Cómo se desarrolla, consume y audita un service. El ejemplo canónico es `reviews`. Auditar un service
puede requerir leerlo completo (excepción de `docs/audit/HOW_TO_ADD_RULE.md`).

## El patrón

- **Package by feature:** todo lo de un service vive en su carpeta (`lib/<service>/`). No hay carpetas por capa
  técnica (`types/`, `services/`, `repositories/`).
- **Functional core, imperative shell:** `policy.ts` y `types.ts` son puros (sin I/O, sin Next); el
  resto habla con el mundo y le pregunta a la policy qué hacer. El core nunca importa del shell.
- **CQRS liviano:** toda lectura entra por GraphQL (`resolvers.ts` → `queries.ts`); toda escritura
  es una Server Action (`actions.ts`). Las dos pasan por `authorize` y terminan en el repo.

## Estructura

```
lib/
  reviews/
    tables.ts         tabla(s) de Drizzle
    types.ts          tipos de dominio, derivados de la tabla
    validation.ts     schemas de zod — los usan el form y la action
    repository.ts     queries con Drizzle
    queries.ts        lecturas (las llama GraphQL)
    actions.ts        "use server" — escrituras
    schema.graphql    types de GraphQL del service
    resolvers.ts      resolvers de GraphQL del service
    actions.test.ts
  bookings/  listings/  auth/  chat/  notifications/   (misma forma)
  apollo/             cliente en proceso + loaders: solo junta los schemas, resolvers y loaders de cada service
  infra/
    postgres.ts  mongo.ts  redis.ts  s3.ts
  shared/
    result.ts         ServiceResult
    revalidate.ts     revalidatePaths
    dates.ts  utils.ts
```

No todos los services necesitan todos los archivos: `reviews` no tiene reglas propias, así que no
tiene `policy.ts`; un service de Mongo no tiene `tables.ts`.

## Archivo por archivo

### `reviews/tables.ts`

Las claves en snake_case son el nombre de la columna: los tipos derivados salen con la misma forma
que la fila y que el schema de GraphQL, sin mapear.

```ts
import { sql } from "drizzle-orm";
import { check, pgTable, smallint, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const reviews = pgTable(
  "reviews",
  {
    id: uuid().primaryKey().defaultRandom(),
    // A Mongo ObjectId: no FK possible across databases.
    listing_id: varchar({ length: 24 }).notNull(),
    author_name: varchar({ length: 60 }).notNull(),
    rating: smallint().notNull(),
    comment: varchar({ length: 256 }).notNull(),
    host_reply: varchar({ length: 256 }),
    created_at: timestamp({ withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [check("reviews_rating_range", sql`${table.rating} BETWEEN 1 AND 5`)],
);
```

### `reviews/types.ts`

Derivados de la tabla: la tabla es la única fuente de verdad. El `import type` se borra al
compilar, así que la UI puede importar estos tipos sin arrastrar Drizzle al bundle.

```ts
import type { reviews } from "./tables";

export type Review = typeof reviews.$inferSelect;

export type NewReview = Pick<
  typeof reviews.$inferInsert,
  "listing_id" | "author_name" | "rating" | "comment"
>;
```

### `reviews/validation.ts`

El input se valida antes de llegar a la DB, con el mismo schema en el form (feedback inmediato) y en
la action (la fuente de verdad: una Server Action se puede llamar directo). Los tipos del input se
infieren del schema, no se escriben a mano.

```ts
import { z } from "zod";

export const createReviewSchema = z.object({
  bookingId: z.uuid(),
  rating: z.int().min(1, "Select a rating").max(5),
  comment: z
    .string()
    .trim()
    .min(1, "Comment is required")
    .max(256, "Keep it under 256 characters"),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const hostReplySchema = z
  .string()
  .trim()
  .min(1, "Reply is required")
  .max(256, "Keep it under 256 characters");
```

### `reviews/repository.ts`

```ts
import { eq } from "drizzle-orm";
import { db } from "@/lib/infra/postgres";
import { reviews } from "./tables";
import type { NewReview, Review } from "./types";

export async function findReviewsByListingId(listingId: string): Promise<Review[]> {
  return db.select().from(reviews).where(eq(reviews.listing_id, listingId));
}

export async function insertReview(review: NewReview): Promise<{ id: string }> {
  const [created] = await db.insert(reviews).values(review).returning({ id: reviews.id });
  return created;
}

export async function setHostReply(reviewId: string, reply: string): Promise<boolean> {
  const updated = await db
    .update(reviews)
    .set({ host_reply: reply })
    .where(eq(reviews.id, reviewId))
    .returning({ id: reviews.id });
  return updated.length > 0;
}
```

### `reviews/queries.ts`

Las lecturas. No llevan `"use server"`: no son un endpoint, las llama el resolver.

```ts
import { authorize } from "@/lib/auth/session";
import type { ServiceResult } from "@/lib/shared/result";
import * as repo from "./repository";
import type { Review } from "./types";

export async function getListingReviews(listingId: string): Promise<ServiceResult<Review[]>> {
  const auth = await authorize("reviews:list");
  if (!auth.ok) return auth;

  try {
    const reviews = await repo.findReviewsByListingId(listingId);
    return { ok: true, data: reviews };
  } catch (error) {
    console.error("[getListingReviews]", error);
    return { ok: false, error: "Could not retrieve the reviews", code: "UNEXPECTED" };
  }
}
```

### `reviews/actions.ts`

Las escrituras. Cada una se lee de arriba abajo: autorizar → validar el input → cargar → chequear
reglas → persistir → revalidar.

**Errores.** El input se valida con zod antes de tocar la DB, así que un error de la DB es un bug: el
`catch` lo reporta como `UNEXPECTED`. La excepción es cuando la DB es la única que puede detectar el
error, como un constraint de unicidad o de exclusión bajo concurrencia. En ese caso, el `catch` lo
traduce con `pgErrorToCode` a un código de dominio (`CONFLICT`) con su propio mensaje.

```ts
"use server";
import { authorize } from "@/lib/auth/session";
import { isCompleted } from "@/lib/bookings/policy";
import * as bookingsRepo from "@/lib/bookings/repository";
import * as listingsRepo from "@/lib/listings/repository";
import type { ServiceResult } from "@/lib/shared/result";
import { revalidatePaths } from "@/lib/shared/revalidate";
import * as repo from "./repository";
import { createReviewSchema, hostReplySchema, type CreateReviewInput } from "./validation";

export async function createReview(
  input: CreateReviewInput,
): Promise<ServiceResult<{ id: string }>> {
  const auth = await authorize("reviews:create");
  if (!auth.ok) return auth;

  const parsed = createReviewSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message, code: "VALIDATION" };

  const { bookingId, rating, comment } = parsed.data;

  try {
    const booking = await bookingsRepo.findBookingById(bookingId);
    // Someone else's booking reads the same as a missing one.
    if (!booking || booking.guest_id !== auth.data.id)
      return { ok: false, error: "Booking not found", code: "NOT_FOUND" };

    if (!isCompleted(booking, new Date()))
      return {
        ok: false,
        error: "You can only review a stay once it's finished",
        code: "FORBIDDEN",
      };

    const review = await repo.insertReview({
      listing_id: booking.listing_id,
      author_name: auth.data.name,
      rating,
      comment,
    });

    revalidatePaths([
      { path: "/listings" },
      { path: `/listings/${booking.listing_id}` },
      { path: `/bookings/${bookingId}` },
    ]);
    return { ok: true, data: review };
  } catch (error) {
    console.error("[createReview]", error);
    return { ok: false, error: "Could not create the review", code: "UNEXPECTED" };
  }
}

export async function replyToReview(
  reviewId: string,
  listingId: string,
  reply: string,
): Promise<ServiceResult<null>> {
  const auth = await authorize("reviews:reply");
  if (!auth.ok) return auth;

  const parsed = hostReplySchema.safeParse(reply);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message, code: "VALIDATION" };

  try {
    const listing = await listingsRepo.findListingById(listingId);
    if (listing?.host_id !== auth.data.id)
      return {
        ok: false,
        error: "You can only reply to reviews on your own listings",
        code: "FORBIDDEN",
      };

    const replied = await repo.setHostReply(reviewId, parsed.data);
    if (!replied) return { ok: false, error: "Review not found", code: "NOT_FOUND" };

    revalidatePaths([{ path: `/listings/${listingId}` }]);
    return { ok: true, data: null };
  } catch (error) {
    console.error("[replyToReview]", error);
    return { ok: false, error: "Could not reply to the review", code: "UNEXPECTED" };
  }
}
```

### `reviews/schema.graphql`

El service extiende `Listing` desde su propia carpeta: listing (Mongo) + reviews (Postgres) en una
sola query, sin que `listings` sepa que existen las reviews.

```graphql
type Review {
  id: ID!
  listing_id: ID!
  author_name: String!
  rating: Int!
  comment: String!
  host_reply: String
  created_at: DateTime!
}

# Nullable: if the reviews fail to load, the listing still renders.
extend type Listing {
  reviews: [Review!]
}
```

### `reviews/resolvers.ts`

```ts
import type { Resolvers } from "@/lib/apollo/__generated__/resolvers-types";
import { toGraphQLError } from "@/lib/apollo/errors";
import { getListingReviews } from "./queries";

export const reviewsResolvers: Resolvers = {
  Listing: {
    reviews: async (listing) => {
      const result = await getListingReviews(listing._id);
      if (!result.ok) throw toGraphQLError(result);
      return result.data;
    },
  },
};
```

### `apollo/schema.ts` y `codegen.ts`

`lib/apollo` no tiene types ni resolvers de ningún service: su `schema.graphql` declara solo la raíz
(`scalar DateTime` y `type Query`), y `schema.ts` junta lo que aporta cada service en un único schema
ejecutable. Lo ejecuta en el mismo proceso el cliente de Server Components (`SchemaLink`): no hay
endpoint HTTP. Los field resolvers que se alcanzan desde una lista leen por un DataLoader del contexto
(`apollo/context.ts`), creado una vez por request junto con el cliente.

```ts
import { makeExecutableSchema } from "@graphql-tools/schema";
import bookingsTypeDefs from "@/lib/bookings/schema.graphql";
import { bookingsResolvers } from "@/lib/bookings/resolvers";
import chatTypeDefs from "@/lib/chat/schema.graphql";
import { chatResolvers } from "@/lib/chat/resolvers";
import listingsTypeDefs from "@/lib/listings/schema.graphql";
import { listingsResolvers } from "@/lib/listings/resolvers";
import notificationsTypeDefs from "@/lib/notifications/schema.graphql";
import { notificationsResolvers } from "@/lib/notifications/resolvers";
import reviewsTypeDefs from "@/lib/reviews/schema.graphql";
import { reviewsResolvers } from "@/lib/reviews/resolvers";
import usersTypeDefs from "@/lib/users/schema.graphql";
import { usersResolvers } from "@/lib/users/resolvers";
import { rootResolvers } from "./resolvers";
import rootTypeDefs from "./schema.graphql";

export const schema = makeExecutableSchema({
  typeDefs: [
    rootTypeDefs,
    listingsTypeDefs,
    bookingsTypeDefs,
    reviewsTypeDefs,
    usersTypeDefs,
    notificationsTypeDefs,
    chatTypeDefs,
  ],
  resolvers: [
    rootResolvers,
    listingsResolvers,
    bookingsResolvers,
    reviewsResolvers,
    usersResolvers,
    notificationsResolvers,
    chatResolvers,
  ],
});
```

```ts
// lib/apollo/client.ts
export const { getClient, query, PreloadQuery } = registerApolloClient(
  () =>
    new ApolloClient({
      cache: new InMemoryCache(),
      link: new SchemaLink({ schema, context: createContext() }),
    }),
);
```

```ts
// codegen.ts — `DateTime` sale de Drizzle como Date y viaja como ISO string
schema: "./lib/*/schema.graphql",
scalars: { DateTime: { input: "Date", output: "Date | string" } }, // resolvers-types
scalars: { DateTime: "string" },                                    // operations
// resolvers-types: el resolver recibe el documento de dominio (Mongo trae `_id`) y el schema expone
// `id` con un field resolver (`Listing: { id: (listing) => listing._id }`)
mappers: { Listing: "@/lib/listings/types#Listing", Booking: "@/lib/bookings/types#BookingNode", … },
```

### `shared/revalidate.ts`

```ts
import { revalidatePath } from "next/cache";

export type RevalidationTarget = {
  path: string;
  level?: Parameters<typeof revalidatePath>[1];
};

export function revalidatePaths(targets: RevalidationTarget[]) {
  for (const { path, level } of targets) revalidatePath(path, level);
}
```

## Consumidores

```ts
// Página (Server Component): lee por GraphQL. "all": un campo anidado que falla
// (reviews) llega como null en vez de tirar la query entera.
const { data } = await query({
  query: GetListingDocument,
  variables: { id },
  errorPolicy: "all",
});
```

```ts
// Componente: tipa con la operación (lo que llegó por el cable, fechas en ISO),
// no con el tipo de dominio. Las escrituras salen de actions.
import type { GetListingQuery } from "@/lib/apollo/__generated__/operations";
import { replyToReview } from "@/lib/reviews/actions";

// Otro service: lee del repo, nunca de actions ni queries
import * as reviewsRepo from "@/lib/reviews/repository";
```

## Checklist de auditoría

Lo que el ejemplo cumple sin decirlo explícitamente:

- **No existen `lib/services/`, `lib/repositories/` ni `lib/types/`.** Verificación: `ls` de esas rutas falla.
- **`types.ts`, `validation.ts` y `policy.ts` no importan de infra, Next ni del shell del service.** Verificación: sus imports no incluyen `@/lib/infra`, `next/`, `./repository`, `./queries` ni `./actions` (salvo `import type` de `./tables`).
- **Solo `actions.ts` lleva `"use server"`.** Verificación: grep `"use server"` en `lib/*/` aparece solo en `actions.ts`.
- **La UI lee solo por GraphQL.** Verificación: ningún archivo de `app/` ni `components/` importa de `lib/*/queries` ni de `lib/*/repository`; `resolvers.ts` no importa de `./repository`.
- **Otro service consume este solo vía `types`, `policy` y `repository`.** Verificación: grep de imports `lib/<x>/actions` o `lib/<x>/queries` dentro de `lib/<y>/` da 0 resultados.
- **Ningún tipo se re-exporta.** Verificación: grep `export type {` en `lib/*/actions.ts` y `lib/*/queries.ts` da 0 resultados.
- **Actions y queries nunca hacen `throw` ni devuelven `error.message`.** Verificación: grep `throw` y `error.message` en `lib/*/actions.ts` y `lib/*/queries.ts` da 0 resultados.
- **`revalidatePath` solo se llama desde `lib/shared/revalidate.ts`.** Verificación: grep `revalidatePath(` fuera de ese archivo da 0 resultados.
- **El repository no autoriza, no captura errores ni aplica reglas.** Verificación: `repository.ts` no importa `authorize` ni `./policy` y no tiene `try`.
