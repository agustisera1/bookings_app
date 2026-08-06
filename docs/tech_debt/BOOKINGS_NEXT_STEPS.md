# BOOKINGS_NEXT_STEPS.md — Deuda estructural de reservas

## 1. Un host no tiene vista propia de una reserva recibida — sin ticket

- **Dónde:** `app/(app)/bookings/[id]/page.tsx`.

- **Qué pasa:** el dato ya está: `Query.booking(id)` resuelve para **cualquiera** de las dos partes
  y devuelve `party` con el lado del que mira. Lo que falta es la vista: la página está escrita para
  el guest —"Your stay", "Message host", el botón de cancelar con `actor="guest"`— así que hoy hace
  `notFound()` cuando `party === "host"` en vez de mostrarle copy equivocado.

- **Por qué duele:** el rol host gestiona reservas recibidas (RF-02), pero su única vista sigue
  siendo el bloque embebido en `listings/[id]`. No tiene página por reserva, ni el accept/reject
  desde ahí.

- **Idea de fix:** ramificar el detalle por `party`. Lo que cambia es copy, las acciones
  (accept/reject vía `ManageBookingActions` en vez de cancelar) y el contraparte que se muestra
  (`guest` en lugar de `host`, que el schema todavía no expone). El acceso a datos no se toca.

## 2. Una reseña no queda atada a la reserva que la originó — sin ticket

- **Dónde:** tabla `reviews` (`db/migrations/001_initial_schema.sql:35-43`), `reviews.pg.ts`.

- **Qué pasa:** `createReview` ya **recibe** un `bookingId`, verifica ownership y exige
  `isCompleted`. Pero la fila que escribe es `listing_id` + `author_name` (texto libre): la reserva
  y el autor se usan para autorizar y después se tiran.

- **Por qué duele:** nada impide reseñar **la misma estadía muchas veces**. El detalle de la reserva
  ofrece el formulario cada vez que se abre, porque no hay forma de preguntar "¿esta reserva ya
  tiene reseña?". Tampoco se puede listar "mis reseñas" ni editar una propia: `author_name` es una
  copia del nombre al momento de escribir, no una referencia al usuario.

- **Idea de fix:** migración que agregue `booking_id` (UNIQUE) y `author_id` con FK. El UNIQUE es lo
  que convierte "no duplicar" en una garantía de la DB en vez de un chequeo que se puede olvidar —
  mismo criterio que el `no_overlap` de las reservas. Con eso el formulario se puede esconder cuando
  ya hay reseña, en vez de fallar al enviar.

> **Nota:** el modelo de datos de `CLAUDE.md` describe `REVIEWS` con `booking_id` y `author_id`.
> La tabla real nunca los tuvo. Corregir esa sección es parte de este ítem.
