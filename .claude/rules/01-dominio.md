# Dominio (dimensión 1)

> **Desactualizada.** Describe el estado previo a la auditoría de esta dimensión y puede contradecir el código. Ante una diferencia, mandan el código y las reglas ya auditadas (`02-services.md`, `07-frontend.md`).

## Roles de usuario

| Rol   | Descripción                                                   |
|-------|---------------------------------------------------------------|
| Guest | Busca, reserva, deja reseñas                                  |
| Host  | Crea y administra listados, gestiona reservas recibidas       |

Un usuario puede tener rol guest y host simultáneamente. El rol admin se quitó del sistema
(migración `006` dropea `users.is_admin`).

El lado guest/host de una reserva se deriva del **recurso** (`resolveBookingParty` compara `guest_id` / `host_id`), nunca de un switch de rol global: un switch sería una segunda fuente de verdad. Si existe, es solo navegación.

## Reglas clave

- Las reservas deben ser atómicas: sin solapamiento de fechas para el mismo listado, incluso bajo concurrencia (RNF-01)
- Lo asíncrono (emails, notificaciones) puede tener lag de segundos respecto a la fuente de verdad (RNF-02)
- Cada mutación GraphQL valida rol y ownership del recurso (RNF-05)
- Notificaciones y emails son siempre asíncronos (RNF-04)

## Reglas puras compartidas

**Regla de reglas puras:** una regla de dominio que la UI también necesita evaluar (¿se puede cancelar?, ¿cuánto reembolsa?) **no** va dentro del service. Los services son `"use server"`: todo lo que exportan se vuelve una Server Action async, así que no pueden exportar un predicado sync que un componente use en render. Esas reglas van en un módulo puro aparte — sin `"use server"`, sin DB, sin React — que el service y el componente importan por igual. Así el botón nunca ofrece una acción que el server va a rechazar, y la regla es testeable sin levantar nada. Ref: `lib/bookings/policy.ts` (`canCancel`, `refundFor`) consumido por `lib/services/bookings.ts` y `components/bookings/cancel-booking-button.tsx`.
