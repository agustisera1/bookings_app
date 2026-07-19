# TD-09 — Robustez del transporte socket

| | |
|---|---|
| **Branch** | `fix/socket-transport-robustness` |
| **Bloque** | Chat |
| **Prioridad** | 🟠 Media |
| **Esfuerzo** | ~2-3 h |
| **Depende de** | — (coordinar con **TD-08** si se hacen juntos) |
| **Origen** | [`tech_debt/CHAT_FEATURE_NEXT_STEPS.md`](../tech_debt/CHAT_FEATURE_NEXT_STEPS.md) § Robustez del transporte |
| **Repos** | `bookings_app` |

## Problema

Tres huecos en `components/chat/use-booking-chat.ts` y `lib/socket.ts`. Van juntos porque los tres
son la misma omisión: **el cliente asume que la conexión es un hecho estable, y no lo es.**

### 1. Al reconectar se pierde la membresía del room

El `join-chat` se emite en un `useEffect` con dependencia `[bookingId]`. Se corre una vez al montar
el hilo. Cuando el socket se reconecta, socket.io crea una conexión nueva que **no está en ningún
room** — y como `bookingId` no cambió, el efecto no vuelve a correr.

**Resultado: el hilo deja de recibir mensajes y no avisa.** La UI se ve perfecta y el chat está
muerto. Es el peor de los tres.

### 2. El `ack` no tiene timeout

```ts
getSocketConnection().emit(EVENTS.CLIENT_MESSAGE, payload, (res: MessageAck) => { ... });
```

Si el worker se cae **después** de recibir el emit, el callback nunca corre y la burbuja queda
`pending` para siempre — indistinguible de "en vuelo". "Enviando…" es un estado del que no se sale.

### 3. `useSocket` está invertido

```ts
const subscribe = () => () => {
  // socket.on("connect", () => {})     ← stubs comentados
  // socket.on("disconnect", () => {});
};

const socket = useSyncExternalStore(
  subscribe,
  () => getSocketConnection(),   // ← el snapshot abre la conexión
  () => null,
);
```

El `subscribe` es un no-op y el `getSnapshot` —que debe ser **puro**— es el que abre la conexión.
El singleton lo hace idempotente, así que no explota, pero está al revés: lo que sí es estado
reactivo externo es el **estado de conexión**, y es justo lo que no se está sincronizando. Por eso
la UI no puede mostrar "reconectando…" ni deshabilitar el composer.

## Por qué entra

**Aprendizaje**, y es el ticket que mejor cierra la feature de realtime.

El chat "funciona end-to-end" en condiciones ideales. Estos tres huecos son lo que separa una demo
de un transporte real: qué pasa cuando la red se corta, cuando el server se cae a mitad de un
envío, cuando el usuario cierra el laptop y lo abre una hora después. Ninguno se ve en la prueba
feliz, y los tres se ven en cuanto alguien lo usa de verdad.

El punto 3 además es exactamente el caso de uso para el que existe `useSyncExternalStore` — y ya
hay un insight doc escrito sobre la API (`docs/insights/USE_SYNC_EXTERNAL_STORE.md`). Es la
oportunidad de usarla bien en vez de tenerla puesta como decoración.

## Alcance

**1. Re-join en `connect`.** Suscribirse al evento `connect` del socket y re-emitir `join-chat`
para el `bookingId` activo. Al reconectar hay que considerar si además conviene refetchear el
historial: los mensajes que llegaron mientras estaba desconectado no están en ningún lado del
cliente.

**2. `socket.timeout(ms).emit(...)`.** La variante con timeout invoca el callback con un error como
primer argumento cuando vence. **Cambia la firma del callback** (`(err, res) => ...`), así que hay
que ajustar la reconciliación del mensaje optimista: un timeout se trata igual que un
`{ ok: false }` → burbuja marcada `failed`.

**3. Dar vuelta `useSocket`.** El `subscribe` real registra `connect` / `disconnect` /
`connect_error` y notifica; el `getSnapshot` devuelve el **estado de conexión** (puro, sin efectos
secundarios), no el socket. La conexión se abre donde corresponde, no dentro del snapshot.

Con el estado de conexión disponible, cablearlo a la UI: indicador de "reconectando…" y composer
deshabilitado mientras no haya conexión.

## Criterio de aceptación

- [ ] Matar el worker y volver a levantarlo: el hilo **vuelve a recibir** mensajes sin recargar la
      página.
- [ ] Con el worker caído, un mensaje enviado termina marcado como fallido en un tiempo acotado —
      no queda "enviando…" indefinidamente.
- [ ] La UI refleja el estado de conexión, y el composer se deshabilita cuando no hay conexión.
- [ ] `getSnapshot` no tiene efectos secundarios.

## Fuera de alcance

- **Tap-para-reintentar** un mensaje fallido. Este ticket garantiza que el fallo **se detecte**; la
  UI para recuperarlo es otra cosa. `ThreadMessage` ya tiene el flag `failed` si algún día se quiere.
- El `auth` como función en vez de objeto literal — solo aplica si se pasa a token por `auth`,
  que es **TD-08**.
