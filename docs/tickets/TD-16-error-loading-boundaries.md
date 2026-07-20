# TD-16 — Error y loading boundaries

| | |
|---|---|
| **Branch** | `feat/route-boundaries` |
| **Bloque** | Frontend |
| **Prioridad** | 🔴 Alta |
| **Momento** | Pre-deploy |
| **Depende de** | — (afinidad con **TD-07**: mismo tema, otra altitud) |
| **Origen** | Re-triage del backlog: el eje de frontend no tenía representación |
| **Repos** | `bookings_app` |

## Problema

**13 rutas, cero boundaries.** Verificado: no existe ningún `error.tsx`, `loading.tsx`,
`not-found.tsx` ni `global-error.tsx` en todo `app/`.

```
app/(app)/          page · bookings · bookings/[id] · listings · listings/[id]
                    listings/mine · listings/new · messages · messages/[bookingId]
                    notifications · profile
app/auth/           sign-in · sign-up
```

Las consecuencias son tres, y ninguna se ve en desarrollo:

**1. Cualquier `throw` no capturado en un RSC es la pantalla de error de Next.** En desarrollo eso es
un stack trace útil. En producción es una pantalla gris genérica, sin navegación, sin forma de
volver, y sin ninguna pista de qué pasó. Es el peor estado posible de una aplicación desplegada, y
hoy es el estado por defecto de las 13 rutas.

**2. Un `[id]` inexistente no tiene respuesta.** `bookings/[id]`, `listings/[id]` y
`messages/[bookingId]` reciben un id de la URL. Un id que no existe —link viejo, URL editada a mano,
recurso borrado— no tiene hoy un 404 propio.

**3. La navegación no tiene feedback.** Sin `loading.tsx`, al navegar a una ruta cuyo RSC hace I/O el
usuario se queda en la página anterior sin señal de que algo está pasando. Se percibe como un click
que no hizo nada.

> **Lo que ya está bien:** `listings/page.tsx`, `listings/mine/page.tsx` y `notifications/page.tsx`
> ya usan `<Suspense>` para streamear partes de la página. El patrón está entendido; lo que falta es
> aplicarlo **en el borde de la ruta**, que es donde Next lo cablea solo.

## Por qué entra

**Pregunta 1**, y es el ticket que le da al eje de frontend su lugar en la puerta de deploy.

Un `throw` en producción llevando a una pantalla gris es exactamente "funciona en `localhost` y se
rompe desplegado": en desarrollo el error es legible, así que el agujero es **invisible hasta que
importa**.

Tiene además el contenido de aprendizaje que TD-07 tiene a nivel componente, pero a nivel ruta:

> `error.tsx` y `loading.tsx` no son componentes que uno renderiza — son **convenciones de archivo
> que Next convierte en un error boundary y un límite de Suspense** alrededor del `page`. Entender
> que el framework arma el árbol de boundaries a partir del árbol de carpetas es lo que hace que el
> App Router tenga sentido.

## Alcance

### 1. `error.tsx` — dónde y con qué granularidad

No hacen falta 13. La granularidad correcta sigue a **qué puede fallar distinto**:

| Archivo | Cubre | Por qué ahí |
|---|---|---|
| `app/global-error.tsx` | Fallo del root layout | Es el único que reemplaza el `<html>`; sin esto, un error en el layout raíz no tiene red |
| `app/(app)/error.tsx` | Todas las rutas autenticadas | El caso general: mensaje + `reset()` + volver al inicio |
| `app/(app)/messages/error.tsx` | El rail y el hilo | Depende del worker y del socket, que fallan por motivos propios |
| `app/auth/error.tsx` | Sign-in / sign-up | Un error acá no puede ofrecer "volver a tu cuenta" — el usuario todavía no tiene |

Los `error.tsx` son **Client Components obligatoriamente** (reciben `reset`). El botón de reintentar
tiene que llamar a `reset()`, no recargar la página entera.

### 2. `not-found.tsx` + `notFound()` en las rutas dinámicas

Las tres rutas con parámetro (`bookings/[id]`, `listings/[id]`, `messages/[bookingId]`) llaman a
`notFound()` cuando el service devuelve vacío, y `app/(app)/not-found.tsx` lo renderiza.

**Ojo con la distinción que importa:** "no existe" y "existe pero no es tuyo" no son lo mismo. Hoy
los services ya devuelven `FORBIDDEN` vs `NOT_FOUND` (`ServiceResult`); el boundary tiene que
respetar esa diferencia y no colapsar las dos en un 404 — o al revés, no filtrar la existencia de un
recurso ajeno.

### 3. `loading.tsx` en las rutas con I/O en el RSC

No en todas: solo donde el `page` hace I/O antes de poder pintar. El skeleton aproxima la forma del
contenido para no producir salto de layout.

Se solapa con **TD-07** (`messages/layout.tsx` bloquea esperando el rail): son el mismo tema —dónde
está el límite de streaming— a dos alturas distintas. Conviene hacerlos seguidos.

### 4. Reutilizar `EmptyState`

Los estados de error y de vacío ya tienen primitivo (`components/common/empty-state.tsx`). Estos
boundaries lo componen; no se arma markup nuevo.

## Criterio de aceptación

- [ ] Un `throw` forzado en un RSC de `(app)` muestra el boundary con opción de reintentar, **no** la
      pantalla de Next.
- [ ] `reset()` recupera la ruta sin recargar la página entera.
- [ ] Un `throw` forzado en el root layout muestra `global-error.tsx`.
- [ ] `/listings/<id-inexistente>` devuelve el 404 propio de la app, con navegación.
- [ ] Un recurso ajeno **no** revela su existencia por la diferencia entre el 403 y el 404.
- [ ] Navegar a una ruta con I/O muestra un skeleton, y el skeleton no produce salto de layout.
- [ ] Ningún boundary arma markup propio: todos componen `EmptyState`.

## Si esto escalara

Aguanta indefinidamente: los boundaries son estructurales y no dependen del volumen.

El techo no es de escala sino de **diagnóstico**: hoy el usuario ve "algo salió mal" y vos no te
enterás. El próximo movimiento sería reportar el error desde el boundary a un servicio de tracking
(Sentry y similares) con un id de correlación que el usuario pueda mencionar, atado a los logs
estructurados de **TD-15**. Eso convierte "un usuario dice que se rompió" en un stack trace con
contexto.

## Fuera de alcance

- **`messages/layout.tsx` esperando el rail** → **TD-07**.
- **Servicio de error tracking.** Va después del deploy, cuando haya errores reales que mirar.
- **Rediseño de los estados vacíos existentes.** Este ticket agrega boundaries; no reabre lo que ya
  funciona.
- **Accesibilidad de los boundaries nuevos** (foco, `role="alert"`) → se cubre en **TD-17**, que
  audita todo junto.
