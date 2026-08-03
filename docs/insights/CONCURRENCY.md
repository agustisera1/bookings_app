# Concurrencia — problemas y soluciones

## Grupo 1 — safety (los datos quedan mal)

**Check-then-act** — Es cuando mirás cómo está algo, decidís en base a eso, y para cuando actuás ese "cómo está" ya dejó de ser cierto.
*Ejemplo:* dos guests ven el calendario con las fechas libres, los dos aprietan Reservar, y los dos entran.
*Cuándo:*
- **Aparece si el recurso es único o limitado** — una fecha, un asiento, un nombre de usuario. Si sobra para todos, no hay problema.
- **¿Chocan seguido o casi nunca?** Si es raro, dejá que la base rechace al segundo: es lo más barato. Si chocan todo el tiempo, conviene candado o hold, porque tirarle error a la mitad de la gente es peor que hacerla esperar.
- **¿Cuánto trabajo se tira el que pierde?** Si son 2 milisegundos, que reintente y listo. Si ya llenó un formulario o metió la tarjeta, necesitás hold.
- **¿Todo pasa por la misma base?** Sí → la regla va en la base. Si hay varias bases o varios servicios, no hay un lugar común y ahí sí necesitás un candado externo (Redis).
- **Ojo con el throughput:** todo candado es una fila de espera. Si mil personas pelean por lo mismo, el candado se vuelve el cuello de botella y no se arregla con más servidores.

*Soluciones:*
- **Que mirar y actuar sean un solo paso.** En vez de preguntar "¿están libres esas fechas?" y después decir "reservá", una sola orden: "reservá **solo si** están libres".
  - **Postgres** — `INSERT ... ON CONFLICT DO NOTHING`: intenta insertar; si choca con una regla, no hace nada. Te devuelve cuántas filas insertó: 1 = ganaste, 0 = perdiste.
  - **Mongo** — `findOneAndUpdate({ _id, estado: "libre" }, { $set: { estado: "tomado" } })`: busca **y** modifica en una sola llamada. Si otro ya lo tomó, el filtro no encuentra nada.
  - **Redis** — `SET clave valor NX`: `NX` significa "solo si no existe". El primero lo crea, el segundo recibe "no".
- **Declararle la regla a la base.** Le decís una vez "nunca dos reservas pisadas en el mismo listing" y ella rechaza sola al que llegue segundo. Es lo que ya tenés.
  - **Postgres** — `ALTER TABLE bookings ADD CONSTRAINT no_overlap EXCLUDE ...`, en `db/migrations/003_booking_no_overlap.sql`. `ALTER TABLE` = "modificá esta tabla", `ADD CONSTRAINT` = "agregale esta regla", `EXCLUDE` = "rechazá la fila nueva si se pisa con una que ya está".
  - **Mongo** — no tiene reglas de solapamiento; lo más parecido es `createIndex({ campo: 1 }, { unique: true })`, que solo evita valores repetidos exactos.
- **Candado.** Trabás esas fechas mientras el primero decide; el segundo espera afuera.
  - **Postgres** — `SELECT ... FOR UPDATE`: al leer la fila la deja trabada hasta que terminás. Para trabar algo que todavía no es una fila (unas fechas), `pg_advisory_xact_lock(numero)`: trabás un número inventado por vos.
  - **Redis** — `SET lock:listing:123 token NX EX 30`: crea el candado solo si no existe, y lo borra solo a los 30 segundos por si el que lo tomó se murió.
- **Hold.** El primero que aprieta Reservar deja una fila "pendiente" que ya ocupa esas fechas mientras termina de pagar.
  - **Postgres + tu service** — insertás la reserva con `status = 'pending'` (ya existe en tus estados) y una columna `expires_at`. Como la regla de arriba también mira las pendientes, el segundo ya rebota.
  - **Worker** — un job que corre cada X minutos y pasa a `cancelled` las pendientes vencidas, para liberar las fechas.

**Lost update** — Es cuando dos leen el mismo dato, cada uno le hace su cambio encima, y el que guarda último borra el cambio del primero sin enterarse.
*Ejemplo:* vos y otro host editan la descripción del mismo listing. Él guarda, después guardás vos, y lo que él escribió desapareció.
*Cuándo:*
- **Aparece si dos personas pueden editar la misma cosa** y la pantalla muestra datos que se leyeron hace rato.
- **¿Cuánto pasa entre abrir el formulario y guardar?** Cuanto más largo, más probable. Un formulario que queda abierto media hora es el caso clásico.
- **¿Es común que dos editen lo mismo?** Si es raro —tu caso: un listing tiene un solo host— casi no hace falta nada. Si es lo normal (un documento compartido), la versión es obligatoria.
- **¿Se puede partir el dato en campos independientes?** Si cada uno toca un campo distinto, se resuelve solo y es la salida más barata.

*Soluciones:*
- **Guardar solo si nadie tocó.** La fila lleva un número de versión. Vos abriste el formulario con la versión 4; al guardar decís "guardá **solo si** sigue en la 4". Como él ya guardó y quedó en la 5, lo tuyo no entra y te avisa.
  - **Postgres** — `UPDATE listings SET descripcion = $1, version = version + 1 WHERE id = $2 AND version = $3`. El `WHERE` es "solo la fila que cumpla esto". Si la versión ya cambió, no encuentra nada y modifica 0 filas: ahí sabés que perdiste.
  - **Mongo** — `updateOne({ _id, version: 4 }, { $set: {...}, $inc: { version: 1 } })`. Mismo truco: la versión va en el filtro.
- **Mandar solo el campo que tocaste.** Si él cambió el título y vos la descripción, cada uno manda lo suyo y nunca se pisan.
  - **Mongo** — `$set: { descripcion: "..." }` toca solo ese campo y deja el resto intacto. Reemplazar el documento entero es lo que pisa.
  - **Postgres** — el `UPDATE` nombra solo la columna que cambió, no todas.
- **Candado.** Mientras vos tenés el formulario abierto, el otro host no puede editar.
  - **Postgres** — `SELECT ... FOR UPDATE`, igual que arriba. Sirve poco acá: solo dura lo que dura la conexión, y un formulario abierto dura mucho más.
  - **Redis** — `SET lock:listing:123 ... EX 300` mientras el formulario está abierto, renovándolo. Es lo que hacen Figma o Notion con el "alguien más está editando".

**Out-of-order delivery** — Es cuando dos cosas llegan en un orden distinto al que ocurrieron, y el resultado depende del orden.
*Ejemplo:* el worker procesa "reserva cancelada" antes que "reserva creada", y falla porque busca una reserva que todavía no existe.
*Cuándo:*
- **Aparece solo si hay cola o mensajes entre servicios.** Si todo corre dentro de una función, de arriba a abajo, no existe.
- **¿Cuántos workers consumen a la vez?** Con uno solo casi no pasa. Con varios en paralelo, es cuestión de tiempo.
- **¿El resultado cambia según el orden?** "Cancelar" después de "crear" sí. Dos "mandá un mail" no: da lo mismo cuál sale primero.
- **Antes que nada, preguntate si podés hacer que el orden no importe.** Es la salida más barata y la que menos se rompe.

*Soluciones:*
- **Numerar los mensajes.** "creada" es el 1, "cancelada" es el 2. Si llega el 2 y todavía no procesaste el 1, lo dejás esperando.
  - **Postgres** — tu tabla `outbox` ya tiene un `id` que va subiendo. El worker guarda cuál fue el último que procesó de esa reserva y descarta los que vienen atrasados.
- **Un solo carril por reserva.** Todos los mensajes de esa reserva van siempre por la misma fila de la cola, así salen en el orden en que entraron.
  - **BullMQ** — no trae carriles por clave en la versión libre. Se emula con un candado de Redis por reserva: el segundo mensaje espera a que el primero suelte.
  - **Kafka / Redis Streams** — acá sí es nativo: mandás con "clave = id de la reserva" y la herramienta garantiza que todo lo de esa clave va en orden.
- **Reintentar el que llegó temprano.** Llega "cancelada", la reserva no existe: no lo tirás, lo volvés a intentar en 30 segundos.
  - **BullMQ** — `attempts: 5` y `backoff: { type: "exponential", delay: 30000 }`. Si el job lanza un error, la cola lo reintenta sola, esperando cada vez más.
- **Que el orden no importe.** El mensaje dice "esta reserva quedó cancelada" en vez de "cancelala". Aplicalo dos veces o al revés: el resultado es el mismo.
  - **No hay herramienta** — es cómo escribís el contenido del mensaje. Mandás el estado final, no la orden.

**Duplicate delivery** — Es cuando la misma acción se ejecuta dos veces sin que nadie la haya pedido dos veces.
*Ejemplo:* doble click en Pagar y le cobrás dos veces al guest.
*Cuándo:*
- **Aparece si hay reintentos automáticos** — colas, webhooks, el navegador reintentando— **o si el usuario puede apretar dos veces.**
- **¿Qué pasa si se ejecuta dos veces?** Dos mails es molesto. Dos cobros es grave. Eso solo decide cuánto invertís en evitarlo.
- **¿La acción se puede repetir sin daño?** "Marcar como leída" sí: la repetís mil veces y queda igual. "Cobrar" no.
- **Regla práctica:** todo lo que sale hacia afuera (pago, mail, SMS) va con llave, siempre.

*Soluciones:*
- **Llave de idempotencia.** El botón manda un código único por intento de pago. Si te llega el mismo código dos veces, no cobrás de nuevo: devolvés el resultado del primer cobro.
  - **BullMQ** — `jobId`: si mandás dos jobs con el mismo `jobId`, el segundo se descarta. Es lo que ya usás para no mandar el mismo mail dos veces.
  - **APIs de pago** — mandás el header `Idempotency-Key: <código>`. Stripe y Mercado Pago lo tienen: con el mismo código te devuelven el cobro original en vez de cobrar de nuevo.
- **Que la base rechace el repetido.** Guardás ese código en una columna que no admite repetidos, y el segundo intento rebota solo.
  - **Postgres** — `ALTER TABLE pagos ADD CONSTRAINT pago_unico UNIQUE (idempotency_key)`. `UNIQUE` = "no puede haber dos filas con el mismo valor acá".
  - **Mongo** — `createIndex({ idempotency_key: 1 }, { unique: true })`.
- **Deshabilitar el botón.** Ayuda, pero no alcanza: el usuario puede refrescar, o el navegador reintentar por su cuenta.
  - **React Hook Form** — `disabled={isSubmitting}`, que ya es el patrón de tus formularios.

## Grupo 2 — liveness (nadie avanza)

**Deadlock** — Es cuando cada uno espera algo que tiene el otro, y ninguno suelta lo que ya agarró. Quedan trabados para siempre.
*Ejemplo:* yo tengo la sal y quiero la pimienta, vos tenés la pimienta y querés la sal.
*Cuándo:*
- **Aparece solo si usás candados sobre más de una cosa a la vez.** Sin candados no existe; con un candado solo, tampoco.
- **¿Cuántos candados toma una operación?** Uno = imposible que pase. Dos o más = posible.
- **¿Hay varios lugares del código que toman los mismos candados?** Ahí es donde se cuela el orden distinto, casi siempre sin que nadie se dé cuenta.
- **Se manifiesta con carga, en producción y de golpe.** Por eso conviene evitarlo por diseño y no confiar en detectarlo a tiempo.

*Soluciones:*
- **Pedir siempre en el mismo orden.** Todos agarran primero la sal y después la pimienta, nunca al revés. Con eso el problema desaparece.
  - **Tu código** — antes de pedir los candados, ordenás los ids: `ids.sort()` y los pedís en ese orden. No hay herramienta, es una convención que respetás en todos lados.
- **Agarrar una sola cosa.** Si solo necesitás la sal, nunca te trabás con nadie.
  - **Diseño** — si necesitás trabar dos cosas, muchas veces se puede meter todo en un candado solo (el listing entero en vez de cada fecha).
- **Timeout.** Si en 5 segundos no conseguiste la pimienta, soltás la sal y volvés a empezar.
  - **Postgres** — `SET lock_timeout = '5s'`: si en 5 segundos no consigue el candado, corta la operación con error.
  - **Redis** — el `EX 30` del candado ya es eso: vence solo.
- **Que la base lo detecte.** Postgres ve el abrazo, mata a uno de los dos y le devuelve error para que reintente.
  - **Postgres** — viene activado de fábrica, no configurás nada. Devuelve el código de error `40P01`. Lo único tuyo es reintentar cuando lo ves.

**Starvation** — Es cuando alguien nunca llega a agarrar el recurso porque siempre se le adelanta otro. No está trabado: está postergado para siempre.
*Ejemplo:* una cola donde siempre entran pedidos urgentes, y el pedido normal nunca llega a ser atendido.
*Cuándo:*
- **Aparece solo si hay prioridades**, o un recurso muy peleado. Con una cola simple por orden de llegada, no existe.
- **¿Qué proporción son los urgentes?** Si son el 5% del tráfico, no molestan. Si vienen en picos que tapan todo, sí.
- **¿Alguien puede acaparar?** Un solo cliente mandando miles de pedidos produce el mismo efecto que las prioridades.
- **Duele por percepción, no por datos rotos.** Nada quedó mal guardado: simplemente hay un usuario esperando para siempre, y eso no aparece en ningún log de error.

*Soluciones:*
- **Cola justa.** El que llegó primero se atiende primero, urgente o no.
  - **BullMQ** — es el comportamiento por defecto: si no le ponés prioridades, atiende en orden de llegada.
- **Envejecimiento.** Cuanto más espera el pedido normal, más prioridad va ganando, hasta que le toca sí o sí.
  - **BullMQ** — `priority: 1..N` (más chico = más urgente), y un job que cada tanto le baja el número a los que llevan mucho esperando. No viene solo, lo armás vos.
- **Poner un techo.** No pueden entrar más de X urgentes seguidos; después pasa uno normal a la fuerza.
  - **BullMQ** — `limiter: { max: 100, duration: 60000 }`: como mucho 100 por minuto, así una avalancha de urgentes no tapa el resto.
  - **Tu app** — `lib/rate-limit.ts`, que ya usás para cortar abuso por IP.
