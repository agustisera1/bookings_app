# Alcance de la auditoría

## Flujos ↔ dimensiones

Solo se audita lo que estos flujos tocan. Los números refieren a [DIMENSIONS.md](DIMENSIONS.md).

| Flujo | Features | Dimensiones |
|---|---|---|
| **1. Reservar** (guest reserva → host acepta/rechaza) | Concurrencia, outbox, relay, colas, notificación realtime, dos bases | 1, 2, 4, 5, 6, 7 |
| **2. Chat host↔guest** | Realtime (socket.io), Mongo | 4, 6, 7, 9 |
| **3. Login y sesión** | Auth con refresh, rate limiting | 2, 4, 8, 9 |
| Transversal | Entorno reproducible (Docker + seed), docs y diagramas | 12, 13 |

Fuera de alcance: búsqueda y filtros, reviews, perfil, alta de listing, fotos en S3.

## Visibilidad interna (para las demos)

UIs livianas en el compose para mostrar lo que pasa detrás de cada flujo:

| Herramienta | Qué muestra |
|---|---|
| **Bull Board** | Las colas en vivo: jobs que entran, se reintentan y fallan |
| **Mailpit** | El mail que llega (requiere un transporte SMTP en dev; hoy el worker usa Resend) |
| **Mongo Express** | La notificación que aparece en Mongo |
| **Consulta a `outbox`** | La fila pasando de pendiente a publicada |
| **Logs del worker** | El relay tomando el evento |
