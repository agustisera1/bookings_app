# Base de datos

## Comandos

```bash
pnpm db:setup      # schema completo: db:migrate + db:indexes (idempotente)
pnpm db:migrate    # aplica las migraciones pendientes de PostgreSQL
pnpm db:indexes    # crea los índices de MongoDB (scripts/db_indexes.ts)
pnpm db:seed       # datos de demo en las dos bases (scripts/seed.ts)
pnpm db:reset      # borra los datos (pregunta antes); `-- --dry-run` para ver qué borraría
pnpm db:generate   # genera una migración desde los cambios en lib/*/tables.ts
pnpm db:schema     # imprime el schema actual de PostgreSQL como JSON
```

Todos cargan `.env.local` con `dotenv-cli`.

## Infra en Docker

`docker-compose.yml` levanta Postgres, Mongo, Redis y Mongo Express con las credenciales y puertos
de `.env.local` (Redis con el ACL de `REDIS_USER`). Lo usan la app y `greenaway-worker`.

```bash
pnpm infra:up      # contenedores sanos + db:setup + db:seed
pnpm infra:down    # los baja; los datos quedan en los volúmenes
pnpm infra:reset   # borra contenedores y volúmenes, y vuelve a infra:up
```

Los comandos `infra:*` son scripts de `package.json` sobre `docker compose --env-file .env.local`;
`infra:up` agrega `--wait` (espera los healthchecks) y después corre `db:setup` y `db:seed`.

### Puertos ocupados

Los contenedores publican los puertos de `.env.local` (`PGPORT`, `REDIS_PORT`) y `27017` para Mongo.
Si `infra:up` falla con *port is already allocated* o *bind: address already in use*, hay otro
proceso escuchando en ese puerto, en general un Postgres, Mongo o Redis instalado en la máquina o un
contenedor de otro compose:

- **Servicio local:** detenerlo. En Windows, como administrador, `net stop <servicio>` (p. ej.
  `MongoDB`, `postgresql-x64-17`), y en `services.msc` pasarlo a "Manual" para que no vuelva a
  arrancar solo. En macOS, `brew services stop <servicio>`; en Linux, `sudo systemctl stop <servicio>`.
- **Contenedor viejo:** `docker ps` lo muestra; `docker rm -f <nombre>` lo borra.
- **O cambiar el puerto:** `PGPORT` y `REDIS_PORT` en `.env.local`; para Mongo, `MONGO_PORT` en
  `.env.local` y el mismo puerto en `MONGODB_URI`.

Para ver quién ocupa un puerto: `netstat -ano | findstr :5433` (Windows) o `lsof -i :5433`.

## Orden

1. **`db:setup`** deja el schema listo en las dos bases. Se puede correr las veces que haga falta.
2. **`db:seed`** (opcional) carga datos de demo. La app funciona sin seed.

`infra:up` corre los dos. Para volver a empezar sin tocar los contenedores:
`pnpm db:reset --yes && pnpm db:seed`.

Sin `db:indexes` la app funciona pero más lenta, salvo los índices **únicos** (`chats.booking_id`,
`read_cursors.user_id`, `notifications.event_id`): sostienen invariantes, no performance.

## PostgreSQL — migraciones de drizzle

- El schema se define en `lib/<service>/tables.ts`. `pnpm db:generate` compara contra el último
  snapshot (`db/migrations/meta/`) y escribe el SQL en `db/migrations/NNNN_nombre.sql`.
- Lo que drizzle no modela (un `EXCLUDE`, un backfill de datos) va en una migración custom:
  `pnpm db:generate --custom --name=<nombre>` crea el archivo vacío para escribirlo a mano.
  Ej.: `0001_booking_no_overlap.sql`, `0004_users_email_lowercase_data.sql`.
- drizzle registra lo aplicado en `drizzle.__drizzle_migrations`. No hay rollback: un cambio se
  revierte con una migración nueva.

## MongoDB — índices

Todos los índices viven en `scripts/db_indexes.ts`, y ningún otro script crea índices.
`createIndexes` no hace nada si el índice ya existe con la misma definición; si cambia su
definición, hay que dropear el viejo antes.

## Seed

`pnpm db:seed` carga un set determinístico, con fechas relativas al día en que corre, que cubre
los tres flujos principales (reservar, chat y login):

| Qué | Cuánto |
|---|---|
| Usuarios `@greenaway.test` (contraseña `greenaway-demo`) | 3 hosts (`lucia`, `martin`, `sofia`) y 6 guests |
| Listings | 30, repartidos entre los hosts |
| Reservas | ~100 en los cuatro estados: estadías pasadas, en curso, próximas, pendientes, canceladas (con su reembolso) y rechazadas |
| Notificaciones | las que el worker habría escrito por cada transición; las de más de 3 días, leídas |
| Chats | ~70 con sus mensajes, y un cursor de lectura por usuario que deja mensajes sin leer |

### Usuarios de prueba

Todos con la contraseña **`greenaway-demo`**.

| Rol | Nombre | Email |
|---|---|---|
| Host | Lucía Fernández | `lucia@greenaway.test` |
| Host | Martín Gómez | `martin@greenaway.test` |
| Host | Sofía Romero | `sofia@greenaway.test` |
| Guest | Valentina Díaz | `valentina@greenaway.test` |
| Guest | Joaquín Pereyra | `joaquin@greenaway.test` |
| Guest | Camila Sosa | `camila@greenaway.test` |
| Guest | Tomás Herrera | `tomas@greenaway.test` |
| Guest | Florencia Ruiz | `florencia@greenaway.test` |
| Guest | Nicolás Benítez | `nicolas@greenaway.test` |

Para una demo, dos ventanas: un host (`lucia`) y un guest (`valentina`) muestran los dos lados de
una misma reserva y de su chat.

### Reglas

- Siembra solo tablas de datos vacías: si encuentra reservas o listings, se saltea y lo avisa.
- Los usuarios se insertan con `ON CONFLICT DO NOTHING`, así que sobreviven al reset y no se duplican.
- No escribe en el outbox: sembrar no dispara emails ni notificaciones en vivo.

## Reset

`db:reset` borra datos, no schema: `bookings`, `reviews`, `outbox` y `processed_events` en Postgres
(los `users` quedan), las colecciones de Mongo con `deleteMany` (los índices quedan) y el bucket de
S3. Si las credenciales no pueden listar el bucket (`s3:ListBucket`), S3 se saltea con un aviso.
