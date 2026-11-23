# Documentación Funcional — OpenScope

Monitor de Revistas OA — Sistema de auditoría de Acceso Abierto para universidades españolas.

---

## ¿Qué es OpenScope?

OpenScope es una herramienta que audita el estado de **Acceso Abierto (OA)** de las publicaciones científicas de las universidades españolas pertenecientes a REBIUN. Su objetivo es responder a preguntas como:

- ¿Qué porcentaje de artículos de la UPC son de acceso abierto?
- ¿Cuánto cuesta en APC (Article Processing Charges) la publicación OA de esta universidad?
- ¿Qué revistas concentran más gasto en APC?
- ¿Qué editoriales concentran más gasto en APC y en qué artículos concretos se va ese dinero?
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

**Fichero utilizado:** `apc_de.csv` — el dataset agregado internacional. Contiene ~270.000 registros de múltiples países, con datos históricos desde 2005 hasta el año en curso.

**Qué obtenemos:**
- Precio APC por ISSN y año (calculado como **mediana** de todos los registros con ese ISSN+año en el dataset).
- Nombre de revista y editorial.

**Para más detalle sobre la metodología** (por qué mediana, por qué varios precios por revista, por qué datos de toda Europa, estructura del fichero, etc.), ver la sección **"Precios APC: metodología OpenAPC"** más adelante en este documento.

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

> **Nota:** Para una explicación detallada sobre la estructura del fichero, por qué se usa la mediana, por qué hay varios precios por revista, y por qué se usan datos de toda Europa, ver la sección **"Precios APC: metodología OpenAPC"** más adelante en este documento.

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

- **Detalle de institución** (`/institution/{uuid}`): pestañas **Resumen** (resumen OA, desglose por estado, APC estimado), **APC por revista** (treemap top 100 con drill-down a lista de artículos), **APC por editorial** (treemap con drill-down a artículos) y **Listado de artículos** (tabla completa de artículos de revista con filtros de estado y búsqueda, paginada).
- **Ranking** (`/ranking`): comparativa entre universidades por año.
- **CSV** (`/api/institutions/{uuid}/export`): descarga de todas las publicaciones con todos los campos.

---

## Precios APC: metodología OpenAPC

### Ubicación del fichero

El fichero `apc_de.csv` **no se guarda localmente** en el sistema. Se descarga **en vivo desde GitHub** cada vez que se ejecuta el endpoint de importación:

```
URL: https://raw.githubusercontent.com/OpenAPC/openapc-de/master/data/apc_de.csv
```

Se invoca con:
```bash
curl -X POST http://localhost:8080/api/admin/apc/import
```

El sistema descarga el fichero (270.000+ registros), lo procesa (agrupa por ISSN+año, calcula medianas) y guarda los resultados en la tabla `journal_apc_price` de la base de datos.

### Estructura del fichero

El fichero tiene **18 columnas**. A continuación se muestran todas, marcando las 5 que utiliza OpenScope:

| # | Campo | Descripción | ¿Se usa? |
|---|-------|-------------|----------|
| 1 | `institution` | Universidad/institución que pagó el APC | ❌ No |
| 2 | **`period`** | **Año de publicación (2005-2025)** | ✅ **Sí** |
| 3 | **`euro`** | **APC pagado en euros** | ✅ **Sí** |
| 4 | `doi` | DOI del artículo | ❌ No |
| 5 | `is_hybrid` | TRUE si es revista híbrida, FALSE si OA pura | ❌ No |
| 6 | **`publisher`** | **Editorial (Elsevier, Springer, etc.)** | ✅ **Sí** |
| 7 | **`journal_full_title`** | **Nombre completo de la revista** | ✅ **Sí** |
| 8 | **`issn`** | **ISSN (puede contener múltiples separados por ;)** | ✅ **Sí** |
| 9 | `issn_print` | ISSN de la versión impresa | ❌ No |
| 10 | `issn_electronic` | ISSN de la versión electrónica | ❌ No |
| 11 | `issn_l` | ISSN vinculante (linking ISSN) | ❌ No |
| 12 | `license_ref` | URL de la licencia Creative Commons | ❌ No |
| 13 | `indexed_in_crossref` | TRUE si está en Crossref | ❌ No |
| 14 | `pmid` | PubMed ID (si aplica) | ❌ No |
| 15 | `pmcid` | PubMed Central ID (si aplica) | ❌ No |
| 16 | `ut` | Web of Science UT ID | ❌ No |
| 17 | `url` | URL del artículo | ❌ No |
| 18 | `doaj` | TRUE si está en DOAJ | ❌ No |

**¿Por qué solo se usan 5 campos?**

- **`period`**: para agrupar por año y usar el precio histórico correcto de cada ejercicio.
- **`euro`**: el precio real pagado, ya convertido a euros.
- **`journal_full_title`**: para mostrar el nombre de la revista en informes y gráficas.
- **`publisher`**: la editorial de cada revista. Se usa para agregar el gasto APC por editorial en la pestaña **"APC por editorial"** (treemap).
- **`issn`**: es la **clave principal** de cruce. OpenScope busca el ISSN de cada artículo en el dataset de OpenAPC para asignarle un precio.

No se usan los demás campos porque:
- `institution`: no importa quién pagó, sino el precio de mercado de la revista.
- `doi`, `pmid`, `ut`: identifican artículos individuales, pero OpenScope trabaja con precios agregados por revista.
- `is_hybrid`, `doaj`: información sobre el tipo de revista, pero no afecta al precio.
- `issn_print`, `issn_electronic`, `issn_l`: el campo `issn` ya contiene todos los ISSN relevantes (separados por `;`).

### ¿Por qué hay varios precios para la misma revista?

OpenAPC es un **repositorio colaborativo** donde instituciones de toda Europa reportan los APC que han pagado. Para una misma revista (mismo ISSN), hay **cientos de registros** porque:

- **Diferentes países**: universidades de Alemania, Francia, Suiza, Finlandia, Italia, etc.
- **Diferentes acuerdos institucionales**: cada universidad negocia sus propios descuentos.
- **Diferentes años**: los precios cambian anualmente.

**Ejemplo real** — *Scientific Reports* (ISSN 2045-2322) en 2023:

| Institución | País | APC pagado |
|-------------|------|------------|
| Université de Pau | Francia | 1.000 € |
| University of Ferrara | Italia | 1.403 € |
| University of Helsinki | Finlandia | 1.890 € |
| CNRS | Francia | 1.945 € |
| Swiss National Science Foundation | Suiza | 2.245 € |
| University of Bern | Suiza | 2.488 € |
| ETH Zurich | Suiza | 2.860 € |

**Total**: 575 registros solo para esa revista en 2023, con precios desde **483 € hasta 3.140 €**.

### ¿Un solo fichero para todos los años?

**Sí.** El fichero contiene datos históricos desde **2005 hasta el año en curso** (~270.000 registros). **No necesitas descargar ficheros diferentes para cada año.**

El sistema ya está diseñado para esto:
1. Agrupa los datos por **ISSN + año**.
2. Calcula la **mediana** de precios por ISSN y año.
3. Cuando evalúas 2024, usa los precios de 2024; cuando evalúas 2023, usa los de 2023.

**Ejemplo real** — *PLOS ONE* (ISSN 1932-6203):

| Año | Nº registros | Mediana APC |
|-----|-------------|-------------|
| 2020 | 1.012 | **1.468,28 €** |
| 2021 | 866 | **1.466,32 €** |
| 2022 | 762 | **1.750,24 €** |
| 2023 | 676 | **1.786,63 €** |
| 2024 | 475 | **2.001,27 €** |
| 2025 | 124 | **2.256,40 €** |

Si evalúas un artículo de **2022** en PLOS ONE → usa **1.750,24 €**. Si evalúas el mismo artículo en **2024** → usaría **2.001,27 €**. Los precios **cambian cada año** y el sistema los usa correctamente.

### ¿Por qué mediana y no media?

La **media** es muy sensible a **valores extremos** (outliers). La **mediana** es robusta: ignora los extremos y se centra en el valor central.

**Ejemplo real** — *Scientific Reports* (2023, 575 registros):

- **Mínimo**: 483,41 € (posiblemente un país de renta baja con descuento)
- **Máximo**: 3.140,49 € (posiblemente un precio especial o error de datos)
- **MEDIA**: 2.266,94 € ← inflada por los valores extremos (+22 € sobre la mediana)
- **MEDIANA**: 2.245,00 € ← valor típico real ✓

En otros casos la diferencia es aún mayor. Por ejemplo, en 2023 hay **719 registros** con APC superior a 5.000 € (revistas como *Nature* o *Cell*, con precios de hasta 9.690 €). Si se calculara la media incluyendo estos valores, se dispararía artificialmente. La mediana los **ignora** y ofrece una estimación fiable del precio "típico".

```
Distribución de APC para Scientific Reports (2023):

483 €  ← outlier bajo (descuento especial)
  |
1.000 € - 1.500 €  ← pocos casos
  |
1.800 € - 2.300 €  ← GRUESO de los datos (mediana: 2.245 €)
  |
2.700 € - 3.140 €  ← outliers altos
  |
5.000 € - 9.690 €  ← Nature, Cell, etc. (excluidos del cálculo)

MEDIA: 2.266,94 €  ← inflada por los extremos
MEDIANA: 2.245,00 €  ← valor central real ✓
```

### ¿Por qué no filtramos por país España?

OpenAPC contiene datos principalmente de **Europa occidental** (Alemania, Francia, Suiza, países nórdicos, Italia, etc.). España tiene **poca representación** en OpenAPC (solo 3 instituciones: UB, CSIC, UPV).

**¿Es un problema?** No, porque:
- Los precios de APC son **similares en toda Europa** (las editoriales cobran en euros/libras/dólares).
- Los **acuerdos institucionales** son comparables (las universidades españolas negocian en condiciones similares).
- La **mediana de 500+ registros** de toda Europa es más fiable que los 3 datos de España.
- Los precios de Alemania, Francia, Suiza y países nórdicos son un **proxy válido** para lo que pagaría una universidad española.
- Los editores cobran precio de "renta alta" (clasificación del Banco Mundial) a todos los países desarrollados; no hay diferencia significativa entre precios para España y Alemania.

### Lógica de fallback por año

El código (`ApcCalculationService.findPriceForYear`) sigue esta lógica:

1. **Búsqueda exacta**: busca precio por ISSN + año de publicación del artículo.
2. **Fallback**: si no existe precio exacto para ese año, busca el año más reciente **≤** al año del artículo (por ejemplo, si no hay precio para 2019 pero sí para 2018, usa el de 2018).
3. **Último recurso**: si no hay ningún año anterior, usa el año más antiguo disponible para ese ISSN.

Esto garantiza que **siempre se asigna un precio** aunque no haya datos exactos para ese año concreto.

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

## Gasto en APC por editorial (Treemap)

### ¿Qué muestra?

La pestaña **"APC por editorial"** del detalle de universidad representa el gasto total en APC del período seleccionado como un **mosaico de árboles (treemap)**, inspirado en la visualización de [OpenAPC](https://treemaps.openapc.net). Cada celda es una **editorial** (Elsevier, Springer Nature, MDPI...) y:

- El **tamaño** de la celda es proporcional al gasto total en APC de esa editorial.
- La **etiqueta** muestra el importe y el nombre de la editorial.
- Al **pasar el ratón** por una celda (especialmente las pequeñas), el resto se atenúa y la celda destacada muestra su información completa en un tooltip: gasto, nº de artículos, media por artículo y % del total.
- Al **hacer click** en una editorial se abre debajo un **segundo treemap con los artículos** de esa editorial: cada celda es un artículo con su DOI y APC, en tonos del color de la editorial. Click en un artículo → abre su DOI en doi.org.

### ¿De dónde sale la editorial?

De la columna `publisher` de la tabla `journal_apc_price` (dataset OpenAPC). Cada publicación se cruza por ISSN con la fila de precios más cercana en el tiempo (año ≤ año del artículo), igual que en el cálculo del APC. Los artículos sin editorial detectada se agrupan en "Sin especificar".

### Datos disponibles

`GET /api/institutions/{uuid}/publishers?year=` devuelve por editorial:

| Campo | Descripción |
|-------|-------------|
| `publisher` | Nombre de la editorial |
| `totalApc` | Suma del APC estimado de sus artículos (€) |
| `articleCount` | Nº de artículos |
| `averageApc` | Media por artículo (€) |
| `stdDev` | Desviación estándar muestral (€), N/A si hay 1 solo artículo |
| `percentage` | % del gasto total del período |

`GET /api/institutions/{uuid}/publishers/articles?year=&publisher=` devuelve los artículos de esa editorial con DOI, título, revista, ISSN, APC estimado y ruta OA.

### Tablas resumen

Bajo cada treemap se muestra una tabla estilo OpenAPC con las mismas cifras (Suma / Nº artículos / Media / Desviación / %) y una fila de Total. Solo cuentan los artículos con APC estimado (GOLD e HYBRID con precio en OpenAPC); el resto de rutas OA no genera gasto APC. La tabla muestra las 10 primeras filas con un enlace "Ver las N editoriales restantes" (estilo "view small values" de OpenAPC) que despliega el resto.

### Gráfica Oro vs Híbrido por editorial

Bajo la tabla de editoriales se muestra una **gráfica de columnas apiladas** con el top 12 de editoriales por nº de artículos con APC: cada columna descompone los artículos con APC de esa editorial entre **Oro** (publicados en revista de acceso abierto) e **Híbrido** (artículo liberado pagando APC en una revista de suscripción), con los colores canónicos de OpenAIRE y toggle Valores/Porcentaje (en porcentaje, cada editorial suma 100 % y se compara la composición relativa). Permite ver de un vistazo qué editoriales son de "publishing OA puro" (casi todo Oro) y cuáles viven del modelo híbrido. El endpoint `GET /api/institutions/{uuid}/publishers?year=` incluye para cada editorial los counts `goldCount` e `hybridCount`. Nota: no se desglosan el resto de rutas OA (Verde, Diamante, Bronce, Cerrado) porque el ranking de editoriales solo incluye artículos con APC estimado, donde por definición solo existen Oro e Híbrido.

### Colores de rutas OA

Toda la app usa la paleta canónica de OpenAIRE (centralizada en `src/utils/oaRoutes.ts`): Verde `#447032`, Oro `#f1c40f`, Híbrido `#f39c12`, Diamante `#9c27b0`, Bronce `#a0522d`, Cerrado `#9e9e9e` (gris neutro, como "Other Journals" en OpenAIRE, sin connotación negativa).

---

## Gasto en APC por revista (Treemap)

### ¿Qué muestra?

En la pestaña **APC por revista** del detalle de cada universidad, el treemap "Gasto en APC por revista" descompone el coste APC entre las **100 primeras revistas por gasto** (ranking; solo artículos con APC estimado, GOLD e HYBRID). El área de cada celda es el gasto total en esa revista y el color es un azul cuya intensidad crece con el gasto. Es el mismo patrón de interacción que el treemap por editorial. El límite de 100 mantiene el mapa legible y la página rápida incluso en universidades con miles de revistas distintas.

### Drill-down a artículos

Al hacer click en una revista (celda del treemap o fila de la tabla) se despliega debajo la **lista de sus artículos con APC**: DOI (enlace que abre `https://doi.org/{DOI}`), título, APC pagado y % del gasto de la revista, con paginación "Ver los N artículos restantes" y fila de Total. No se representa como segundo treemap (a diferencia del panel de editoriales): dentro de una misma revista todos los artículos comparten el mismo APC —es la mediana del precio de la revista—, así que todas las celdas tendrían idéntico tamaño y el mapa no añadiría información. El botón "Cerrar" vuelve a la vista de revistas.

### Tabla resumen

Bajo el treemap: Revista / Suma / Nº artículos / Media / %, con fila de Total y paginación "Ver las N revistas restantes". La media y el % se calculan en el navegador a partir del coste y el número de artículos; a diferencia del panel de editoriales no se muestra desviación estándar (los datos agregados por revista no la incluyen).

### Datos disponibles

`GET /api/institutions/{uuid}/journals/apc?year=&limit=` devuelve por revista nombre, ISSN, nº de artículos y coste APC total, ordenados por gasto de mayor a menor (el panel pide `limit=100`). `GET /api/institutions/{uuid}/journals/articles?year=&journal=` devuelve los artículos con APC de una revista (DOI, título, revista, ISSN, APC y ruta OA resuelta), con el mismo formato que los artículos por editorial. Las revistas sin nombre se agrupan como "Sin nombre".

## Análisis Regional por Comunidades Autónomas

### ¿Qué analiza?

La vista de Análisis Regional agrega los datos de todas las universidades de una misma comunidad autónoma para mostrar el panorama de la Ciencia Abierta a nivel territorial. Permite responder preguntas como:

- ¿Cómo se compara el acceso abierto de mi comunidad con las demás?
- ¿Funcionan las políticas públicas locales de I+D y repositorios?
- ¿Hay diferencias en la composición de rutas OA entre comunidades?

### Principios de lectura (para evitar comparaciones sesgadas)

1. **Métricas relativas (%), no absolutas**: comparar el volumen total de artículos de Madrid o Cataluña frente a comunidades uniprovinciales no aporta información útil. La clave está en los porcentajes.

2. **Composición del tejido científico**: las rutas de OA varían según las áreas del conocimiento (biomedicina → Gold/Hybrid; humanidades → Diamond/Green). Comunidades con orientación biomédica tendrán un perfil distinto a las de mayor peso en ciencias sociales, sin que ello implique peor gestión.

3. **Solo producción universitaria**: el análisis incluye exclusivamente universidades REBIUN. Los OPIs (CSIC, institutos de investigación sanitaria) siguen mandatos diferentes y no están incluidos.

### Datos disponibles

El endpoint `GET /api/institutions/stats/regional?year=` devuelve por cada comunidad:

| Campo | Descripción |
|-------|-------------|
| `community` | Nombre de la comunidad autónoma |
| `universityCount` | Número de universidades con datos |
| `totalPublications` | Total de publicaciones |
| `oaPercentage` | %OA amplio (todo menos CLOSED) |
| `strongOaPct` | %OA fuerte (DIAMOND+GOLD+GREEN) |
| `repositoryPct` | %depósito en repositorio |
| `diamondPct`, `goldPct`, `greenPct`, `hybridPct`, `bronzePct`, `closedPct` | %por cada ruta individual |

### Visualización en el frontend

La vista "Análisis Regional" (`/regional`) incluye:

- **Barras apiladas**: una barra por comunidad, segmentada por ruta OA. Ordenadas por %OA (no por volumen).
- **Tabla de métricas**: comunidad, nº universidades, publicaciones (contexto), %OA fuerte, %depósito, %OA amplio.
- **Panel contextual expandible**: explica los 3 principios de lectura para interpretar correctamente los datos.
- **Detalle expandible**: al hacer click en una comunidad, se muestra la distribución completa por ruta OA.

---

## Análisis Histórico por Universidad

### ¿Qué analiza?

La vista de **Análisis Histórico** (`/historical`) permite visualizar la evolución temporal de todas las métricas de una universidad a lo largo de los años evaluados. Responde preguntas como:

- ¿Cómo ha evolucionado el porcentaje de acceso abierto de mi universidad en los últimos años?
- ¿Han subido o bajado los costes APC?
- ¿Qué rutas OA han ganado o perdido peso relativo?
- ¿Cuáles son las revistas más caras en cada año?

Funciona para **cualquier universidad**, aunque solo tenga un año evaluado (en ese caso se muestran los datos de ese único año, y al evaluar más años se incorporarán automáticamente al análisis).

### Datos disponibles

El endpoint `GET /api/institutions/{uuid}/historical` devuelve, **para cada año con datos**, los siguientes campos:

| Campo | Descripción |
|-------|-------------|
| `year` | Año de publicación |
| `totalPublications` | Total de artículos de revista |
| `diamondCount`, `goldCount`, `greenCount`, `hybridCount`, `bronzeCount`, `closedCount` | Count por cada ruta OA |
| `repositoryCount` | Artículos en repositorio institucional |
| `strongOaPct` | %OA fuerte (DIAMOND+GOLD+GREEN) |
| `repositoryPct` | %depósito en repositorio |
| `broadOaPct` | %OA amplio |
| `totalApcCost` | Coste APC total estimado del año |
| `articlesWithApc` | Nº de artículos GOLD+HYBRID con precio |
| `averageApc` | APC medio por artículo (€) |

### Elementos visuales

La vista incluye las siguientes secciones:

#### 1. KPIs resumen
Tres tarjetas con métricas globales del período seleccionado:
- **Total artículos** acumulados
- **Media OA amplio** (%) promedio
- **Coste APC acumulado** (suma de todos los años)

#### 2. Publicaciones por Año y Ruta de Acceso Abierto (doble columna apilada)
Por cada año se muestran **dos columnas**: una con las rutas **abiertas sin coste de publicación** (Verde + Diamante) y otra con los artículos **pagados con APC (Oro + Híbrido) o sin apertura garantizada** (Bronce —gratuito para leer en el editor pero sin licencia OA y reversible— y Cerrado). Los colores y la leyenda siguen siendo los de cada ruta OA individual (paleta OpenAIRE), de modo que cada columna se subdivide internamente por ruta. Toggle **Valores / Porcentaje**: en valores el eje Y cuenta artículos; en porcentaje cada segmento se expresa sobre el total del año (las dos columnas de un año suman 100 %). El tooltip muestra el nº de artículos y el % de cada segmento, y un footer con el desglose (abierto sin APC / con APC / sin apertura garantizada / total del año).

#### 3. Evolución de Costes APC (líneas doble eje)
Gráfica con dos ejes Y:
- **Eje izquierdo**: coste APC total estimado (suma anual)
- **Eje derecho**: APC medio por artículo

#### 4. Artículos con APC (barras)
Número de artículos GOLD+HYBRID con precio estimado por año.

#### 5. Mapa de Calor (heatmap)
Matriz años × métricas con celdas coloreadas (verde ≥70%, verde claro ≥50%, amarillo ≥30%, naranja ≥15%, rojo <15%). Permite detectar de un vistazo qué años y métricas tienen mejor o peor cobertura.

#### 6. Tabla de detalle anual
Tabla con todos los campos por año: artículos, %OA, counts por ruta, repositorio y coste APC. Incluye códigos visuales para leerse de un vistazo:
- **Composición OA**: mini barra apilada por año con la proporción de cada ruta OA (colores oficiales de ruta; el tooltip muestra el número y porcentaje de cada segmento). Se oculta en pantallas pequeñas.
- **% OA**: la celda se colorea según el nivel (verde suave ≥70 %, ámbar suave 50–69 %, rojo suave <50 %) y muestra una barra de progreso bajo el porcentaje.
- **Repositorio**: barra de progreso en verde con el número de artículos depositados y su porcentaje.
- **Columnas por ruta** (DIAMOND, GOLD, GREEN, HYBRID, CLOSED): la cabecera va pintada en el color oficial de la ruta (texto oscuro sobre la cabecera dorada de GOLD para mantener el contraste) y las celdas de la columna usan el mismo color en tono suave, de forma que cada ruta se identifica de un vistazo vertical.

#### 7. Top 5 revistas por coste APC en cada año
Panel con las 5 revistas más caras por APC de cada año seleccionado, mostrando nombre, nº de artículos y coste total.

### Interactividad

- **Selector de universidad**: desplegable con todas las universidades activas.
- **Selector de años**: botones toggle para activar/desactivar cada año. Todas las gráficas, KPIs, tabla y heatmap se actualizan dinámicamente.
- **Botones "Todos" / "Ninguno"**: selección rápida de años.

---

## Actualización de datos

Los datos deben actualizarse periódicamente:

| Fuente | Frecuencia recomendada | Comando |
|--------|----------------------|---------|
| Precios APC (OpenAPC) | Trimestral | `POST /api/admin/apc/import` |
| Cosecha OpenAlex | Anual (por cada año) | `POST /api/harvest/trigger/{uuid}?year={año}` |
| Cosecha OAI-PMH | Anual (por cada año) | `POST /api/harvest/trigger-oai/{uuid}?year={año}` |
| Cálculo APC por artículo | Tras cada cosecha | `POST /api/institutions/{uuid}/apc/calculate` |
