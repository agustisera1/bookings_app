# bookings-next-steps.md — Deuda estructural de reservas

## 1. Un host no tiene vista propia de una reserva recibida

- **Dónde:** `app/(app)/bookings/[id]/page.tsx`.

- **Qué pasa:** el dato ya está: `Query.booking(id)` resuelve para **cualquiera** de las dos partes
  y devuelve `party` con el lado del que mira. Lo que falta es la vista: la página está escrita para
  el guest —"Your stay", "Message host", el botón de cancelar con `actor="guest"`— así que hoy hace
  `notFound()` cuando `party === "host"` en vez de mostrarle copy equivocado.

- **Por qué duele:** el rol host gestiona reservas recibidas, pero su única vista sigue
  siendo el bloque embebido en `listings/[id]`. No tiene página por reserva, ni el accept/reject
  desde ahí.

- **Idea de fix:** ramificar el detalle por `party`. Lo que cambia es copy, las acciones
  (accept/reject vía `ManageBookingActions` en vez de cancelar) y el contraparte que se muestra
  (`guest` en lugar de `host`, que el schema todavía no expone). El acceso a datos no se toca.
