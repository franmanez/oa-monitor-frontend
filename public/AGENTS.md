# Arquitectura del proyecto

**Monitor de Revistas OA** — Sistema automatizado de auditoría de Acceso Abierto
en revistas científicas para universidades españolas.

Dos proyectos independientes (no monorepo):

```
openscope/
├── openscope-backend/     # Spring Boot 3.4 + Java 17 + Gradle (Kotlin DSL)
├── openscope-frontend/    # Vue 3 + Vite + TypeScript + Bootstrap 5.3
└── AGENTS.md
```

## Backend — openscope-backend

**Stack:** Spring Boot 3.4, Java 17, Gradle 8.12, MariaDB 11, JPA/Hibernate

**Estructura de paquetes** (`src/main/java/es/oamonitor/`):

| Paquete | Descripción |
|---------|-------------|
| `model/` | Entidades JPA (`Institution`, `Publication`, `HarvestJob`, `JournalApcPrice`) + enums + `UuidConverter` |
| `repository/` | Interfaces Spring Data JPA (`InstitutionRepository`, `PublicationRepository`, `HarvestJobRepository`, `JournalApcPriceRepository`) |
| `service/` | Lógica de negocio (`InstitutionService`, `OpenAlexHarvestService`, `OaiPmhHarvestService`, `ApcCalculationService`, `ApcImportService`, `HistoricalService`, `PublisherApcService`) |
| `controller/` | Controladores REST (`InstitutionController`, `HarvestController`, `AdminController`, `HistoricalController`) |
| `dto/` | Records de transferencia (`InstitutionDto`, `InstitutionSummaryDto`, `OaBreakdownDto`, `PublicationDto`, `HistoricalDataDto`, `HistoricalYearDto`, `PublisherApcDto`, `PublisherArticleDto`, etc.) |
| `harvest/` | Clientes HTTP: `OpenAlexClient` (OpenAlex API), `OaiPmhClient` (OAI-PMH protocol) |
| `seed/` | CommandLineRunner para seed REBIUN (`RebiunSeed`) |
| `config/` | Configuración Spring (`WebConfig`) |

**Notas técnicas:**
- UUIDs como `VARCHAR(36)` en MariaDB mediante `AttributeConverter<UUID, String>`
- `ddl-auto: update` — Hibernate genera el esquema desde las entidades
- Seed de ~75 universidades REBIUN via CommandLineRunner (`RebiunSeed`), idempotente (solo si la tabla está vacía). Solo UPC y UDG nacen como `oaiStatus=ACTIVE`; el resto `INACTIVE` y no aparecen en el listado hasta activarlas en BD
- Listado de instituciones (`GET /api/institutions`) filtra solo `oaiStatus=ACTIVE`
- `open-in-view: false`
- Sin autenticación (Fase 1)
- OpenAlex polite pool: email `openaccess@oamonitor.es` en cada request
- OpenAlex filtro: `institutions.ror:{ROR},publication_year:{YEAR},type:article`
- OpenAlex harvest: `oa_url` se guarda en `repository_url` solo si no es URL de doi.org (filtramos URLs de resolución DOI)
- OAI-PMH harvest: filtra por `dc:date` (fecha de publicación) y `dc:type` (article, info:eu-repo/semantics/article, info:eu-repo/semantics/contributiontoperiodical), merge por DOI o handle URL (si no hay DOI), fuerza `oa_status_resolved=GREEN` (todo lo depositado en repo institucional está en abierto), permite crear publicaciones sin DOI si tienen handle URL
- OAI-PMH harvest: extrae `dc:source` (nombre de revista → journalName, primer valor encontrado)
- OAI-PMH harvest: extracción de DOI, ISSN y handle URL depende de la institución (lógica en `processRecord`):
  - **UPC**: DOI, ISSN y handle URL vienen en `dc:identifier` sin calificar. Se detectan por patrón: DOI (`^10\.\d{4,}/`), ISSN (`^\d{4}-\d{3}[\dXx]$`), handle (`hdl.handle.net/`). No usa `dc:source` para journalName
  - **UDG**: usa `dc:source` para journalName
  - **Otras universidades**: lógica genérica busca DOI en URL (`doi.org/`) y handle en `hdl.handle.net/`
- OAI-PMH harvest: no usa `from`/`until` en la petición OAI-PMH (que filtran por datestamp/modificación), sino que filtra por `dc:date` en el código. Formatos de fecha aceptados: YYYY, YYYY-MM, YYYY-MM-DD
- OAI-PMH client: usa librería `se.kb:oai4j:0.6b1` (robusta, maneja rate limiting automáticamente)
- OAI-PMH client: `record.getMetadata()` devuelve directamente el elemento `<oai_dc:dc>`, no el wrapper `<metadata>`
- OAI-PMH client: acepta nombres de elementos tanto con prefijo (`dc:title`) como sin prefijo (`title`)
- OAI-PMH client: incluye header `User-Agent` para evitar bloqueos (403/503)
- OAI-PMH client: retry con backoff exponencial (3 intentos: 5s, 10s, 15s) ante errores 503
- OAI-PMH client: maneja resumptionToken como objeto completo (no string) para compatibilidad con todos los repositorios
- Logging detallado del harvest OAI-PMH: numeración de registros, dc:type, dc:date, DOI, handle, acciones (aceptado/rechazado/creado/actualizado)
- Logging de progreso cada 1000 registros procesados
- Publication: `repositoryUrl` (URL del repositorio, null si no está en repositorio), `source` (OPENALEX, REPO, OPENALEX_REPO)
- UPC: repositorio `https://upcommons.upc.edu` con OAI endpoint `https://upcommons.upc.edu/server/oai/revistes`
- UdG: repositorio `http://dugi-doc.udg.edu` con OAI endpoint `http://dugi-doc.udg.edu/dspace-oai/request`
- Institution: `autonomousCommunity` — campo de texto libre con la comunidad autónoma de cada universidad (seed REBIUN asigna el valor). Usado por `GET /stats/regional` para agregar datos por comunidad.

## Frontend — openscope-frontend

**Stack:** Vue 3.4, Vite 5, TypeScript 5.4, Vue Router 4, Pinia 2, **Bootstrap 5.3**, **Bootstrap Icons 1.11**, **Chart.js 4 + vue-chartjs 5**, **ECharts 5 + vue-echarts**

**Estructura** (`src/`):

| Carpeta | Descripción |
|---------|-------------|
| `router/` | Configuración de rutas (`index.ts`) |
| `stores/` | Stores Pinia (`institutions.ts`, `institutionDetail.ts`) |
| `views/` | Páginas (`InstitutionsView.vue`, `InstitutionDetailView.vue`, `RankingView.vue`, `HistoricalAnalysisView.vue`) |
| `components/charts/` | Componentes de gráficas (Chart.js): `OaPieChart`, `OaRoutesColumnChart` (doble columna apilada: abierto sin APC vs con APC o sin apertura garantizada, colores por ruta, toggle Valores/%), `GoldHybridChart` (composición Oro vs Híbrido de artículos con APC), `ApcEvolutionChart`, `ApcArticlesChart`, `RankingScatterChart` |
| `components/journal/` | `JournalApcPanel.vue`: treemap de gasto APC por revista (ECharts, azul único por intensidad de coste) con tabla resumen y drill-down a lista de artículos — mismo patrón que el panel de editoriales, sin treemap de artículos |
| `components/historical/` | Visuales ligeros (HTML/CSS, sin Chart.js) para la tabla "Detalle por Año": `YearCompositionBar.vue` (mini barra apilada de rutas OA al 100 % con tooltip, paleta canónica y orden `OA_ROUTE_ORDER`) y `PctBar.vue` (texto + barra de progreso fina, color pasado por el padre) |
| `components/publisher/` | `PublisherApcPanel.vue`: treemap de gasto APC por editorial (ECharts) con drill-down a artículos + gráfica Oro vs Híbrido por editorial |
| `utils/` | `oaRoutes.ts`: paleta canónica de rutas OA (colores OpenAIRE), etiquetas, descripciones, orden de rutas y tonos suaves derivados (`oaSoftColor`, fondos de celdas; prohibido hardcodear variantes claras) |
| `assets/` | Recursos estáticos |

**Notas técnicas:**
- Vite proxy: `/api` → `http://localhost:8080`
- Alias `@` mapeado a `src/`
- Dockerfile multi-stage: build Node → servir con nginx
- Paginación: `data.page.totalElements` (Spring VIA_DTO mode)

---

## Cómo arrancar

### Requisitos
- Java 17+
- Node.js 20+
- Docker y Docker Compose

### 1. Backend

**Opción A — Todo con Docker (recomendado):**

```bash
cd openscope-backend
docker compose up -d --build    # MariaDB + Redis + API en :8080
```

**Opción B — Desarrollo local:**

```bash
cd openscope-backend

# Arrancar MariaDB
docker compose up -d mariadb

# Arrancar API REST (puerto 8080)
./gradlew bootRun
```

La API estará disponible en `http://localhost:8080`. Endpoints principales:

| Método | Ruta |
|--------|------|
| GET | `/api/institutions` |
| GET | `/api/institutions/{uuid}` |
| GET | `/api/institutions/{uuid}/summary?year=` |
| GET | `/api/institutions/{uuid}/oa-breakdown` |
| GET | `/api/institutions/{uuid}/apc-estimate` |
| POST | `/api/institutions/{uuid}/apc/calculate` |
| GET | `/api/institutions/{uuid}/publications?year=&status=&search=&page=&size=` |
| GET | `/api/institutions/{uuid}/export` |
| GET | `/api/institutions/ranking?year=` |
| GET | `/api/institutions/ranking/years` |
| GET | `/api/institutions/stats/national` |
| GET | `/api/institutions/stats/scatter?year=` |
| GET | `/api/institutions/stats/regional?year=` |
| GET | `/api/institutions/{uuid}/journals/apc?year=&limit=` |
| GET | `/api/institutions/{uuid}/journals/articles?year=&journal=` |
| GET | `/api/institutions/{uuid}/publishers?year=` |
| GET | `/api/institutions/{uuid}/publishers/articles?year=&publisher=` |
| GET | `/api/institutions/{uuid}/historical` |
| GET | `/api/institutions/{uuid}/historical/years` |
| GET | `/api/institutions/{uuid}/historical/journals/apc?year=` |
| POST | `/api/harvest/trigger/{uuid}?year=` |
| POST | `/api/harvest/trigger-oai/{uuid}?year=` |
| GET | `/api/harvest/jobs` |
| POST | `/api/admin/apc/import` |

### 2. Frontend

```bash
cd openscope-frontend

# Instalar dependencias (solo primera vez)
npm install

# Arrancar dev server (puerto 5173)
npm run dev
```

El frontend estará en `http://localhost:5173` y proxy inverso a la API en `:8080`.

### 3. Producción con Docker

```bash
# Backend
cd openscope-backend
docker compose up -d --build   # API en :8080

# Frontend
cd openscope-frontend
docker compose up -d --build   # nginx sirviendo dist/ en :80
```

### Flujo de trabajo típico

```bash
# 1. Importar datos APC desde OpenAPC (recomendado al arrancar y trimestralmente)
# Descarga CSV en vivo desde GitHub (OpenAPC), borra journal_apc_price y recarga ~12K ISSNs
curl -X POST http://localhost:8080/api/admin/apc/import

# 2. Cosechar una universidad desde OpenAlex (año específico)
curl -X POST "http://localhost:8080/api/harvest/trigger/{UUID}?year=2024"

# 3. Cosechar repositorio institucional via OAI-PMH (solo si tiene oaiEndpoint)
curl -X POST "http://localhost:8080/api/harvest/trigger-oai/{UUID}?year=2024"

# 4. Calcular y persistir APC por artículo (para CSV y gráficas por revista)
# El coste APC estimado del detalle se calcula en lectura (GET /apc-estimate), sin este paso
curl -X POST http://localhost:8080/api/institutions/{UUID}/apc/calculate

# 5. Ver resultados
curl http://localhost:8080/api/institutions/{UUID}/summary
curl http://localhost:8080/api/institutions/{UUID}/apc-estimate
curl "http://localhost:8080/api/institutions/ranking?year=2024"
```

### Comandos útiles

```bash
# Backend
./gradlew compileJava      # Compilar
./gradlew test             # Tests
./gradlew build            # Build completo

# Frontend
npm run dev                # Dev server
npm run build              # Build producción
npm run typecheck          # Verificación de tipos
```

---

## Decisiones clave

- **OAI-PMH para repositorios institucionales**: complementa a OpenAlex cosechando artículos depositados en repositorios DSpace. Filtra por `dc:type` (article, info:eu-repo/semantics/article, info:eu-repo/semantics/contributiontoperiodical) y `dc:date` (fecha de publicación), merge por DOI o handle URL, fuerza GREEN en `oa_status_resolved`. Solo activo para instituciones con `oaiEndpoint` configurado.
- **OpenAlex + OAI-PMH como fuentes complementarias**: OpenAlex provee cobertura amplia y metadatos de revista; OAI-PMH provee fidelidad al repositorio institucional y detección de Green OA.
- **Bootstrap sobre Tailwind**: preferido por el usuario.
- **Filtro type:article**: enfoca el proyecto en artículos de revista (donde OA y APC importan).
- **APC estimado (GET /apc-estimate)**: cálculo en tiempo real al cargar el detalle; cruza ISSN con `journal_apc_price`, no persiste.
- **APC por artículo (POST /apc/calculate)**: persiste `apcEstimatedEur` en cada publicación GOLD/HYBRID; necesario para CSV y gráfica de revistas por APC.
- **UUID sobre ROR como path variable**: URLs ROR con `//` rompen el path parsing de Spring MVC.
- **VARCHAR(36) sobre BINARY(16)**: BINARY(16) causaba problemas de generación DDL con Hibernate update.
- **URL building manual sobre UriComponentsBuilder**: problemas de doble codificación.
- **CommandLineRunner sobre data.sql para seed**: UUID_TO_BIN() no disponible en MariaDB 11.
- **OpenAPC CSV import (sin seed hardcodeado)**: `POST /api/admin/apc/import` descarga `apc_de.csv` de GitHub, agrupa por ISSN+año (mediana de APC), vacía `journal_apc_price` y recarga. Datos históricos acumulados (no de un solo año). Actualizar trimestralmente.
- **Mediana sobre media para APC**: se calcula la mediana (percentil 50) de los precios por ISSN+año, no la media. La mediana es más robusta ante valores atípicos (precios anómalos como 44€ o 7.892€) que distorsionarían la media. El dataset `apc_de.csv` de OpenAPC contiene registros de múltiples países; España tiene solo 3 instituciones en OpenAPC (UB, CSIC, UPV), pero la media de Alemania (153 instituciones) y otros países europeos de renta alta es un proxy válido para los precios que pagarían autores españoles (todos pagan precio de "renta alta" según la clasificación del Banco Mundial). La diferencia típica entre media y mediana en el dataset es -6% a +4%, con la media tendiendo a quedarse por debajo debido a outliers bajos.
- **foundInRepository desde oa_url**: cuando OpenAlex devuelve oa_url, el artículo está disponible en un repositorio.
- **oa_status_openalex vs oa_status_resolved**: OpenAlex guarda el estado original en `oa_status_openalex`; `oa_status_resolved` es el estado real tras combinar fuentes. Si el artículo está en el repo institucional (OAI-PMH), `oa_status_resolved` se fuerza a GREEN.
- **GREEN vs DIAMOND en repositorios institucionales**: los artículos del repositorio se marcan como GREEN (no DIAMOND) porque son depósitos en repositorio de artículos (a menudo de revistas de suscripción/híbridas). DIAMOND son revistas completamente OA sin APC; no se puede distinguir solo por estar en el repositorio.
- **Estados OA con APC**: solo GOLD y HYBRID tienen APC. GREEN no tiene APC (depósito en repositorio), DIAMOND no tiene APC (OA sin coste), BRONZE y CLOSED tampoco.
- **DIAMOND excluido de APC**: por definición no tienen cargo para el autor.
- **ApcYearBreakdown incluye publicationsWithPrice**: evita bug de >100% al filtrar por año.
- **Comparación por año fijo**: el ranking requiere año obligatorio; detalle de institución muestra por defecto el año más reciente. Evita comparaciones desiguales entre instituciones con distinta cobertura temporal.
- **Sin índice de cumplimiento (eliminado)**: el proyecto es únicamente un monitor de Acceso Abierto. Se eliminó todo rastro del antiguo "Índice de Cumplimiento Normativo" (Plan S + art. 37 LCI): `ComplianceDto`, endpoint `/compliance`, `calculateGrade`, gauge/semáforos, notas A+–F y textos explicativos en frontend (detalle, histórico, regional, landing). Motivo: generaba confusión y percepciones erróneas sobre "puntuaciones" de universidades. Solo se muestran datos medidos, sin valoraciones.
- **Treemap APC por editorial (GET /publishers)**: nueva pestaña "APC por editorial" en el detalle de institución, inspirada en treemaps.openapc.net. `PublisherApcService` obtiene la editorial cruzando el ISSN de cada publicación con `journal_apc_price.publisher` (fila más cercana en año ≤ año del artículo, misma lógica de fallback que APC), agrupa por editorial y devuelve suma, nº artículos, media, desviación estándar (muestral, N/A si <2) y % del total. Endpoints: `GET /api/institutions/{uuid}/publishers?year=` (year opcional = todos) y `GET /api/institutions/{uuid}/publishers/articles?year=&publisher=` (artículos de una editorial con DOI, revista y APC). Solo cuenta publicaciones con `apcEstimatedEur` no nulo (GOLD/HYBRID con precio). Sin editorial detectada → grupo "Sin especificar".
- **ECharts + vue-echarts para el treemap**: Chart.js no tiene treemap nativo. Se usa ECharts (`echarts/core` con registro modular de TreemapChart + Tooltip + CanvasRenderer) en `PublisherApcPanel.vue` y `JournalApcPanel.vue`; el resto de gráficas sigue con Chart.js. Etiquetas arriba a la izquierda (`position: 'insideTopLeft'`) con tamaño de fuente adaptativo por celda (proporcional a √share, 9-26 px editoriales / 9-20 px artículos) y truncado automático si no cabe. Hover solo muestra tooltip (sin efecto blur/atenuar: `focus` desactivado para mantener los colores). Click en celda o fila de tabla → drill-down con segundo treemap debajo (artículos de la editorial, tonos del color base, click abre `https://doi.org/{DOI}`). Tablas resumen estilo OpenAPC (Suma / Nº artículos / Media / Desviación / %) bajo cada treemap.
- **Paleta de rutas OA = colores OpenAIRE**: fuente única en `src/utils/oaRoutes.ts` (`OA_COLORS`, `oaTextColor`, `oaLabel`, `OA_DESCRIPTIONS`, `OA_ROUTE_ORDER`), replicada como CSS vars en `tokens.css` (`--oa-*`). Valores: DIAMOND #9c27b0, GOLD #f1c40f, HYBRID #f39c12, GREEN #447032, BRONZE #a0522d, CLOSED #9e9e9e (gris "Other Journals", no rojo alarmista). `oaTextColor()` devuelve texto oscuro sobre GOLD (amarillo claro) para contraste. Todos los badges, doughnut, barras apiladas, leyendas y estados de revista consumen esta fuente; prohibido hardcodear hex de rutas en componentes. Se descartó el desglose por área temática (concepts/fields de OpenAlex): ampliaría el harvest y el modelo por un valor dudoso en un monitor centrado solo en artículos de revista.
- **Gráficas de rutas OA (OaRoutesColumnChart)**: dos columnas apiladas por categoría (`categories` + `counts: Record<ruta,number>[]`): grupo "abierto sin coste de publicación" (GREEN+DIAMOND) vs "con APC (GOLD+HYBRID) o sin apertura garantizada (BRONZE+CLOSED)", implementado con `stack` múltiple de Chart.js. Los colores y la leyenda siguen siendo por ruta individual (paleta OpenAIRE); prohibido sustituirlos por colores de grupo. BRONZE va a la derecha porque, aunque no tiene APC, no es OA garantizado (sin licencia y reversible): la etiqueta derecha lo distingue en el footer del tooltip con desglose de 4 líneas (abierto sin APC / con APC / sin apertura garantizada / total). Espaciado: `categoryPercentage: 0.5` + `barPercentage: 1` (las dos columnas de una misma categoría van pegadas, sin hueco; la separación grande es solo entre categorías). Toggle Valores/Porcentaje (en % cada segmento es sobre el total de la categoría: las dos columnas suman 100), tooltip con count+pct y footer con subtotales por grupo y total. `maxBarThickness: 52`. Se descarta añadir líneas separadoras verticales entre categorías (no convenció visualmente). Se usa SOLO en `/historical` por año. El antiguo `OaRoutesStackedBarChart` (barras 100 % fijo) se eliminó: duplicaba la información de la doble columna.
- **Gráfica Oro vs Híbrido por editorial (GoldHybridChart)**: en `PublisherApcPanel` sustituyó a la doble columna de rutas OA, que aquí no era lógica: `/publishers` solo incluye artículos con APC estimado (GOLD/HYBRID por definición), así que la columna "abierta" (Verde + Diamante) salía siempre vacía y el top 12 mostraba únicamente Oro/Híbrido. El gráfico correcto es la composición de los artículos con APC por editorial: una columna apilada por editorial (top 12 por nº de artículos) segmentada en GOLD (revista de acceso abierto) frente a HYBRID (artículo liberado en revista de suscripción), con toggle Valores/Porcentaje (100 % = composición editorial). El `PublisherApcDto` se redujo a `goldCount`/`hybridCount` (los otros counts por ruta eran siempre 0 en este contexto).
- **Pestañas del detalle de institución**: cuatro pestañas — "Resumen" (KPIs, distribución OA, evolución de costes), "APC por revista" (`JournalApcPanel`: treemap top 100 + tabla resumen + drill-down a lista de artículos; movido desde el pie de Resumen para despejarlo), "APC por editorial" (`PublisherApcPanel`) y "Listado de artículos" (al final: la tabla completa y paginada de artículos de revista con filtros de estado/ruta OA y búsqueda por título/DOI/revista; el título de la pestaña indica que es el listado completo). La cadena `v-if` es explícita por pestaña (`activeTab === 'resumen' | 'journals' | 'apc' | 'articulos'`).
- **Treemap de coste APC por revista (JournalApcPanel)**: mismo patrón que el panel de editoriales, aplicado a revistas, en su propia pestaña "APC por revista" del detalle de institución. Sustituyó a `JournalApcBarChart` y eliminó `TopJournalsChart` (top 10 por volumen: poco accionable en un monitor de gasto; el volumen aparece en tabla, treemap y tooltip). `components/journal/JournalApcPanel.vue` se autoabastece de `GET /journals/apc?limit=100` (props institutionId/year, como PublisherApcPanel; **top 100 por gasto**, no el listado completo: con 600+ revistas el treemap era lento de renderizar e ilegible; el resto queda fuera del mapa y se indica en el subtítulo): treemap en **azul único con intensidad ∝ coste** (HSL 216°, luminosidad 32–80 % por raíz de la proporción; descartado el multicolor de la paleta editorial: el color no aportaba semántica (no hay categoría que codificar), igual que se decidió en la primera versión del treemap), tabla resumen (Suma / Nº artículos / Media / %; **sin columna Desviación** a propósito — requeriría enriquecer el backend y se decidió no complicar; media y % se calculan en cliente sobre el ranking; los swatches de la tabla replican el azul de la celda), drill-down al hacer click en celda o fila: `GET /journals/articles?year=&journal=` devuelve los artículos con APC de esa revista (`JournalArticleDto`, mismo shape que `PublisherArticleDto`) y se muestra **solo como tabla** (DOI con enlace, título, APC, %, "Ver los N restantes"): el segundo treemap en tonos del color base que tenía el patrón editorial se eliminó aquí porque el APC por artículo dentro de una misma revista es idéntico (mediana del precio de la revista), con lo que todas las celdas tendrían el mismo tamaño y cero información. La tarjeta de drill-down mantiene el borde del azul de la revista seleccionada. Servicio: `InstitutionService.getJournalArticles` filtra en memoria `findWithApcByInstitution` por journalName; las revistas sin nombre se agrupan bajo "Sin nombre". Backend: eliminada la cadena del antiguo endpoint de volumen `/journals/top` (controller, `getTopJournals`, `topJournalsByInstitution`, `JournalCountDto`/`JournalCountItem`) al quedar sin consumidores.
- **ChartDataLabels solo por instancia**: `chartjs-plugin-datalabels` NO debe registrarse con `ChartJS.register()` (afecta a todas las gráficas de la app y inyecta números ilegibles en líneas/apiladas). Se pasa como prop `:plugins="[ChartDataLabels]"` únicamente en `OaPieChart` (los antiguos `TopJournalsChart` y `JournalApcBarChart` que lo usaban se eliminaron).
- **Análisis histórico (GET /historical)**: página de análisis temporal por universidad. Devuelve datos agregados por año para una institución: counts de cada ruta OA, %OA amplio, %OA fuerte (DIAMOND+GOLD+GREEN), %depósito repositorio, %por ruta individual, coste APC total, nº artículos con APC y APC medio. Incluye selección interactiva de años, KPIs resumen, gráficas de evolución (doble columna apilada de rutas OA (abierto sin APC vs con APC o sin apertura garantizada), doble eje APC), heatmap de métricas × años, tabla detalle anual enriquecida visualmente (barras de progreso + composición por ruta), y top 5 revistas por coste APC por año. Las líneas "Evolución del Acceso Abierto" (`OaEvolutionChart`) y el área "Volumen de Publicaciones" (`PublicationsVolumeChart`) se eliminan: la doble columna de rutas, el heatmap y la tabla de detalle cubren la misma información (el volumen anual ya aparece en KPIs, tooltip del doble columna, tabla y footer). Funciona para cualquier universidad aunque solo tenga un año evaluado.
- **Tabla "Detalle por Año" enriquecida visualmente**: la tabla numérica de `/historical` se potencia con tres códigos visuales sin perder legibilidad (combinación pedida por el usuario): columna nueva "Composición OA" con mini barra apilada al 100 % por ruta (`components/historical/YearCompositionBar.vue`, paleta canónica `OA_COLORS` + orden `OA_ROUTE_ORDER`, tooltip nativo con count+pct, oculta en pantallas < xl), celda "% OA" con fondo semáforo suave y barra de progreso bajo el porcentaje (`components/historical/PctBar.vue`), y "Repositorio" con barra de progreso en verde Green sobre etiqueta "count · pct". Los umbrales del semáforo (70/50) son los mismos del heatmap de la página para mantener consistencia; el color de barra %OA usa `OA_COLORS.GREEN`/`OA_COLORS.HYBRID` en vez de los verdes/amarillos genéricos. La columna CLOSED pasa de `text-danger` a `text-muted` (coherente con CLOSED = gris, no rojo alarmista). Las cinco columnas de ruta (DIAMOND/GOLD/GREEN/HYBRID/CLOSED) van generadas con un `ROUTE_COLUMNS` único (cabecera + celdas): la cabecera en el color sólido de la ruta con texto legible vía `oaTextColor` (oscuro sobre GOLD) y las celdas en el mismo tono suave con `oaSoftColor()` — helper añadido a `oaRoutes.ts` que deriva un rgba del hex canónico (alpha 0.13), manteniendo la fuente única de colores. Descartado un treemap/gráfica adicional bajo la tabla: duplicaría la doble columna de rutas que ya encabeza la página.
- **Chart.js + vue-chartjs**: librería ligera (MIT) para gráficas: doughnut (distribución OA), doble columna apilada (rutas OA abierto sin APC vs con APC o sin apertura garantizada), columnas apiladas Oro/Híbrido (composición editorial), line (evolución APC en doble eje, con relleno de área), bar (artículos con APC), scatter (ranking). El radar comparativo multidimensional se eliminó por aportar poco frente a la tabla y el heatmap; `OaEvolutionChart` (líneas de %OA) se eliminó tras llegar la doble columna de rutas.
- **Análisis regional (GET /stats/regional)**: agrega datos de todas las universidades de una misma comunidad autónoma. El endpoint `GET /api/institutions/stats/regional?year=` devuelve un `RegionalStatsDto` por comunidad con: nombre, nº universidades, total publicaciones, %OA amplio, %OA fuerte (DIAMOND+GOLD+GREEN), %depósito en repositorio y %por cada ruta OA individual. El frontend muestra barras apiladas por ruta OA ordenadas por %OA (no por volumen, para evitar comparaciones sesgadas), tabla con métricas relativas, y panel expandible con contexto metodológico (3 principios: métricas relativas no absolutas, composición del tejido científico, solo producción universitaria excluyendo OPIs).
