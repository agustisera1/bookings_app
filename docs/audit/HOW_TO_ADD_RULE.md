# Cómo agregar una regla

Una regla sirve si alguien puede pedir "auditá X" y obtener un veredicto **sin leer todo el código**. Para eso cumple dos criterios.

## 1. Anclada al código real

Antes de escribirla, relevar cómo está hoy esa parte del código. La regla describe un patrón que **ya existe** en el repo (o que se va a introducir a propósito) y apunta a su ejemplo canónico.

| ❌ No sirve | ✅ Sirve |
|---|---|
| "Los formularios deben estar bien estructurados." | "Todo formulario usa RHF + Zod. Ref: `components/bookings/booking-form.tsx`." |
| "Usar un buen sistema de layout." | "Toda página usa `PageLayout`. Ref: `app/(app)/bookings/[id]/page.tsx`." |

Sin referencia, cada uno interpreta la regla distinto; con referencia, se compara contra algo concreto.

## 2. Chequeable

La regla dice algo que se puede **verificar mirando un archivo o corriendo un comando**, no algo que requiera opinión. Prueba: dos personas auditando por separado llegan al mismo veredicto.

| ❌ Opinión | ✅ Chequeable | Cómo se verifica |
|---|---|---|
| "Código limpio" | "Un componente no mezcla fetch y markup: el fetch va en `use-<feature>.ts`" | El `.tsx` no importa de `lib/services` ni llama `fetch` |
| "Estilos consistentes" | "Nunca un color crudo de Tailwind" | Un grep de clases de paleta (`text-red-500`, `bg-gray-100`…) sobre `components/` y `app/` da 0 resultados |
| "Manejar bien el estado del form" | "El estado de envío sale de `isSubmitting`, nunca de `useState`" | Ningún form tiene `useState` para submitting/loading |

Un concepto amplio ("código limpio", "accesible") **no es una regla**: es un nombre para un grupo de reglas chequeables. Se escribe como título de sección y debajo van las reglas concretas que lo componen.

## Formato

Cada regla, en el archivo de su dimensión en `.claude/rules/`:

```markdown
- **<Regla, en imperativo y una línea>.** Verificación: <comando o qué mirar>. Ref: `<archivo canónico>`.
```

La excepción, si existe, va en la misma línea ("salvo X"). Si una regla necesita más de dos líneas de explicación, probablemente son dos reglas.

## Hacerla cumplir sola cuando se pueda

De más fuerte a más débil: **lint o hook** (se cumple solo) → **comando de verificación** (grep/script) → **lectura de un archivo puntual**. Si una regla se puede volver lint o hook, conviene hacerlo: deja de depender de que alguien la recuerde. Ref: el hook de comentarios en `.claude/hooks/check-comments.mjs`.

## Auditar con estas reglas

Como cada regla trae su verificación, "auditá la dimensión N" es correr las verificaciones de su archivo sobre el alcance de [SCOPE.md](SCOPE.md) y listar qué archivos incumplen cada regla.
