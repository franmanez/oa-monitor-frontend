# Documentación Funcional — OpenScope

Monitor de Revistas OA — Sistema de auditoría de Acceso Abierto para universidades españolas.

---

## ¿Qué es OpenScope?

OpenScope es una herramienta que audita el estado de **Acceso Abierto (OA)** de las publicaciones científicas de las universidades españolas pertenecientes a REBIUN. Su objetivo es responder a preguntas como:

- ¿Qué porcentaje de artículos de la UPC son de acceso abierto?
- ¿Cuánto cuesta en APC (Article Processing Charges) la publicación OA de esta universidad?
- ¿Qué revistas concentran más gasto en APC?
- ¿Cómo se compara esta universidad con el resto del sistema universitario español?

---

## Fuentes de datos

OpenScope combina tres fuentes de información abiertas:

### 1. OpenAlex

**Qué es:** API académica abierta con más de 250 millones de publicaciones indexadas.

**Qué obtenemos:**
- Todas las publicaciones de cada universidad filtradas por año y tipo (solo artículos).
- DOI, título, revista (ISSN y nombre), año de publicación.
- Estado de Acceso Abierto según la clasificación estándar: DIAMOND, GOLD, GREEN, HYBRID, BRONZE, CLOSED.
- URL del texto completo en abierto (oa_url) si existe.

**Por qué la usamos primero:** OpenAlex proporciona la cobertura más amplia de publicaciones. Para una universidad grande como la UPC, puede retornar ~3.000 artículos por año. Es el punto de partida para construir el catálogo base de cada institución.

**Filtro aplicado:** Solo se cosechan artículos (`type:article`). Se excluyen libros, capítulos, preprints, datasets, etc. El foco del proyecto es artículos de revista porque es donde OA y APC son más relevantes.

### 2. Repositorios institucionales (OAI-PMH)

**Qué es:** Protocolo estándar OAI-PMH (Open Archives Initiative Protocol for Metadata Harvesting) que permite extraer metadatos de repositorios institucionales como DSpace.

**Qué obtenemos:**
- Metadatos de artículos depositados en el repositorio de la propia universidad.
- DOI, handle URL, ISSN, título, fecha de publicación, nombre de revista.

**Por qué la usamos en segundo lugar:** El repositorio institucional complementa a OpenAlex:
- **Detecta Green OA** que OpenAlex puede no haber detectado (artículos depositados en el repo sin oa_url público).
- **Permite merge por DOI**: si OpenAlex ya tiene el artículo, marcamos que tiene versión en repositorio (source → OPENALEX_REPO).
- **Fuerza estado GREEN**: todo lo depositado en un repositorio institucional está, por definición, en acceso abierto.

**Filtros aplicados en OAI-PMH:**
- `dc:type`: solo artículos (`article`, `info:eu-repo/semantics/article`, `info:eu-repo/semantics/contributiontoperiodical`).
- `dc:date`: solo publicaciones del año objetivo.
- Merge por DOI o handle URL para evitar duplicados.

### 3. OpenAPC (precios APC)

**Qué es:** Dataset público mantenido por la comunidad OpenAPC (github.com/OpenAPC/openapc-de) con precios reales de APC pagados por instituciones europeas.

**Fichero utilizado:** `apc_de.csv` — el dataset agregado internacional. Contiene ~269.000 registros de múltiples países.

**Qué obtenemos:**
- Precio APC medio por ISSN y año (calculado como mediana de todos los registros con ese ISSN+año en el dataset).
- Nombre de revista y editorial.

**Por qué usamos la mediana y no la media:**
- La media es sensible a outliers extremos (registros de 44€ por errores de datos, o 7.892€ por precios premium anómalos).
- La mediana (percentil 50) ignora ambos extremos y es más robusta.
- Diferencia típica entre media y mediana en OpenAPC: -6% a +4%.

**Por qué no filtramos por país España:**
- España solo tiene 3 instituciones en OpenAPC (UB, CSIC, UPV) → perderíamos la mayoría de precios.
- Los precios de Alemania (153 instituciones, renta alta, zona euro) son un proxy válido para lo que paga un autor español.
- Los editores cobran precio de "renta alta" (clasificación Banco Mundial) a todos los países desarrollados; no hay diferencia significativa entre precios para España y Alemania.

---

## Flujo de trabajo paso a paso

### Paso 1: Cosecha OpenAlex

```
POST /api/harvest/trigger/{uuid}?year=2025
```

1. Se consulta la API de OpenAlex con el filtro: `institutions.ror:{ROR},publication_year:{AÑO},type:article`
2. Se paginan los resultados usando cursor-based pagination (200 artículos por página, requiere API key gratuita).
3. Para cada artículo se extrae: DOI, título, ISSN, nombre de revista, estado OA, oa_url.
4. Se guardan en la tabla `publication` con `source = OPENALEX`.
5. Los artículos sin DOI se descartan (no se pueden identificar de forma fiable).
6. Se registra un `harvest_job` con estado COMPLETED y el número de artículos guardados.

### Paso 2: Cosecha del repositorio (OAI-PMH)

```
POST /api/harvest/trigger-oai/{uuid}?year=2025
```

1. Se conecta al endpoint OAI-PMH de la universidad (solo si está configurado).
2. Se navegan todas las páginas usando resumptionToken hasta agotar el repositorio.
3. Para cada registro se extrae: DOI, handle URL, ISSN, título, fecha, tipo, nombre de revista.
4. Se filtran solo artículos del año objetivo (por `dc:date`, no por datestamp OAI).
5. Se busca si ya existe en `publication` (por DOI o handle URL):
   - **Si existe** → se actualiza: se añade `repositoryUrl`, se fuerza `oa_status_resolved = GREEN`, se cambia `source = OPENALEX_REPO`.
   - **Si no existe** → se crea nueva publicación con `source = REPO`, `oa_status_resolved = GREEN`.
6. Se registra un `harvest_job` con el número de artículos procesados.

### Paso 3: Importación de precios APC

```
POST /api/admin/apc/import
```

1. Se descarga `apc_de.csv` desde GitHub (datos en vivo).
2. Se agrupan los registros por ISSN + año.
3. Para cada grupo se calcula la **mediana** de los precios en euros.
4. Se vacía la tabla `journal_apc_price` y se recarga con los nuevos datos (~12.000 precios).
5. Recomendación: ejecutar al arrancar la aplicación y trimestralmente.

### Paso 4: Cálculo de APC por artículo

```
POST /api/institutions/{uuid}/apc/calculate
```

1. Se buscan todas las publicaciones GOLD y HYBRID de la institución (solo estos estados tienen APC).
2. Para cada una, se busca el precio APC por ISSN + año en `journal_apc_price`.
3. Si no hay precio exacto para ese año, se usa el año más reciente disponible.
4. Se persiste `apc_estimated_eur` en cada publicación.
5. Este paso es necesario para que el CSV de exportación y las gráficas por revista muestren costes.

### Paso 5: Consulta de resultados

Una vez completados los pasos anteriores, los datos están disponibles en:

- **Detalle de institución** (`/institution/{uuid}`): resumen OA, desglose por estado, APC estimado.
- **Ranking** (`/ranking`): comparativa entre universidades por año.
- **CSV** (`/api/institutions/{uuid}/export`): descarga de todas las publicaciones con todos los campos.

---

## Estados de Acceso Abierto

Cada artículo tiene dos campos de estado OA:

- `oa_status_openalex`: el estado original reportado por OpenAlex.
- `oa_status_resolved`: el estado final tras combinar OpenAlex + OAI-PMH.

| Estado | Significado | Tiene APC |
|--------|-------------|-----------|
| **DIAMOND** | Revista 100% abierta sin coste para nadie | No |
| **GOLD** | Artículo en revista OA, se paga APC | Sí |
| **HYBRID** | Artículo OA en revista de suscripción, se paga APC | Sí |
| **GREEN** | Versión depositada en repositorio (autoarchivado) | No |
| **BRONZE** | Artículo gratuito en web del editor sin licencia OA | No |
| **CLOSED** | Bajo muro de pago | No |

**Regla de resolución:** si el artículo está en el repositorio institucional (detectado por OAI-PMH), `oa_status_resolved` se fuerza a GREEN, independientemente del estado original de OpenAlex.

**GOLD vs HYBRID:** ambos tienen APC, pero GOLD es en revista 100% OA y HYBRID es en revista de suscripción donde se ha pagado para liberar un artículo concreto.

---

## Merge de fuentes: ¿por qué 3.000 + 300 ≠ 3.300?

Cuando OpenAlex devuelve 2.817 artículos y OAI-PMH devuelve 342, la suma no es 3.159 artículos únicos porque:

1. **Solapamiento por DOI**: algunos artículos están en ambas fuentes. El merge por DOI detecta estas coincidencias y actualiza la publicación existente en lugar de crear duplicados.
2. **El source se actualiza**: si un artículo era OPENALEX y se encuentra en el repositorio, pasa a `OPENALEX_REPO`.
3. **El estado se resuelve**: si un artículo estaba GOLD según OpenAlex pero está depositado en el repositorio, `oa_status_resolved` pasa a GREEN.

Ejemplo real (UPC, 2025):
- OpenAlex: 2.817 artículos guardados
- OAI-PMH: 342 artículos procesados (329 nuevos + 13 que ya estaban en OpenAlex)
- Total en BD: 3.146 publicaciones únicas

---

## ¿Por qué solo artículos?

El proyecto filtra por `type:article` en OpenAlex y por `dc:type` en OAI-PMH para centrarse exclusivamente en artículos de revista. Motivos:

1. **OA importa más en artículos**: los artículos son la unidad principal de evaluación científica y la principal vía de publicación OA.
2. **APC es relevante solo para artículos**: los libros y capítulos tienen modelos de negocio diferentes.
3. **Homogeneidad**: comparar universidades por artículos es más justo que mezclar tipos heterogéneos.

---

## ¿Por qué REBIUN?

REBIUN (Red de Bibliotecas de las Universidades Españolas) agrupa a 76 universidades. OpenScope:

- Importa el seed de las 76 universidades desde REBIUN al arrancar (tabla `institution`).
- Solo las universidades marcadas como `ACTIVE` aparecen en el listado público.
- Cada universidad tiene su identificador ROR para consultar OpenAlex.
- Algunas tienen endpoint OAI-PMH configurado para cosechar su repositorio (UPC, UdG).

---

## Glosario

| Término | Significado |
|---------|-------------|
| **APC** | Article Processing Charge — coste que paga el autor (o su institución) para publicar en OA |
| **DOI** | Digital Object Identifier — identificador único y persistente de un artículo |
| **ISSN** | International Standard Serial Number — identificador de una revista |
| **OAI-PMH** | Protocolo estándar para extraer metadatos de repositorios |
| **OpenAPC** | Dataset público de precios APC reales pagados por instituciones europeas |
| **REBIUN** | Red de Bibliotecas de las Universidades Españolas |
| **ROR** | Research Organization Registry — identificador único de instituciones investigadoras |
| **handle URL** | Identificador persistente de repositorios DSpace (ej: `hdl.handle.net/...`) |

---

## Actualización de datos

Los datos deben actualizarse periódicamente:

| Fuente | Frecuencia recomendada | Comando |
|--------|----------------------|---------|
| Precios APC (OpenAPC) | Trimestral | `POST /api/admin/apc/import` |
| Cosecha OpenAlex | Anual (por cada año) | `POST /api/harvest/trigger/{uuid}?year={año}` |
| Cosecha OAI-PMH | Anual (por cada año) | `POST /api/harvest/trigger-oai/{uuid}?year={año}` |
| Cálculo APC por artículo | Tras cada cosecha | `POST /api/institutions/{uuid}/apc/calculate` |
