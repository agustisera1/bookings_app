# USE_SYNC_EXTERNAL_STORE.md

Guía foundational sobre `useSyncExternalStore`: qué problema resuelve, sus tres argumentos, y el detalle sutil de `Object.is` que decide **qué** tenés que devolver. Anclado a nuestro hook de socket en `components/chat/use-booking-chat.ts`.

> **Contexto:** apareció cablando el chat en tiempo real. El socket vive fuera de React y su estado (`connected`) cambia por eventos de red. Este hook es el puente oficial de React para eso.

---

## 1. El modelo mental: React vive adentro, el socket vive afuera

Este es el punto que ordena todo lo demás:

> **El estado de React vive dentro de React. Tu socket vive afuera.**

`socket.connected` cambia por eventos de red — el server responde el handshake, se cae la conexión — cosas que ocurren **completamente fuera de React**. Si en el render hacés `socket?.connected === false`, React no tiene forma de enterarse de cuándo eso cambia, así que **no re-renderiza**. La UI queda congelada en el valor del primer render.

`useSyncExternalStore` es el hook nativo de React (18+) que traduce un sistema externo y mutable a algo que React sabe observar. Casi nunca lo escribís a mano: vive escondido dentro de librerías (Redux, Zustand, `react-query` lo usan por debajo). Lo tocás directo solo cuando te suscribís a un sistema externo crudo — un socket, `window.matchMedia`, `localStorage`, `navigator.onLine`.

```mermaid
flowchart LR
    subgraph afuera["Fuera de React"]
        SK["socket.io<br/>connected · eventos"]
    end

    subgraph react["Dentro de React"]
        H["useSyncExternalStore"]
        C["tu componente"]
    end

    SK -- "subscribe: 'avisame cuando cambies'" --> H
    H -- "getSnapshot: 'qué valor leo ahora'" --> SK
    H -- "re-render si el snapshot cambió" --> C
```

---

## 2. Los tres argumentos

```ts
const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
```

| Argumento | Qué hace | En nuestro `useSocket` hoy |
| :--- | :--- | :--- |
| `subscribe(callback)` | React te pasa un `callback`. Vos lo enganchás a los eventos del sistema externo. Cada vez que algo cambia afuera, llamás `callback()` → React re-lee el snapshot y re-renderiza si cambió. **Devuelve una función de cleanup** (des-suscribir). | Engancha `callback` a `connect`/`disconnect`/`connect_error` del socket, y los des-engancha en el cleanup. |
| `getSnapshot()` | Devuelve el valor actual que React debe usar. **Tiene que ser referencialmente estable** si nada cambió, o entra en loop infinito (ver §3). | `isSocketConnected` → el booleano `connected`, leído sin construir el socket (estable ✓). |
| `getServerSnapshot()` | Valor durante SSR e hidratación inicial. Sin esto, un componente cliente que use el hook rompe en SSR. | `() => false` → en el server no hay conexión (ver §5). |

El modelo mental de los dos primeros, en una línea:

> `subscribe` = **"cómo me entero de que cambió"**. `getSnapshot` = **"qué valor leo cuando me entero"**.

---

## 3. El detalle sutil: `getSnapshot` devuelve el VALOR, no el objeto

Acá está la trampa que hace que "devolver el socket" no alcance para trackear `connected`.

Cuando llamás `callback()`, React vuelve a llamar `getSnapshot()` y compara el nuevo valor con el anterior usando **`Object.is`**. Si son iguales, **no re-renderiza**. Dos consecuencias:

1. **Si `getSnapshot` devuelve algo nuevo en cada llamada** (un objeto/array literal recién creado), `Object.is` siempre da `false` → React cree que cambió siempre → **loop infinito**. Por eso el snapshot tiene que ser estable.
2. **Si `getSnapshot` devuelve siempre el mismo objeto mutable**, `Object.is` siempre da `true` → React nunca ve el cambio, aunque una propiedad interna haya mutado.

El enfoque naïve —meter el socket entero como snapshot— cae en el caso 2:

```ts
// Lo que NO alcanza para trackear `connected`:
const socket = useSyncExternalStore(
  () => () => {},               // subscribe no-op
  () => getSocketConnection(),  // SIEMPRE el mismo objeto singleton
  () => null,
);
```

Para *solo emitir* alcanzaría: el socket es siempre la misma instancia, su identidad nunca cambia, no hay nada que re-renderizar. **El problema aparece cuando querés `connected` reactivo.** Cuando el socket pasa de desconectado a conectado, `getSocketConnection()` devuelve **el mismo objeto** — la identidad no cambia porque solo mutó `socket.connected` de `false` a `true`. `Object.is(mismoSocket, mismoSocket)` es `true` → React no re-renderiza. **Devolver el objeto no sirve para trackear un booleano interno.**

Por eso nuestro hook **no** hace esto: para emitir toma el socket con `getSocketConnection()` directo (dentro de un effect, no por el store); para `connected` usa `useSyncExternalStore` con el booleano como snapshot (§4).

> **La regla:** `getSnapshot` tiene que devolver **el valor primitivo que te importa** (el booleano, el status string), no el objeto mutable que lo contiene.

---

## 4. Cómo lo hace nuestro hook: `connected` reactivo

De §3 sale el diseño: **separar dos preocupaciones**.

| Preocupación | Qué expone | ¿Necesita suscripción? |
| :--- | :--- | :--- |
| **El socket** (para emitir) | El objeto, estable | No — su identidad nunca cambia |
| **El estado de conexión** (para la UI) | Un booleano | Sí — cambia por eventos |

Así está implementado (`use-booking-chat.ts`): un `subscribe` que engancha los eventos de conexión, y `isSocketConnected` como snapshot.

```ts
// El subscribe cablea el callback de React a los eventos de conexión:
function subscribe(onStoreChange: () => void) {
  const socket = getSocketConnection();
  socket.on("connect", onStoreChange);
  socket.on("disconnect", onStoreChange);
  socket.on("connect_error", onStoreChange);
  return () => {
    socket.off("connect", onStoreChange);
    socket.off("disconnect", onStoreChange);
    socket.off("connect_error", onStoreChange);
  };
}

export function useSocketStatus() {
  // snapshot = el booleano (cambia ✓); getServerSnapshot = false (SSR)
  return useSyncExternalStore(subscribe, isSocketConnected, () => false);
}
```

`isSocketConnected` (`lib/socket.ts`) lee `socket.connected` **sin construir** el socket, así que sirve de snapshot puro; la conexión la abre el `subscribe` cuando llama a `getSocketConnection()`.

Ahora el ciclo se cierra:

```mermaid
sequenceDiagram
    autonumber
    participant NET as Red / server
    participant SK as socket.io
    participant R as React (useSyncExternalStore)
    participant UI as Componente

    Note over R,UI: montaje → subscribe() engancha connect/disconnect
    NET->>SK: handshake OK
    SK->>R: dispara "connect" → callback()
    R->>R: re-lee getSnapshot() → true
    R->>R: Object.is(false, true) === false → cambió
    R->>UI: re-render con connected = true
```

El composer consume `connected` (que sale de este hook) para reflejar el estado de la conexión: se prende/apaga solo, porque es un booleano observado, no una lectura muerta del primer render.

---

## 5. Por qué `getServerSnapshot` devuelve `false`

Un componente marcado `"use client"` **igual se renderiza en el server** durante el SSR de Next para producir el HTML inicial. `getServerSnapshot` es el valor que React usa en ese render y en la hidratación inicial; después re-renderiza con `getSnapshot`. Devolvemos `false` — "en el server no hay conexión".

Sirve para dos cosas:

- **Evita el hydration mismatch.** El primer render del cliente tiene que coincidir con el HTML del server. Con `false` de los dos lados coincide, y recién después React actualiza al valor real.
- **No arranca nada en SSR.** El snapshot cliente (`isSocketConnected`) ya es seguro —solo lee `socket.connected`, no construye nada—; el que abre la conexión es el `subscribe`, y React **no** llama `subscribe` durante el SSR. Así el socket nunca se abre desde Node.

| Fase | Qué snapshot usa React | Resultado |
| :--- | :--- | :--- |
| SSR (server) | `getServerSnapshot` | `false` — no hay socket |
| Hidratación (1er render cliente) | `getServerSnapshot` | `false` — coincide con el HTML, sin mismatch |
| Post-hidratación | `getSnapshot` (`isSocketConnected`) | el estado real de la conexión |

---

## 6. ¿Dónde enganchar los `socket.on(...)`?

`subscribe` es el lugar correcto para los eventos de **conexión** (§4), pero no todos los handlers van ahí. El lugar depende de **qué hace** el handler, y hay una regla que los cruza a todos:

> Como el socket es un **singleton compartido**, cada `socket.on(...)` necesita su `socket.off(...)` en el cleanup. Si no, cada vez que un componente monta se apila otro listener → el mismo evento se procesa N veces y hay memory leak (el clásico `MaxListenersExceededWarning`).

| Tipo de evento | Mejor lugar | Por qué |
| :--- | :--- | :--- |
| **Estado de conexión** (`connect`, `disconnect`, `connect_error`) que solo dispara un re-render | Dentro del `subscribe` de `useSyncExternalStore` | El patrón da la simetría attach/detach gratis, y el handler no hace más que llamar `callback()`. Es el §4. |
| **Eventos de dominio que alimentan estado de React** (`message-received` → agregar al hilo) | Un `useEffect` en el hook de la feature, con `.off()` en el cleanup | Necesita el `setState` de ese componente y el ciclo mount/unmount. |
| **Handlers globales, sin estado, de vida útil = app** (logging, telemetría, re-auth) | En la creación del singleton, en `lib/socket.ts`, enganchados **una sola vez** | No pertenecen a ningún componente; no hay cleanup porque nunca se desmontan. |

Regla mental corta: **conexión → `subscribe`; datos → `useEffect` con `.off`; global sin estado → el singleton.**

### Dos gotchas del `useEffect` de datos

```ts
useEffect(() => {
  const socket = getSocketConnection();
  const onMessage = (msg: SerializableMessageDocument) => {
    setHistory((prev) => [...prev, msg]);
  };
  socket.on("message-received", onMessage);
  return () => socket.off("message-received", onMessage);
}, [bookingId]);
```

1. **`.off` con la MISMA referencia.** Por eso `onMessage` se declara adentro del effect y se pasa la misma función a `.on` y a `.off`. Un handler inline distinto en cada uno no se des-engancha.
2. **Handler que cambia cada render.** Si depende de props/estado y lo metés en las deps, el effect re-corre en cada cambio → detach/attach constante. El patrón robusto es guardar el handler en un `useRef` y que el effect lea siempre `ref.current` (el "latest ref" pattern).

### Dónde **no** hacerlo

* **En el cuerpo del componente** (fuera de effect) → corre en cada render, apila listeners.
* **Dentro de un event handler** (`sendMessage`, un `onClick`) → engancharía un listener nuevo por cada invocación.
* **En el `subscribe` de `useSyncExternalStore` si el evento trae payload que querés acumular** → ese `subscribe` es solo para "avisá a React que re-lea el snapshot", no para guardar datos. Mensajes entrantes son estado, no snapshot.

---

## 7. Resumen

* **El problema:** el socket vive fuera de React; leer `socket.connected` en el render no dispara re-render cuando cambia.
* **`subscribe`** = cómo me entero (enganchás `callback()` a los eventos). **`getSnapshot`** = qué valor leo (y debe ser estable, o loop infinito).
* React compara con **`Object.is`**: por eso `getSnapshot` debe devolver **el valor primitivo** (`connected`), no el objeto mutable que lo contiene — mutar una propiedad no cambia la identidad y React no lo ve.
* El **socket** (estable) se toma con `getSocketConnection()` directo; el **estado de conexión** (booleano) va por `useSyncExternalStore` con `subscribe` a `connect`/`disconnect`/`connect_error`.
* **`getServerSnapshot`** da un valor estable en SSR y evita el hydration mismatch: `false` en el server, estado real post-hidratación.
* **Dónde enganchar handlers:** conexión → `subscribe`; datos que van a estado → `useEffect` con `.off`; global sin estado → el singleton. Con un socket singleton, todo `.on` necesita su `.off`.

---

## Referencias

* [React — `useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore)
* [React — You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) (por qué esto es mejor que `useEffect` + `setState`)
* [MDN — `Object.is()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is)
* Implementación: `components/chat/use-booking-chat.ts`, `lib/socket.ts`
* Consumidor: `components/chat/chat-composer.tsx`
