# RATE_LIMITING_ALGORITHMS.md

Referencia conceptual sobre los **algoritmos de conteo** de un rate limiter —qué hace cada uno y en
qué se diferencian— más los conceptos de infra/Redis que aparecen al implementar una cota. Es la
teoría; **qué algoritmo usa este proyecto y por qué** (fixed window) vive en el ADR
[`RATE_LIMITING.md`](../architecture/RATE_LIMITING.md). Para las capas de seguridad y la IP como
clave, ver [`SECURITY_LAYERS.md`](SECURITY_LAYERS.md).

---

## Qué hace cada algoritmo (en criollo)

Todos responden la misma pregunta —"¿este cliente ya pasó su cuota?"— pero la miden distinto:

- **Fixed window (ventana fija)** — un contador que se **resetea cada X minutos**. Contás los hits del
  bloque actual; si pasás el límite, cortás hasta que arranca el próximo bloque y el contador vuelve a
  cero. Un número por cliente: lo más simple y barato.
- **Sliding window log (registro deslizante)** — en vez de un contador, guardás la **marca de tiempo
  de cada intento**. Para decidir, contás cuántas caen en los últimos X minutos *hacia atrás desde
  ahora*. La ventana se "desliza" con el tiempo, así que es exacto — pero guardás una entrada por
  intento (la memoria crece con el tráfico).
- **Sliding window counter (contador deslizante)** — el punto medio: mantenés solo **dos contadores**
  (la ventana actual y la previa) y estimás "los últimos X minutos" ponderando la previa por cuánto se
  solapa. Casi tan preciso como el log, pero con dos números en vez de una lista.
- **Token bucket (balde de fichas)** — un balde que se **rellena con fichas a ritmo fijo** (p. ej.
  1/seg, tope 10). Cada request gasta una ficha; sin fichas, se rechaza. Permite **ráfagas** (gastar
  10 juntas) pero impone una **tasa promedio**. Pensado para regular el caudal de una API.
- **Leaky bucket (balde que gotea)** — los requests caen en un balde que **gotea a ritmo constante**;
  si rebalsa, se descartan. Alisa la salida a una tasa fija. Primo del token bucket.

> Cuál elige este proyecto (fixed window), con qué costo asumido (*boundary burst*) y contra qué
> alternativas, está en el Eje 4 del ADR [`RATE_LIMITING.md`](../architecture/RATE_LIMITING.md).

---

## Glosario

- **Atómico** — una operación que ocurre "todo o nada", sin estados intermedios visibles y sin que
  otra se intercale en el medio. Es lo que evita que dos requests concurrentes pisen el mismo contador.
- **`INCR` / `PEXPIRE` / `PTTL`** — comandos de Redis: `INCR` suma 1 al contador (y lo crea en 0 si no
  existía); `PEXPIRE` le pone a la key un vencimiento en milisegundos (se borra sola al llegar a cero);
  `PTTL` devuelve cuántos ms le quedan de vida.
- **Lua** — un lenguaje de scripting minúsculo que Redis ejecuta **del lado del servidor y de forma
  atómica**: le mandás un script y lo corre entero sin que otro comando se meta en el medio. Se usa
  para que `INCR` + `PEXPIRE` + `PTTL` cuenten como una sola operación indivisible, en un round trip.
- **Round trip** — un viaje de ida y vuelta app ↔ Redis (mandar comando, recibir respuesta). Menos
  round trips = menos latencia; un script Lua hace las tres operaciones en uno.
- **Boundary burst (ráfaga de borde)** — el agujero del fixed window: como el contador se resetea de
  golpe al terminar la ventana, un cliente puede gastar toda la cuota justo antes del reset y toda de
  nuevo justo después → hasta 2× el límite en un instante, en el "borde" entre ventanas. Detalle en el
  Eje 4 del ADR [`RATE_LIMITING.md`](../architecture/RATE_LIMITING.md).
- **SPOF (single point of failure)** — una pieza cuya caída voltea toda la función. Redis es el SPOF de
  la cota: si se cae, no hay contador (de ahí el `failMode`).
- **Cold / warm start** — en serverless, un *cold start* arranca un proceso nuevo desde cero (sin
  conexiones abiertas); un *warm start* reusa uno ya "caliente" de un request anterior. Importa para no
  reabrir la conexión a Redis en cada invocación.
