# TEXT_ENCODING.md

Guía de referencia sobre cómo JavaScript maneja el texto plano de alto nivel, su transformación en bytes optimizados para redes o almacenamiento y las herramientas nativas del ecosistema web.

---

## 1. Conceptos Fundamentales

### Texto Plano vs. `Uint8Array`
La diferencia principal radica en el nivel de abstracción y en el destinatario del dato:

*   **Texto Plano (`String`):** Es una secuencia de caracteres abstractos (letras, símbolos, emojis). Está diseñado para ser legible y cómodo para los **humanos**. Internamente en JavaScript, suele ocupar 2 bytes por carácter.
*   **`Uint8Array`:** Es un contenedor de bajo nivel que almacena bytes puros (números enteros sin signo del `0` al `255`). Está diseñado para ser procesado directamente por la **computadora**, tarjetas de red y discos duros.

Al transferir datos por internet (WebSockets, HTTP, WebRTC), convertir el texto plano a un `Uint8Array` elimina la sobrecarga del motor de JavaScript, enviando la información en su estado más puro, compacto y ligero.

---

## 2. ¿Qué es UTF-8 y sus Variantes?

**UTF-8** (*Universal Coded Character Set + Transformation Format—8-bit*) es el sistema de codificación estándar de internet. Funciona como un diccionario que traduce caracteres abstractos a secuencias numéricas (bytes).

### Características principales de UTF-8
*   **Longitud variable:** Utiliza entre 1 y 4 bytes por carácter según su complejidad.
*   **Eficiencia:** Los caracteres occidentales básicos (ASCII) ocupan solo **1 byte**.
*   **Universalidad:** Las tildes o caracteres especiales ocupan **2 o 3 bytes**, y los emojis complejos ocupan **4 bytes**.

### Comparativa con otras variantes de codificación (Unicode)

| Formato | Comportamiento | Uso común |
| :--- | :--- | :--- |
| **UTF-8** | Variable (1 a 4 bytes). Ultra ligero para texto estándar. | Estándar absoluto en la Web (98%+). |
| **UTF-16** | Variable (2 o 4 bytes). Duplica el peso de caracteres básicos. | Formato interno de JavaScript en memoria. |
| **UTF-32** | Fijo (Siempre 4 bytes por carácter). Muy pesado. | Procesamiento interno donde contar caracteres sea crítico. |

---

## 3. Ejemplos Prácticos de Codificación

A continuación se muestra cómo tres palabras con distinta complejidad se transforman en secuencias numéricas (bytes) según el tipo de formato UTF seleccionado:

### UTF-8 (Longitud Variable - Eficiente)
*   **`"Hola"`** *(4 caracteres básicos)* → `[72, 111, 108, 97]` → **4 bytes**
*   **`"Café"`** *(3 básicos + 1 con tilde)* → `[67, 97, 102, 195, 169]` → **5 bytes** *(La `é` toma 2 bytes)*
*   **`"Auto🚗"`** *(4 básicos + 1 emoji)* → `[65, 117, 116, 111, 240, 159, 153, 151]` → **8 bytes** *(El emoji toma 4 bytes)*

### UTF-16 (Bloques fijos de mínimo 2 bytes)
*   **`"Hola"`** → `[72, 0, 111, 0, 108, 0, 97, 0]` → **8 bytes** *(Rellena con ceros)*
*   **`"Auto🚗"`** → `[65, 0, 117, 0, 116, 0, 111, 0, 61, 216, 55, 222]` → **12 bytes** *(4 letras de 2 bytes + 1 emoji de 4 bytes)*

### UTF-32 (Longitud Fija Absoluta)
*   **`"Hola"`** → `[72, 0, 0, 0, 111, 0, 0, 0, 108, 0, 0, 0, 97, 0, 0, 0]` → **16 bytes** *(4 bytes estrictos por letra)*
*   **`"Auto🚗"`** → `[...bytes...]` → **20 bytes** *(5 caracteres × 4 bytes cada uno)*

---

## 4. La Interfaz `TextEncoder`

`TextEncoder` es la herramienta nativa de JavaScript que actúa como el puente intermedio entre el mundo humano y el binario. Toma un string de texto plano y lo codifica automáticamente en formato **UTF-8**, devolviendo un `Uint8Array`.

```text
[Texto Plano: "Café"] ───( TextEncoder.encode() )───> [Uint8Array: 67, 97, 102, 195, 169]
```

### Uso básico en código

```javascript
// 1. Instanciar el codificador
const encoder = new TextEncoder();

// 2. Definir el texto plano
const texto = "¡Hola Mundo!";

// 3. Convertir a bytes de bajo nivel
const bytes = encoder.encode(texto);

console.log(bytes); 
// Devuelve un Uint8Array preparado para transferirse por la red
```

### Casos de uso reales en desarrollo web
*   **WebSockets y Streaming:** Envío de paquetes de datos en videojuegos multijugador o chats en tiempo real sin la sobrecarga de peso de un string tradicional.
*   **Web Crypto API (Criptografía):** Algoritmos como SHA-256 o AES no procesan letras; requieren obligatoriamente que el texto sea convertido a un `Uint8Array` mediante `TextEncoder` antes de generar hashes o firmas digitales.
*   **Web Workers:** Transferencia instantánea de grandes volúmenes de datos binarios entre el hilo principal y de fondo sin duplicar el consumo de memoria del navegador.
*   **Descarga de Archivos:** Creación y empaquetado de archivos de texto (`.txt`, `.csv`) estructurados directamente desde la memoria del navegador usando objetos `Blob`.

---

## 5. Consideraciones Avanzadas y Trampas Comunes

### A. La diferencia entre `String.length` y `Uint8Array.length`
En JavaScript, la propiedad `.length` de un texto plano cuenta **caracteres**, pero en un `Uint8Array` cuenta **bytes estrictos**. Esto es crítico al calcular tamaños para bases de datos o cabeceras de red (`Content-Length`).

```javascript
const texto = "Café";
console.log(texto.length); // Devuelve 4 (4 letras)

const bytes = new TextEncoder().encode(texto);
console.log(bytes.length); // Devuelve 5 (5 bytes, porque la 'é' usa dos bytes)
```
*   **Regla de oro:** Nunca uses el `.length` del string para estimar espacio físico o de transmisión; usa siempre el `.length` del `Uint8Array`.

### B. El peligro de cortar buffers por la mitad (Splitting)
Como UTF-8 es de longitud variable, caracteres como los emojis ocupan 4 bytes. Si se procesan datos por red en partes ("chunks") o se recorta un `Uint8Array` usando `.slice()`, **se puede cortar un carácter por la mitad por accidente**.

*   Si cortás el emoji `🚗` (`[240, 159, 153, 151]`) a la mitad y envías solo los primeros dos bytes, el receptor obtendrá un carácter corrompido (``) porque esos bytes sueltos no representan ninguna secuencia válida en el diccionario UTF-8.

### C. Optimización extrema con `encodeInto()`
El método estándar `.encode()` crea un **nuevo** `Uint8Array` en memoria en cada ejecución. En aplicaciones de alto rendimiento, esto satura el recolector de basura (*Garbage Collector*).

Para solucionarlo, existe `encodeInto()`, que modifica un arreglo de bytes **ya existente** en lugar de instanciar uno nuevo:

```javascript
const encoder = new TextEncoder();
const bufferExistente = new Uint8Array(10); // Espacio en memoria ya reservado

// Modifica el buffer directamente sin generar desperdicio de memoria
const resultado = encoder.encodeInto("Hola", bufferExistente);

console.log(resultado.read);    // 4 (caracteres leídos)
console.log(resultado.written); // 4 (bytes escritos en bufferExistente)
```

---

## 6. Caso real: `TextEncoder` en Route Handlers (streaming / SSE)

El lugar donde este proyecto usa `TextEncoder` es `app/api/subscribe/route.ts` (notificaciones por SSE). Vale la pena entender **por qué ahí es obligatorio** y no un detalle de estilo.

> **Bases primero:** esta sección asume que sabés qué es un *controller* y cómo es el ciclo de vida de un `ReadableStream`. Está todo en `READABLE_STREAMS.md`.

### A. Por qué el body tiene que ser un stream

Un Route Handler habla la **Fetch API estándar**: devolvés un `Response` una sola vez y nunca más lo tocás. No hay ningún objeto mutable al que escribirle después del `return`.

Eso deja una sola salida para mandar datos a lo largo del tiempo: el body no puede ser un string ya armado, tiene que ser un objeto que el runtime pueda **ir leyendo mientras vos lo vas llenando**. Ese objeto es el **`ReadableStream`**, y el `controller` que te da es tu única boca de escritura:

| Necesitás… | La API |
| :--- | :--- |
| Definir headers y status | `new Response(stream, { headers: {…} })` |
| Mandar un chunk | `controller.enqueue(bytes)` |
| Terminar la respuesta | `controller.close()` |
| Enterarte de que el cliente se fue | `req.signal` (`AbortSignal`) |

### B. Por qué no alcanza con el string

El body de un `Response` es un stream de **bytes**: cada chunk encolado tiene que ser un `Uint8Array`. Si le pasás un string a `controller.enqueue`, el runtime no adivina el encoding — falla o manda basura.

Esta es la diferencia concreta con las APIs de texto de alto nivel (`res.write("hola")` en Node, `fetch` con un body string), donde la conversión a UTF-8 ocurre implícitamente y ni te enterás. En streams web la conversión es **explícita y tuya**. `TextEncoder` es exactamente el puente de la sección 4, aplicado acá:

```ts
encoder.encode(": connected\n\n")
// → Uint8Array(13) [58, 32, 99, 111, 110, 110, 101, 99, 116, 101, 100, 10, 10]
```

> **Nota de eficiencia:** se instancia **un solo `encoder` fuera del stream**. No guarda estado entre llamadas, así que crear uno por mensaje sería desperdicio puro (ver sección 5.C).

### C. El patrón canónico de Next

Ejemplo oficial de la documentación de Next.js ([Streaming in Route Handlers](https://nextjs.org/docs/app/guides/streaming#streaming-in-route-handlers)):

```ts
// app/api/stream/route.ts
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < 10; i++) {
        controller.enqueue(encoder.encode(`Chunk ${i + 1}\n`));
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
```

**`ReadableStream` es inversión de control.** Lo que le pasás al constructor es una *underlying source*: un objeto con callbacks que el runtime invoca. `start` corre **una vez** al construir el stream y recibe el `controller`, que es el equivalente acotado de `res`: solo expone `enqueue`, `close` y `error`.

La clave mental: **`start` no es "el loop que manda datos", es el setup**. En el ejemplo de arriba el loop vive adentro porque la fuente es un timer; cuando la fuente es externa (Redis, un webhook), `start` solo *registra* quién va a llamar a `enqueue` más tarde y termina enseguida. El stream sigue vivo igual: el runtime no lo cierra hasta que alguien llame a `controller.close()` o se aborte el request.

> **Cuando el dato ya son bytes, no hace falta encoder.** `file.readableWebStream()` (de `node:fs/promises`) devuelve un `ReadableStream` de bytes directo, sin cargar el archivo entero en memoria. `TextEncoder` solo entra cuando el origen es texto.

### D. De ese ejemplo a nuestro SSE

`app/api/subscribe/route.ts` agrega tres cosas sobre el patrón base, todas por la misma razón: **la fuente de datos no es un timer propio, es una conexión a Redis compartida por todo el proceso.**

*   **`enqueue` desde un callback externo, no desde un loop.** El loop del ejemplo se reemplaza por `subscriber.subscribe(channel, onMessage)`. `start` registra el listener y termina.
*   **Guard de `closed`.** Un loop propio se corta y listo. El listener de Redis vive en una conexión compartida (el singleton de `lib/subscriber.ts`), y entre el `abort` del browser y el round-trip de `unsubscribe` todavía puede llegar un mensaje. Encolarlo en un controller ya cerrado tira `TypeError`. → El porqué completo, en `READABLE_STREAMS.md` §7–9.
*   **`unsubscribe`, nunca `close()` del cliente.** La baja de una pestaña quita *su* listener de *su* canal; cerrar el cliente Redis mataría a todos los demás usuarios conectados.

Además, dos detalles propios de SSE y de Next:

*   **`runtime = "nodejs"` + `dynamic = "force-dynamic"`.** `force-dynamic` evita que la ruta se prerenderice o cachee — un stream no se puede bufferear ni servir desde caché. `nodejs` es obligatorio porque `node-redis` abre un socket TCP crudo, que el runtime Edge no soporta.
*   **El frame de apertura es un comentario, no un mensaje.** `data: Connected\n\n` dispararía un evento `message` real que el cliente intentaría parsear como JSON. `: connected\n\n` empieza con dos puntos, que en SSE es un **comentario**: el `EventSource` lo ignora, pero igual viaja por el socket y fuerza el flush de headers y buffers intermedios.

---

## 7. Trampas de buffering (el enemigo del streaming)

Podés generar los bytes perfectamente y aun así el usuario ve todo junto al final. Cualquier capa entre el server y el cliente puede acumular chunks. Lo que documenta Next.js:

| Capa | Problema | Mitigación |
| :--- | :--- | :--- |
| **Reverse proxy** (Nginx) | Bufferea respuestas por defecto | Header `X-Accel-Buffering: no` |
| **Compresión** (Gzip/Brotli) | Acumula bytes internamente para comprimir mejor | `Cache-Control: no-transform`; `Accept-Encoding: identity` al depurar |
| **CDN** | Puede retener la respuesta entera | Depende del proveedor/plan |
| **Serverless** | AWS Lambda requiere *response streaming mode* explícito | Vercel lo soporta nativo |
| **Safari/WebKit** | Bufferea hasta recibir **1024 bytes** | Solo afecta respuestas mínimas |
| **`curl`** | Bufferea por defecto, y con `-N` igual depende de newlines para flushear | Usar un lector de stream real |

### Verificar con `TextDecoder` (la operación inversa)

Para observar los chunks tal como llegan, la propia doc de Next propone un script que usa **`TextDecoder`** — el espejo exacto de `TextEncoder`: toma los `Uint8Array` del socket y los devuelve a texto plano.

```js
// stream-observer.mjs → node stream-observer.mjs
const res = await fetch("http://localhost:3000/api/stream", {
  headers: { "Accept-Encoding": "identity" }, // sin compresión = sin buffering
});

const reader = res.body.getReader();
const decoder = new TextDecoder();
const start = Date.now();
let i = 0;

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log(`\nchunk ${i++} (+${Date.now() - start}ms)\n`);
  console.log(decoder.decode(value)); // Uint8Array → String
}
```

> **Ojo con la sección 5.B acá:** `decoder.decode(value)` sin opciones asume que cada chunk es una secuencia UTF-8 completa. Si un carácter multi-byte queda partido entre dos chunks, se corrompe. La solución estándar es `decoder.decode(value, { stream: true })`, que retiene los bytes incompletos hasta que llegue el resto.

---

## Referencias

*   [Next.js — Streaming in Route Handlers](https://nextjs.org/docs/app/guides/streaming#streaming-in-route-handlers)
*   [web.dev — Streams API](https://web.dev/articles/streams)
*   [MDN — `TextEncoder`](https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder)
*   [MDN — Chunked transfer encoding](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Transfer-Encoding)
*   Implementación en este repo: `app/api/subscribe/route.ts`, `lib/subscriber.ts`
