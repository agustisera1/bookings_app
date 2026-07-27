# TD-22 — ADRs y diagramas de arquitectura pendientes

| | |
|---|---|
| **Branch** | `docs/architecture-adrs` |
| **Bloque** | Documentación |
| **Prioridad** | 🟡 Baja |
| **Momento** | Post-deploy |
| **Depende de** | **TD-13** (la topología de deploy es uno de los diagramas) |
| **Origen** | Re-triage del backlog: las decisiones grandes no están justificadas por escrito |
| **Repos** | `bookings_app` (+ referencia a `bookings-app-worker`) |

## Problema

Las decisiones de arquitectura más grandes del proyecto **no tienen justificación escrita.** Existen
dos ADRs (`docs/architecture/`: transporte realtime y colas BullMQ), pero las decisiones que definen
la identidad del sistema no están documentadas.

Las justificaciones existen —son decisiones tomadas con criterio, no al azar— pero viven en tu
cabeza. Para un proyecto cuyo objetivo declarado es el **aprendizaje de arquitectura** y cuyo destino
es un **portfolio**, la decisión sin documentar es trabajo hecho que no se puede mostrar.

La pregunta que esto tiene que poder responder es la incómoda de una entrevista:

> *"¿Por qué MongoDB para los listings si el resto es PostgreSQL?"*

Hoy la respuesta es "está en el plan de fases". **Esa respuesta hunde**: describe qué hiciste, no por
qué. Un ADR la convierte en "porque los listings son documentos heterogéneos —`accommodation`,
`experience`, `equipment` tienen atributos distintos— y modelar eso relacional era una tabla de
atributos genérica o una por tipo; el trade-off que acepté a cambio es X". Esa segunda respuesta es
la que demuestra criterio.

## Decisiones sin ADR, verificadas

| Decisión | Por qué necesita ADR |
|---|---|
| **PostgreSQL + MongoDB (persistencia políglota)** | La decisión más cuestionable a primera vista y la más interesante bien explicada. Qué gana Mongo para listings, qué se pierde, por qué no todo en PG con `jsonb` |
| **Split app / worker en dos repos** | Por qué el trabajo async vive en un proceso aparte. TD-13 le da la respuesta operativa (serverless no sostiene procesos largos); el ADR la deja escrita |
| **JWT con access + refresh y sesiones en PG** | Por qué no sesiones en Redis, por qué refresh rotativo. Hay lógica real (`rotateSession`) sin el porqué |
| **Autorización basada en permisos** (`lib/permissions.ts`) | El modelo de roles guest/host y cómo se resuelven los permisos |
| **Topología de deploy** | El diagrama de TD-13: qué es público, qué es privado, qué habla con qué |

## Por qué entra

**Pregunta 3, en su forma más pura.** No hay nada que arreglar en el código: todo funciona. Lo que
falta es la capa que convierte "un sistema que anda" en "un sistema cuyas decisiones puedo defender",
que es literalmente el objetivo del proyecto.

Es el ticket que le da sentido retroactivo a todos los demás: cada uno tomó una decisión y la dejó
anotada en su sección "Si esto escalara"; este las consolida en el nivel de arquitectura.

## Alcance

Un ADR por decisión de la tabla, en `docs/architecture/`, siguiendo el formato de los dos que ya
existen. Cada uno responde: **contexto** (qué problema), **decisión** (qué se eligió), **alternativas
descartadas** (qué más se evaluó y por qué no), **consecuencias** (qué se acepta a cambio).

La sección de **alternativas descartadas es la que más pesa** — es la misma lógica que la sección
"Descartado y por qué" del backlog: mostrar lo que consideraste y rechazaste es más evidencia de
criterio que mostrar lo que elegiste.

**Diagramas en Mermaid**, no ASCII (regla del proyecto): un diagrama de topología de deploy, y un
diagrama de datos que muestre qué entidad vive en qué base y cómo se referencian cruzando el límite
(el `listing_id` de un booking en PG apuntando a un `_id` de Mongo es exactamente el tipo de cosa que
un diagrama explica y un párrafo no).

Este ticket **coordina** con los ADRs que otros tickets ya tocan: TD-08 actualiza el ADR de realtime,
TD-13 produce el diagrama de topología. Acá se escriben los que no tienen dueño y se verifica que el
conjunto quede coherente.

## Criterio de aceptación

- [ ] Un ADR por cada decisión de la tabla, con contexto / decisión / alternativas / consecuencias.
- [ ] El de persistencia políglota responde el "por qué Mongo" sin apoyarse en "estaba en el plan".
- [ ] Cada ADR tiene su sección de alternativas descartadas con el motivo de cada descarte.
- [ ] Diagrama de topología de deploy y diagrama de datos cruzando bases, ambos en Mermaid.
- [ ] Los ADRs que otros tickets tocan (realtime, topología) quedan enlazados y sin contradecirse.

## Si esto escalara

La documentación de arquitectura es lo primero que se paga cuando entra gente nueva a un proyecto —
un ADR es el onboarding que no tenés que dar en persona. Escala bien por naturaleza.

El techo es de mantenimiento: los ADR describen decisiones en un momento dado y envejecen. El
movimiento en un proyecto con equipo es hacerlos parte del proceso —una decisión grande no se mergea
sin su ADR— y marcar los superados como *superseded* en vez de editarlos, para conservar el registro
de por qué se pensaba distinto antes. A esta escala alcanza con mantener los pocos que importan al
día.

## Fuera de alcance

- **Documentar cada decisión chica.** Solo las estructurales. Un ADR por cada `Pick<>` es ruido.
- **Rehacer los dos ADRs que ya existen**, salvo lo que TD-08 y TD-13 les cambian.
- **Documentación de API / referencia de endpoints.** Es otro tipo de doc y otro ticket si hace falta.
