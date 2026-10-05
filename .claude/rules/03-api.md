---
paths:
  - "lib/apollo/**"
  - "app/api/graphql/**"
  - "codegen.ts"
---

# Contrato de API (dimensión 3)

> **Desactualizada.** Describe el estado previo a la auditoría de esta dimensión y puede contradecir el código. Ante una diferencia, mandan el código y las reglas ya auditadas (`02-services.md`, `07-frontend.md`).

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
| Tipos del schema (outputs) e **inputs** | `__generated__/resolvers-types.ts` | `Listing`, `Location`, `Booking`, `FiltersInput`, `LocationInput` |
| Resolvers del server GraphQL | `__generated__/resolvers-types.ts` | `QueryResolvers`, `ListingResolvers` |
| Tipo de dominio de la app (no-GraphQL) | `lib/types/*` o el service | `Booking`, `Review`, `ServiceResult` |

**Reglas:**
- El bloque de `operations.ts` **no** incluye el plugin `typescript` — si se agrega, re-emite los input types (usados como variables) y colisionan con los del propio archivo → `TS2300: Duplicate identifier`. Los inputs se generan una sola vez ahí, vía `typescript-operations`.
- Los input types (`FiltersInput`, `LocationInput`) existen en **ambos** archivos. Fuente canónica: **`resolvers-types.ts`** (reflejo directo del schema). Así los imports de inputs no dependen de cómo se generan las operaciones.
- Los documentos `.graphql` bajo `lib/apollo/queries/**` contienen **solo** operaciones (`query`/`mutation`/`fragment`). Nunca `type`/`input`/`enum` — esos viven únicamente en `schema.graphql`. Meter definiciones de schema en un documento las duplica en `operations.ts`.
- Para modelar dominio, preferir `lib/types/*` sobre los tipos generados de GraphQL cuando ya existe el equivalente (regla DRY de `/lib`).
