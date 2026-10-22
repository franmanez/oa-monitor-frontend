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
| `service/` | Lógica de negocio (`InstitutionService`, `OpenAlexHarvestService`, `OaiPmhHarvestService`, `ApcCalculationService`, `ApcImportService`) |
| `controller/` | Controladores REST (`InstitutionController`, `HarvestController`, `AdminController`) |
| `dto/` | Records de transferencia (`InstitutionDto`, `InstitutionSummaryDto`, `OaBreakdownDto`, `PublicationDto`, etc.) |
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

## Frontend — openscope-frontend

**Stack:** Vue 3.4, Vite 5, TypeScript 5.4, Vue Router 4, Pinia 2, **Bootstrap 5.3**, **Bootstrap Icons 1.11**, **Chart.js 4 + vue-chartjs 5**

**Estructura** (`src/`):

| Carpeta | Descripción |
|---------|-------------|
| `router/` | Configuración de rutas (`index.ts`) |
| `stores/` | Stores Pinia (`institutions.ts`, `institutionDetail.ts`) |
| `views/` | Páginas (`InstitutionsView.vue`, `InstitutionDetailView.vue`, `RankingView.vue`) |
| `components/charts/` | Componentes de gráficas (Chart.js): `OaPieChart`, `OaEvolutionChart`, `JournalApcBarChart`, `TopJournalsChart`, `RankingScatterChart` |
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
| GET | `/api/institutions/{uuid}/journals/apc?year=` |
| GET | `/api/institutions/{uuid}/journals/top?year=&limit=10` |
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
- **Chart.js + vue-chartjs**: librería ligera (MIT) para gráficas: doughnut (distribución OA), stacked bar (evolución), horizontal bar (revistas), scatter (ranking).
