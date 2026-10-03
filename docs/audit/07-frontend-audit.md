# Auditoría — Frontend (dimensión 7)

Alcance: los 88 archivos `.tsx` de `components/` y `app/`, sin `components/ui/`. Criterio: `.claude/rules/07-frontend.md` + consistencia visual (skill `design-taste-frontend`, lo aplicable a una app de producto).

## A. Web Interface Guidelines

| # | Hallazgo | Dónde |
|---|---|---|
| 1 | Botón solo-ícono sin nombre (y variante sin uso) | `listings/edit-listing-button.tsx` (`variant="icon"`) |
| 2 | Animación sin `motion-safe:` | `(app)/notifications/page.tsx`, `auth/sign-up/page.tsx` |
| 3 | Ninguna página define su título | las 12 `page.tsx` |
| 4 | Inputs de auth sin `autoComplete` | `auth/sign-in`, `auth/sign-up` |
| 5 | Precios y conteos sin `tabular-nums` | `PriceLabel`, `booking-card`, `listing-bookings`, `booking-detail`, `booking-form`, `filters-panel`, contadores y badges |

## B. Reglas de `07-frontend.md`

| # | Hallazgo | Dónde |
|---|---|---|
| 6 | Valores arbitrarios | `message-bubble` (`text-[11px]`), `listing-photos` (`h-[120px]`), `chat`, `notifications/page`, `filters-panel`, `create-listing`, `booking-card`, `notification-row`, `details-step` |
| 7 | Colores crudos de paleta | `lib/utils.ts` (`TYPE_GRADIENTS`) |
| 8 | Fila de formulario armada a mano | `search/filters-panel`, `search/min-count-field`, password de `auth/sign-up` |
| 9 | Falta el estado de error | `bookings/user-bookings` |
| 10 | `useState` de éxito, `new Date()` en render, precios sin `formatPrice` | `bookings/booking-form` |
| 11 | Fecha sin `formatDate` | `reviews/listing-reviews` |
| 12 | Separador a mano | `booking-section`, `notification-group`, `message-bubble`, `bookings/loading` |
| 13 | Skeleton a mano | `(app)/notifications/page` |

## C. Consistencia visual

| # | Hallazgo | Dónde |
|---|---|---|
| 14 | Guiones largos en texto visible; separador de rangos no uniforme | `booking-card`, `listing-bookings`, `booking-detail`, `cancel-booking-button`, `chat-states`, `conversation-list`, `(app)/error`, `conversation-item`, `bookings/[id]`, `filters-panel` |
| 15 | Emoji en la UI | `booking-form` |
| 16 | `success` usado como color de marca; dos colores de avatar | `app-sidebar`, `sidebar-nav`, `sidebar-user-footer`, `profile`, `chat-avatar` |
| 17 | Avatar de iniciales copiado | `sidebar-user-footer` (×2), `profile` |
| 18 | Portada + gradiente + badge de tipo copiados | `listings`, `booking-card`, `booking-detail-hero` |
| 19 | Encabezado de grupo copiado | `booking-section`, `notification-group` |
| 20 | Radios pisados a mano | `manage-booking-actions`, `chat-composer`, `delete-listing-photo-button` |
| 21 | Hover inconsistente; hover en cards no clickeables | `listings`, `booking-card`, `listing-bookings`, `notification-row` |
| 22 | Tamaños de botón distintos en acciones de página y pies de diálogo | `listings/[id]`, `search/filters` |
| 23 | Énfasis del botón principal | `reviews/review-form` |
| 24 | Alturas de input pisadas | `booking-form`, `details-step`, `search`, `filters` |
| 25 | Títulos de card de distinto tamaño | `listings`, `booking-card` |
| 26 | Mayúsculas inconsistentes | `auth/sign-in`, `auth/sign-up`, `listings/[id]` |
| 27 | Mensajes de error de carga en dos formas | `listings`, `listings/mine`, `listing-bookings`, `listing-reviews`, `notifications-list` |
| 28 | Estados vacíos inconsistentes | `listings/page`, `listings/[id]` vs `profile` |
| 29 | Tema oscuro forzado sin `color-scheme` global | `app/layout`, `global-error`, `details-step` |
| 30 | `h-screen` / `min-h-screen` | `(app)/layout`, `auth/layout`, `global-error` |

## D. Accesibilidad

| # | Hallazgo | Dónde |
|---|---|---|
| 31 | `<p>` dentro de `<button>` | `listings/image-upload` |
| 32 | Alt incorrecto | `chat/conversation-item` |
| 33 | Campos sin label | `chat-composer`, `review-reply-form`, rating de `review-form` |
| 34 | Acción visible solo en hover | `notifications/notification-row` |
| 35 | El visor de fotos recorta la imagen | `listings/listing-photos` |
| 36 | `redirect()` dentro de un handler de cliente | `layout/sidebar-user-footer` |

## E. Otros

| # | Hallazgo | Dónde |
|---|---|---|
| 37 | Páginas que devuelven `"Unauthenticated"` en vez de redirigir | `bookings`, `bookings/[id]`, `notifications`, `messages/[bookingId]` |
| 38 | Comentarios de más de 2 líneas (58 bloques, 39 archivos); idioma mezclado; `async` sin `await`; metadata en español | transversal |
