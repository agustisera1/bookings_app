# TD-20 — Rate limiting con Redis en el borde público

| | |
|---|---|
| **Branch** | `feat/rate-limiting` |
| **Bloque** | Seguridad |
| **Prioridad** | 🔴 Alta |
| **Momento** | Pre-deploy |
| **Depende de** | — |
| **Origen** | Re-triage del backlog contra el objetivo de deploy público |
| **Repos** | `bookings_app` |

## Problema

**Nada limita cuántas veces se puede llamar a las operaciones de autenticación.** Verificado: no
existe `middleware.ts`, y ni `authUser` ni `createUser` (`lib/services/auth.ts`) tienen cota alguna.

El propio código ya reconoce que estas funciones son un endpoint público —el comentario de
`createUser` dice *"A Server Action is callable directly, not just from this form"*— y por eso
re-valida en el service. **Le falta la otra mitad: cuántas veces.**

Los dos vectores reales, en orden de gravedad:

### 1. Fuerza bruta en `authUser` → toma de cuentas

Un atacante prueba contraseñas contra un email conocido sin ningún costo. No te tira el servidor: te
**entra a una cuenta**. Es el riesgo serio de un deploy público, y el único de esta lista cuyo daño
no se revierte.

### 2. Spam de signup → quema de la cuota de Resend

`createUser` hace dos cosas caras antes de que nadie lo frene:

```ts
const password_hash = await hash(password, SALT_ROUNDS);  // bcrypt: lento a propósito
const user = await usersRepo.createUser(...);
await greetUser(user);                                     // → cola → Resend
```

- **`greetUser` encola un mail por cada registro.** Un bot con 10.000 signups quema la cuota de
  Resend y —peor— **te marca el dominio como spam**. Ese daño tampoco se revierte fácil: la
  reputación de un dominio se recupera lento o no se recupera.
- **`bcrypt` es lento por diseño.** Es la defensa correcta contra el crackeo de hashes, pero
  convierte cada signup en trabajo de CPU medible. Sin cota, es un amplificador: poco tráfico de red
  compra mucho cómputo.

## Por qué entra

**Preguntas 1 y 2.**

- **Deploy:** es lo único de esta lista donde el daño lo sufre alguien más (una cuenta comprometida)
  o es irreversible (la reputación del dominio). Una URL pública sin cota en auth no es un deploy
  honesto.
- **Adorno:** hoy Redis hace de backend de BullMQ y de adapter de socket.io, y nada más. **El rate
  limiting es el caso de uso canónico de Redis** —`INCR` + `EXPIRE`, o una ventana deslizante con
  sorted sets— y es la operación que explica por qué existe: un contador atómico, compartido entre
  procesos, que expira solo. Le saca una tercera función real a una pieza que ya está levantada.

## Alcance

### El detalle que hace interesante al ticket

Las Server Actions **no tienen URL propia**. Todas hacen `POST` a la ruta de la página que las
importa, y Next distingue cuál se invoca por un header interno. Consecuencia práctica:

> Un middleware puede limitar *por ruta*, pero no puede distinguir limpiamente *qué acción* se está
> llamando. El límite tiene que vivir **adentro de la operación**, no delante de ella.

Eso descarta el patrón habitual de "middleware que envuelve el endpoint" y obliga a pensar dónde
ponerlo. Es exactamente el tipo de restricción que impone el framework y que conviene entender antes
de pelearla.

### Piezas

**1. Un limitador en `lib/`**, sobre el Redis que ya existe. Función pura de infraestructura:
recibe una clave y una política, devuelve permitido/denegado más cuánto falta para el reset. Sin
conocer nada de auth.

**2. Aplicarlo en las tres operaciones sensibles:**

| Operación | Clave | Por qué esa clave |
|---|---|---|
| `authUser` | IP **y** email, por separado | Por IP frena el barrido de muchos emails; por email frena el ataque distribuido contra una cuenta. Hacen falta las dos |
| `createUser` | IP | El email todavía no existe |
| `POST /api/auth/refresh` | IP | Es la única de las tres que sí es una ruta con URL propia |

**3. Política diferenciada.** El signup tolera menos que el login: una persona real se registra una
vez y se equivoca de contraseña varias.

**4. Respuesta al cliente.** Devolver un `ServiceResult` con mensaje friendly, siguiendo el patrón de
servicios. **Sin filtrar si el email existe**: el mensaje de "demasiados intentos" tiene que ser el
mismo para una cuenta real y para una inventada, o el rate limiting se convierte en un oráculo de
enumeración de usuarios.

## Criterio de aceptación

- [ ] N intentos fallidos de login desde la misma IP devuelven un error de cota, y el N+1 **no llega
      a comparar el hash**.
- [ ] El límite por email frena el ataque aunque cada intento venga de una IP distinta.
- [ ] M signups desde la misma IP cortan, y **no se encola ningún mail** a partir de ahí.
- [ ] El mensaje de cota es idéntico para un email registrado y uno inexistente.
- [ ] El contador expira solo: pasada la ventana, el mismo cliente vuelve a poder operar.
- [ ] Reiniciar la app **no** resetea los contadores — viven en Redis, no en memoria del proceso.
- [ ] Un login legítimo después de un error de contraseña sigue funcionando sin fricción.

## Si esto escalara

Aguanta bien: el contador vive en Redis, así que es correcto con cualquier número de instancias de la
app. Ese es justamente el motivo de no hacerlo en memoria — con dos instancias, un limitador local
deja pasar el doble sin avisar.

Dos techos, en este orden:

1. **Redis se vuelve el punto único.** Si se cae, hay que decidir si el sistema falla abierto (deja
   pasar todo) o cerrado (rechaza todo). Ninguna de las dos es obviamente correcta y **conviene
   decidirlo explícitamente en este ticket**, no descubrirlo el día del incidente.
2. **El ataque distribuido de verdad** —miles de IPs, pocos intentos cada una— no lo frena un
   contador por IP. Ahí el movimiento es correr la cota al borde (CDN/WAF con reputación de IP), y
   sumar defensas de otra naturaleza: CAPTCHA en signup, 2FA, bloqueo temporal de cuenta con aviso al
   dueño.

A esta escala, un contador en Redis cubre el 100% del riesgo realista.

## Fuera de alcance

- **WAF, protección de DDoS, CAPTCHA.** Ver `Descartado y por qué` en el README del backlog.
- **2FA y política de contraseñas.** Son features de producto, no cotas de abuso.
- **Cotas sobre GraphQL** → **TD-21**, que tiene otro vector y otra defensa.
- **Bloqueo persistente de cuentas.** Un contador con expiración alcanza; bloquear de verdad abre la
  puerta a que un atacante bloquee cuentas ajenas a propósito.
