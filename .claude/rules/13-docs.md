# Docs / gobierno (dimensión 13)

## Documentación — `/docs`

| Carpeta | Qué vive ahí |
|---------|-------------|
| `docs/architecture/` | Decisiones de arquitectura (ADRs): transporte realtime, colas BullMQ, rate limiting |
| `docs/tech-debt/` | **Deuda técnica conocida.** Un `<feature>-next-steps.md` por feature, y `performance.md` cuando hay deuda de performance |
| `docs/guides/` | Setup de servicios externos |
| `docs/audit/` | Auditoría del sistema: dimensiones (`dimensions.md`) y alcance por flujo (`scope.md`); cada una se trabaja en su branch `refactor/*` |

**Nombres:** todo archivo y carpeta de `docs/` va en kebab-case y minúsculas (`bullmq-queues.md`,
`tech-debt/`). Las únicas excepciones son `README.md` y `CLAUDE.md`, por convención de las herramientas.

`docs/tech-debt/` es un backlog de trabajo, no un archivo histórico: un ítem resuelto o descartado se saca.
Solo registra deuda dentro del alcance de `docs/audit/scope.md`: lo que queda afuera se retoma cuando
se pule esa feature, no se documenta antes.

### Regla de sincronía de documentación — parte de "terminar" un cambio

**Ningún ajuste a una feature está terminado hasta correr este check** —igual que pasar `tsc`/`lint`—:
preguntarse **qué documento afirma algo sobre lo que toqué** y actualizarlo si el cambio lo volvió
inexacto. El default es que un cambio de feature toca al menos uno.

| Si el cambio… | Revisar y actualizar |
|---|---|
| altera una **decisión o un comportamiento** documentado | el ADR de `docs/architecture/` que lo describe |
| resuelve, agrava o vuelve obsoleta una **deuda** | su doc en `docs/tech-debt/` |
| mueve/renombra archivos, cambia un patrón canónico o una capa | la regla de `.claude/rules/` que lo describe (y el índice de `CLAUDE.md` si cambia el mapa) |

**Una doc que dice que se hizo X cuando se hizo Y es peor que no tener doc:** quien la lee —humano o
agente— actúa sobre el mapa equivocado. Si tras el check ninguno aplica, que sea una decisión
consciente, no un olvido. No hay linter de prosa: este check lo corre quien hace el cambio, no CI.

### Regla de deuda técnica

**La deuda técnica se documenta en `docs/tech-debt/`, no en comentarios del código.** Cuando
se identifica un costo conocido, una simplificación deliberada o algo que hay que revisitar:

- Va a `performance.md` si es un costo de queries/rendering, con el formato **Dónde / Qué pasa /
  Por qué duele / Cómo medirlo / Idea de fix**, ordenado por impacto.
- Va a `<feature>-next-steps.md` si es estructural de una feature (contratos, límites entre
  servicios, gaps funcionales).
- En el código queda **como mucho un puntero de una línea** al doc correspondiente.

El motivo es que la deuda se revisa en bloque cuando se prioriza, no leyendo docstrings uno
por uno. Un bloque de deuda enterrado en un comentario es deuda que nadie va a encontrar.
