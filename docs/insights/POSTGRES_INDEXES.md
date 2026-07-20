# POSTGRES_INDEXES.md

Guía de referencia sobre índices en PostgreSQL: qué son, los tipos disponibles (*access methods*), las propiedades que se les aplican encima, y cómo se combinan en el esquema de este proyecto.

---

## 1. Qué es un índice

Una estructura de datos auxiliar que Postgres mantiene **en paralelo** a la tabla, para no tener que leerla entera (*seq scan*) cuando filtrás. El trade-off es siempre el mismo: lecturas más rápidas a cambio de escrituras más lentas (cada `INSERT`/`UPDATE` actualiza también el índice) y más disco.

Dos ejes que conviene no mezclar: **el tipo de índice** (el algoritmo, o *access method*) y **las propiedades** que le podés poner encima.

---

## 2. Eje 1 — Tipos (access methods)

| Tipo | Cómo funciona | Operadores que acelera | Cuándo |
|---|---|---|---|
| **B-tree** | Árbol balanceado ordenado. El default | `=`, `<`, `>`, `BETWEEN`, `IN`, `ORDER BY`, `LIKE 'foo%'` | Casi siempre. Cualquier dato con orden total |
| **Hash** | Tabla hash del valor | Solo `=` | Casi nunca — B-tree hace lo mismo y más |
| **GiST** | Árbol genérico donde cada nodo guarda un *resumen* del subárbol ("acá abajo hay algo entre X e Y") | `&&` (solapa), `@>` (contiene), `<->` (distancia) | Rangos, geometría, full-text |
| **SP-GiST** | Como GiST pero con particiones **no** balanceadas (quadtree, radix) | Igual que GiST | Datos con distribución muy despareja: IPs, puntos agrupados |
| **GIN** | Índice invertido: valor → lista de filas que lo contienen | `@>`, `?` sobre `jsonb`, arrays, `tsvector` | Un campo con **muchos valores adentro**: tags, JSON, full-text |
| **BRIN** | Guarda min/max por bloque de páginas. Diminuto | `<`, `>`, `BETWEEN` | Tablas enormes donde el orden físico ≈ orden lógico (logs por `created_at`) |

---

## 3. Índices compuestos: la regla del prefijo es de B-tree

Cada access method se comporta distinto ante una query que no menciona la primera columna ([docs](https://www.postgresql.org/docs/current/indexes-multicolumn.html)):

| Tipo | ¿Sirve si la query no filtra por la 1ª columna? |
|---|---|
| **B-tree** | Sí, pero mal. "El índice es más eficiente cuando hay restricciones sobre las columnas líderes (más a la izquierda)" |
| **GiST** | **Sí** — "puede usarse con condiciones que involucren cualquier subconjunto de sus columnas". La primera columna solo determina **cuánto** del índice hay que escanear |
| **GIN** | Sí, y sin penalidad — "la efectividad es la misma sin importar qué columnas use la query" |
| **BRIN** | Igual que GIN: sin penalidad por posición |

Traducido: en **B-tree y GiST** el orden de columnas afecta el **costo**; en ninguno de los dos lo vuelve *inutilizable*. Lo que decide si el planner lo usa es la comparación de costo contra el seq scan — y eso depende de estadísticas y volumen de datos, no solo del DDL.

> El caso patológico de GiST es el inverso al que uno intuye: la doc advierte que "un índice GiST será relativamente inefectivo si su primera columna tiene pocos valores distintos".

---

## 4. Eje 2 — Propiedades (ortogonales al tipo)

- **Unique** — además de indexar, prohíbe duplicados. "Agregar una constraint unique crea automáticamente un índice B-tree único." El `CONSTRAINT unique_email UNIQUE (email)` de `users` es eso.
- **Foreign key** — al revés que unique: **no** crea índice. "La declaración de una foreign key no crea automáticamente un índice sobre las columnas referenciantes." Hay que crearlo a mano, y conviene, porque cada `DELETE` en la tabla referenciada escanea la referenciante.
- **Compuesto** — `(a, b, c)`. Ver §3: el efecto de no filtrar por el prefijo depende del tipo de índice.
- **Parcial** — `WHERE ...`. Indexa un subconjunto. El constraint `no_overlap` es parcial: ignora `cancelled` y `rejected`, así que es más chico y no estorba con reservas muertas.
  Tiene una condición de uso que se olvida seguido: el índice solo es aplicable si el `WHERE` de la query **implica** el del índice, y Postgres no razona — "la condición del predicado tiene que coincidir exactamente con parte del `WHERE` de la query". Dos consecuencias prácticas: una query **sin** el predicado no puede usar el índice parcial aunque filtre por sus columnas; y el predicado tiene que estar escrito con **constantes**, porque "las cláusulas parametrizadas no funcionan con un índice parcial" (`$1` nunca implica nada para todos sus valores posibles).
- **De expresión** — `CREATE INDEX ON users (lower(email))`. Necesario si en el `WHERE` aplicás una función; si no, el índice plano no se usa.
- **Covering** (`INCLUDE`) — arrastra columnas extra en la hoja para que la query se resuelva sin tocar la tabla (*index-only scan*).

---

## 5. En nuestro esquema

`db/migrations/003_booking_no_overlap.sql` es el ejemplo interesante — tres cosas a la vez:

```sql
EXCLUDE USING gist (listing_id WITH =, tstzrange(start_date, end_date, '[]') WITH &&)
WHERE (status NOT IN ('cancelled', 'rejected'));
```

Es **GiST** (porque `&&` sobre rangos no lo puede hacer un B-tree), **parcial**, y de **expresión** (`tstzrange(...)` se calcula, no es una columna). El `btree_gist` que habilita la migración existe justo para poder meter `listing_id WITH =` — igualdad sobre un `varchar` — dentro de un índice GiST.

Y `EXCLUDE` es el nivel de arriba: usa ese índice para hacer cumplir la regla RNF-01 (sin solapamiento) **a nivel DB**, incluso bajo concurrencia. Un índice normal acelera; uno de exclusión además prohíbe.

### Por qué la query de disponibilidad igual no lo aprovecha

`findBookedListingIds` (`lib/repositories/bookings.pg.ts`) busca solapamiento **sin** filtrar por listing:

```sql
WHERE status NOT IN ('cancelled', 'rejected')
  AND tstzrange(start_date, end_date, '[]') && tstzrange($1, $2, '[]')
```

Aplicando §3 y §4 al índice de `no_overlap`:

- **Predicado parcial:** el `WHERE` de la query repite literal el del índice, con constantes → implica → ✅ aplicable.
- **Columna líder:** la query no menciona `listing_id`, pero el índice es GiST → ✅ igual se puede usar.

O sea que el índice **sí es candidato**. Lo que falla es el costo: con `listing_id` como dimensión líder, los bounding boxes de los nodos internos agrupan primero por listing, y la dimensión de rango queda con intervalos anchos y solapados en cada nodo. Poda mal, el scan termina tocando buena parte del índice, y el planner elige el seq scan por ser más barato.

De ahí la conclusión que vale para cualquier índice: **ser aplicable no es ser elegido, y la diferencia solo se ve midiendo**.

> Relacionado: `docs/tickets/TD-03-bookings-daterange-gist.md` propone un `CREATE INDEX bookings_daterange_gist` explícito, además del que ya crea el constraint.
