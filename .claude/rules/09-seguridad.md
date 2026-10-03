---
paths:
  - "lib/authorize.ts"
  - "lib/jwt.ts"
  - "lib/permissions.ts"
  - "lib/rate-limit.ts"
  - "lib/services/auth.ts"
  - "lib/apollo/**"
  - "app/api/**"
---

# Seguridad (dimensión 9)

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
