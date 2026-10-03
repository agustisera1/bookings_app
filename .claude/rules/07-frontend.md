---
paths:
  - "components/**"
  - "app/**/*.tsx"
  - "app/globals.css"
---

# Frontend / UI / UX (dimensión 7)

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

### Tokens de diseño

Todo color, radio y tamaño de texto sale de un token en `app/globals.css` (`@theme inline` + `:root`/`.dark`, en `oklch`). **Nunca hardcodear** un color (`text-yellow-400`) ni un tamaño mágico (`text-[10px]`): si el token no existe, se define ahí y se usa la utilidad. El mismo valor a mano en dos lugares es la definición de un token que falta.

| Grupo | Tokens | Cuándo usarlos |
|---|---|---|
| Superficies | `background`, `card`, `popover`, `muted`, `sidebar` | Fondos, por altitud |
| Sobre imagen | `overlay`, `overlay-foreground` | Scrim y texto encima de una foto (badge sobre la portada, degradado del hero). Único sin par light/dark a propósito: va sobre la imagen, no sobre una superficie de la página |
| Texto y bordes | `foreground`, `muted-foreground`, `border`, `input`, `ring` | Texto, separadores, foco |
| Semánticos | `primary`, `secondary`, `accent`, `success`, `destructive`, `rating` | Acción, énfasis, estado. `rating` = amarillo de estrellas |
| Radios | `--radius` → `radius-sm … radius-4xl` | Todo derivado de un único radio base |
| Tipografía | `font-sans` / `font-heading` / `font-mono`; escala `text-2xs …` | `text-2xs` (10px) para meta y badges; el resto, la escala de Tailwind |

Cada semántico tiene su par light/dark en `:root`/`.dark`. Un color nuevo **nace como token con sus dos temas**, no como un `dark:` a mano. Un `dark:` legítimo solo ajusta la opacidad de un token existente (`bg-success/10` → `dark:bg-success/20`), nunca introduce un color crudo.

### Catálogo de `components/common/`

| Primitivo | Qué resuelve | Server-safe |
|-----------|--------------|-------------|
| `Field`, `FieldError`, `FormField` | Fila de formulario: label + control + error (o texto de ayuda con `description`). `FormField` es la forma canónica | ✓ |
| `Fact` | Dato etiquetado de un bloque de detalle: label chico + valor + nota. Renderiza `dt`/`dd`, así que va dentro de un `dl` | ✓ |
| `CopyButton` | Copia un valor al portapapeles: solo ícono, con tooltip y check de confirmación | Client |
| `WideDialogContent` | `DialogContent` a un ancho que la escala `size` de `ui/` no ofrece, para un diálogo que carga un form entero | ✓ |
| `DetailColumns` | Cuerpo de dos columnas de una página de detalle: contenido + `aside` sticky. Refs: `bookings/[id]`, `profile` | ✓ |
| `StarRating` / `StarRatingInput` | Rating de estrellas: display de solo lectura vs. picker interactivo | Client |
| `ConfirmDialog` | Confirmación de acción destructiva (encapsula open + pending + retry) | Client |
| `EmptyState` | Estado vacío centrado (icono + título + descripción + acción) | ✓ |
| `PriceLabel` | Precio "por noche" formateado con `formatPrice` | ✓ |
| `DatePicker` | Campo de fecha única: trigger (ícono + fecha formateada) + `Calendar` en `Popover`. `open`/`onOpenChange` opcionales para coordinar pickers hermanos | Client |
| `BackLink` | Salida de una ruta de detalle hacia su lista (chevron + label) | ✓ |
| `PageLayout` | Shell de página: heading grande sticky + contenido scrollable, con slots `back`/`actions`/`toolbar`. Llena el ancho de su columna. Es el borde de la ruta | ✓ |
| `Section` | Encabezado (título + subtítulo) sobre un bloque **dentro** de una página, con `Card` opcional | ✓ |
| `InitialsAvatar` | Avatar redondo de iniciales en `primary`, tamaños `sm`/`md`/`lg` | ✓ |
| `CoverImage`, `OverlayBadge` | Portada con foto o gradiente de respaldo + badge legible sobre la imagen | ✓ |
| `GroupHeader` | Encabezado de un grupo de items: título + conteo + separador | ✓ |
| `RouteError` | Cuerpo de un `error.tsx`: `EmptyState` + botón "Try again" (`reset`) + escape hatch (`homeAction`) | Client |

### Reglas de consistencia

| Situación | Solución |
|-----------|----------|
| Encabezado + estructura de una página (ruta) | `PageLayout` con `title` (y `subtitle`/`actions`/`toolbar` opcionales) — nunca rearmar el `<div className="p-10 flex flex-col …">` con un `<h1>` a mano, ni copiar sus clases de header para replicar el blur |
| Página con un panel que no scrollea junto al contenido | `PageLayout` va **dentro** de la columna scrollable, no envolviendo la ruta: su header es `sticky`, así que se pinnea contra el contenedor de scroll que lo encierre. El panel queda afuera, hermano de esa columna, y arranca desde el borde superior. Ref: `listings/[id]/page.tsx` |
| Acciones sobre el recurso de una página de detalle | Slot `actions` de `PageLayout`, alineadas al pie del heading. Refs: `bookings/[id]`, `listings/[id]` |
| Nodo que no es texto dentro de `title`/`subtitle` | Debe ser contenido de frase (`span`, `Badge`, `PriceLabel`): `title` es un `<h1>`. Un bloque dentro de un `<p>` corta el párrafo en el parser y desincroniza el DOM de server y cliente — por eso el subtítulo de `PageLayout` es un `div` |
| Bloque titulado **dentro** de una página | `Section` (h2). Regla de altitud: `PageLayout` en el borde de la ruta, `Section` para los bloques que viven adentro |
| Volver desde una ruta de detalle (`[id]/page.tsx`) | `BackLink` con `href` explícito — nunca `router.back()` ni el `<Link>` + `ChevronLeft` a mano. Toda ruta `[id]` lo debe ofrecer, salvo que su layout ya deje la lista en pantalla (ref: `messages/`, cuyo rail no se va). Dentro de `PageLayout` va por el slot `back` |
| Ancho de una página | Llena la columna que le toca; el aire lo da el padding de `PageLayout`, no un `max-w-*`. Un ancho máximo sobre el shell lo centra con `mx-auto` y deja márgenes muertos a los costados que ninguna otra página tiene. El único `max-w-*` que sobrevive es el del subtítulo, que acota una línea de texto, no el layout |
| Fila de formulario (label + control + error) | `FormField` — nunca reconstruir el `<div className="flex flex-col gap-1.5">` a mano |
| Mensaje de error de un campo suelto | `FieldError` (o el prop `error` de `FormField`) — nunca `<p className="text-xs text-destructive">` |
| Área de texto | `Textarea` de `ui/` — nunca un `<textarea>` con clases crudas |
| Precio "por noche" | `PriceLabel` — centraliza el formato en `formatPrice` |
| Rating de estrellas | `StarRating` (display) / `StarRatingInput` (form, vía `Controller`) |
| Campo de selección de fecha | `DatePicker` de `components/common/date-picker.tsx` — nunca rearmar `Popover` + `Calendar` + `datePickerTriggerClass` + trigger a mano. Refs: `bookings/booking-form.tsx`, `search/filters.tsx` |
| Estado vacío con protagonismo | `EmptyState` centrado; para un status inline compacto dentro de una lista, un `<p className="text-sm text-muted-foreground">` es más liviano |
| Acción destructiva fuera de un form | `ConfirmDialog` (ver "Patrón de acciones de confirmación") |
| Prop de un Server Component a un Client Component | Solo datos serializables o un elemento ya renderizado (`icon={<X />}`); nunca la referencia a un componente o función (rompe la serialización RSC) |
| Trigger `*Trigger render={<Button/>}` | Se arma **dentro** del Client Component que tiene el Dialog; si necesita varios looks, un prop `variant`. Nunca llega pre-armado desde un Server Component (hydration mismatch de `data-slot`) |
| `Button` con `render={<Link/>}` | Siempre `nativeButton={false}`. Ref: `app/forbidden.tsx` |

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
| Estado local estructurado/complejo (varios campos relacionados + múltiples transiciones; p. ej. un panel de filtros con draft) | `useReducer`, no una maraña de `useState`. Reducer + acciones + defaults a nivel módulo (pensar en colocarlo aparte), acciones semánticas, y el componente solo despacha intención. El estado puramente visual (open, valor vivo de un slider) queda como `useState`. Ref: `components/search/filters-draft.ts` (reducer puro) + `components/search/use-filters.ts` (hook) + `components/search/filters.tsx` (orquestador) |
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

## Web Interface Guidelines

Subconjunto aplicable de [vercel.com/design/guidelines](https://vercel.com/design/guidelines). Formato: `docs/audit/HOW_TO_ADD_RULE.md`. Todas las verificaciones excluyen `components/ui/`.

### Accesibilidad y semántica

- **Todo botón solo-ícono tiene nombre accesible (`<span className="sr-only">` o `aria-label`).** Verificación: cada `size="icon*"` lleva uno de los dos. Ref: `components/bookings/cancel-booking-button.tsx`.
- **Nada de `div`/`span`/`li` clickeable: lo interactivo es un `button` o un link.** Verificación: grep de `<(div|span|li)[^>]*onClick` → 0.
- **Navegar es un `<Link>`; `router.push` solo después de una acción (submit, delete).** Verificación: ningún `onClick` cuyo único efecto es `router.push`. Ref: `components/listings/create-listing/create-listing.tsx`.
- **Cada página define su título.** Verificación: cada `page.tsx` exporta `metadata` o `generateMetadata`. Ref: `app/layout.tsx`.

### Animación

- **Nunca `transition-all`: se transiciona solo la propiedad que cambia.** Verificación: grep de `transition-all` → 0.
- **Toda animación respeta `prefers-reduced-motion`.** Verificación: cada `animate-*` va con prefijo `motion-safe:` (p. ej. `motion-safe:animate-pulse`).

### Contenido

- **Los textos de carga y de "sigue algo" usan el carácter `…`, nunca `...`.** Verificación: grep de `...` dentro de strings y JSX de `.tsx` → 0. Ref: `pendingLabel` de `ConfirmDialog`.
- **Imágenes con `next/image`, nunca `<img>`.** Verificación: grep de `<img` → 0. Ref: `components/bookings/booking-card.tsx`.
- **Precios y conteos que se comparan llevan `tabular-nums`.** Verificación: `PriceLabel` y los contadores numéricos incluyen la clase. Ref: el badge de `components/ui/sidebar.tsx`.

### Formularios y estado

- **Los inputs de auth declaran `type` y `autoComplete`: `email`, `current-password` (sign-in), `new-password` (sign-up).** Verificación: los `<Input>` de `app/auth/**`.
- **Nunca deshabilitar el submit por validez: se valida al enviar.** Verificación: grep de `disabled={` con `isValid` o `isDirty` → 0. Ref: `components/bookings/booking-form.tsx`.
- **Filtros y estado navegable viven en la URL, no en `useState`.** Verificación: el estado aplicado de la búsqueda se lee y escribe con `nuqs`; `useState` solo para el draft o lo visual. Ref: `components/search/use-filters.ts`.
- **Los campos de texto se recortan en el schema (`z.string().trim()`; email: `z.string().trim().pipe(z.email())`).** Verificación: ningún `z.string()` de texto libre sin `.trim()`.
- **Los inputs de email llevan `autoCapitalize="none"` y `spellCheck={false}`.** Ref: `components/auth/sign-in-form.tsx`.
- **Toda zona con scroll dentro de un diálogo o panel lleva `overscroll-contain`.** Ref: `components/search/filters-panel.tsx`.
- **Comillas tipográficas (“ ”) en el texto de la UI, nunca rectas.**
- **`themeColor` del `viewport` es el `--background` oscuro.** Ref: `app/layout.tsx`.

---

## Consistencia visual

Reglas que salieron de `docs/audit/07-frontend-audit.md`. Mismo formato que la sección anterior.

### Color, tema y tipografía

- **El color de marca y del CTA es `primary` (lima del preset); `accent` es el gris neutro de hover de shadcn; `success` es solo para estados.** Verificación: `bg-accent` no aparece como color de marca; `bg-success`/`text-success` solo en badges, alertas y pasos completados. Ref: `components/layout/app-sidebar.tsx`.
- **Los tokens de color vienen del preset de shadcn (`b6rtAc4G2`, base `olive`); un token que se agrega o ajusta tiene que pasar 4.5:1 para texto y 3:1 para bordes de controles.** Verificación: contraste medido en el navegador.
- **Tipografía: Outfit para todo (títulos y texto), Space Mono solo para IDs y referencias.** Escala: `text-2xs` meta y badges, `text-xs` notas, `text-sm` texto, `text-base` énfasis, `text-lg` títulos de card, `text-2xl` `Section`, `text-3xl md:text-4xl` `PageLayout`. Pesos: 600 títulos, 500 labels, 400 texto.
- **Forma: controles (`Button`, `Input`, `Select`, `DatePicker`) y miniaturas de hasta 48px en `rounded-lg`; superficies (cards, paneles, diálogos, fotos, filas de lista) en `rounded-xl`; badges, avatares y contadores redondos; burbujas de chat en `rounded-2xl`.** Verificación: grep de `rounded-(sm|md)` fuera de `ui/` → 0.
- **Los gradientes de portada salen de tokens (`primary`, `rating`, `success`, `muted` sobre `card`), nunca de la paleta de Tailwind.** Verificación: `listingTypeGradient` en `lib/utils.ts` solo usa tokens.
- **Tema oscuro único: `color-scheme` se declara una vez en `globals.css`.** Verificación: ningún componente usa `[color-scheme:…]`.
- **Sin guiones largos (`—`, `–`) ni emojis en texto visible; los rangos de fecha salen de `formatDateRange`.** Verificación: grep de `—`/`–` en strings y JSX → 0. Ref: `lib/dates.ts`.
- **Títulos y botones con mayúscula solo inicial ("Sign in", "Upcoming bookings").** Verificación: lectura de headings y labels.

### Primitivos compartidos

- **Avatar de iniciales con `InitialsAvatar`.** Verificación: ningún `rounded-full` con iniciales armado a mano. Ref: `components/common/initials-avatar.tsx`.
- **Portada con gradiente de respaldo y badge de tipo con `CoverImage` + `OverlayBadge`.** Verificación: ningún `bg-gradient-to-br ${gradient}` fuera de `CoverImage`. Ref: `components/common/cover-image.tsx`.
- **Encabezado de un grupo de items (título + conteo + línea) con `GroupHeader`.** Ref: `components/common/group-header.tsx`.
- **Separadores con `Separator`, carga con `Skeleton`.** Verificación: grep de `h-px` y `animate-pulse` fuera de `ui/` → 0.

### Tamaños y estados

- **Botones en tamaño `default` en acciones de página y pies de diálogo; `sm` solo dentro de listas o cards.** Verificación: `size="sm"` no aparece en el slot `actions` de `PageLayout` ni en un `DialogFooter`.
- **El submit principal de un form es `variant="primary"` (el default).** Verificación: ningún `type="submit"` con `variant="outline"`.
- **Inputs y triggers con la altura del componente; sin `h-*` encima.** Excepción: la barra de búsqueda (`Search` + `Filters`), que es más alta a propósito. Ref: `components/ui/input.tsx`.
- **Radios de la escala del componente; sin `rounded-*` encima de un `Button`.**
- **Solo lo clickeable tiene hover de elevación, y es `hover:shadow-lg`.** Verificación: cards sin link ni botón no llevan `hover:`.
- **Títulos de card en `text-lg`.**
- **El error de carga dice "Could not load <cosa>. Try reloading the page."** Verificación: grep de `Could not load`.
- **Alto de viewport con `dvh`, nunca `h-screen`/`min-h-screen`.**

### Accesibilidad

- **Todo campo tiene label: `FormField`, o `aria-label` si el diseño no muestra uno.** Verificación: cada `Input`/`Textarea`/grupo de rating tiene `id` + label o `aria-label`.
- **Las acciones no dependen del hover: lo que aparece en hover también es visible con foco y en pantallas táctiles.**
