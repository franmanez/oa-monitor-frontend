<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useHistoricalStore } from '@/stores/historical'
import type { InstitutionPageResponse } from '@/stores/types'
import type { JournalApcItem } from '@/stores/types'
import OaRoutesColumnChart from '@/components/charts/OaRoutesColumnChart.vue'
import ApcEvolutionChart from '@/components/charts/ApcEvolutionChart.vue'
import ApcArticlesChart from '@/components/charts/ApcArticlesChart.vue'
import YearCompositionBar from '@/components/historical/YearCompositionBar.vue'
import PctBar from '@/components/historical/PctBar.vue'
import { OA_COLORS, oaSoftColor, oaTextColor } from '@/utils/oaRoutes'

const router = useRouter()
const store = useHistoricalStore()

// Institution selection
const institutions = ref<{ id: string; name: string }[]>([])
const selectedInstitutionId = ref<string>('')
const institutionsLoading = ref(false)

// Journal data per year
const journalsByYear = ref<Record<number, JournalApcItem[]>>({})
const journalsLoading = ref(false)

// Heatmap
const heatmapMetrics = ref([
  { key: 'broadOaPct', label: 'OA amplio', description: 'Todo acceso abierto' },
  { key: 'strongOaPct', label: 'OA fuerte', description: 'DIAMOND+GOLD+GREEN' },
  { key: 'repositoryPct', label: 'Repositorio', description: 'Depósito en repositorio' }
])

async function fetchInstitutions() {
  institutionsLoading.value = true
  try {
    const res = await fetch('/api/institutions?size=200')
    if (res.ok) {
      const data: InstitutionPageResponse = await res.json()
      institutions.value = data.content.map(i => ({ id: i.id, name: i.name }))
    }
  } finally {
    institutionsLoading.value = false
  }
}

async function fetchJournalsForYears(years: number[]) {
  if (!selectedInstitutionId.value || years.length === 0) return
  journalsLoading.value = true
  journalsByYear.value = {}
  try {
    const promises = years.map(year =>
      fetch(`/api/institutions/${selectedInstitutionId.value}/historical/journals/apc?year=${year}`)
        .then(res => res.ok ? res.json() : [])
    )
    const results = await Promise.all(promises)
    years.forEach((year, i) => {
      journalsByYear.value[year] = results[i].slice(0, 5)
    })
  } finally {
    journalsLoading.value = false
  }
}

function selectInstitution(id: string) {
  selectedInstitutionId.value = id
  if (id) {
    store.fetchHistorical(id).then(() => {
      // Fetch journals for all available years
      const years = store.filteredData.map(d => d.year)
      fetchJournalsForYears(years)
    })
  } else {
    store.$reset()
  }
}

function formatEur(n: number) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR',
    maximumFractionDigits: 0
  }).format(n)
}

function formatNum(n: number) {
  return new Intl.NumberFormat('es-ES').format(n)
}

// Semáforo de la tabla "Detalle por Año": mismos umbrales (70/50) que el heatmap
function oaBarColor(pct: number): string {
  if (pct >= 70) return OA_COLORS.GREEN
  if (pct >= 50) return OA_COLORS.HYBRID
  return '#ef4444'
}

function oaCellClass(pct: number): string {
  if (pct >= 70) return 'oa-cell-good'
  if (pct >= 50) return 'oa-cell-mid'
  return 'oa-cell-low'
}

// Columnas por ruta en la tabla "Detalle por Año": cabecera en color sólido
// de la ruta y celdas en el mismo tono suave (oaSoftColor)
const ROUTE_COLUMNS = [
  { route: 'DIAMOND', key: 'diamondCount' },
  { route: 'GOLD', key: 'goldCount' },
  { route: 'GREEN', key: 'greenCount' },
  { route: 'HYBRID', key: 'hybridCount' },
  { route: 'CLOSED', key: 'closedCount' }
] as const

// Heatmap color
function heatmapColor(value: number): string {
  if (value >= 70) return '#22c55e'
  if (value >= 50) return '#86efac'
  if (value >= 30) return '#fde047'
  if (value >= 15) return '#fb923c'
  return '#ef4444'
}

// Summary calculations
const totalPubs = computed(() => store.filteredData.reduce((s, d) => s + d.totalPublications, 0))
const avgOaPct = computed(() => {
  if (store.filteredData.length === 0) return 0
  const avg = store.filteredData.reduce((s, d) => s + d.broadOaPct, 0) / store.filteredData.length
  return Math.round(avg * 10) / 10
})
const totalApcCost = computed(() => store.filteredData.reduce((s, d) => s + d.totalApcCost, 0))

const yearLabels = computed(() => store.filteredData.map(d => String(d.year)))
const routeCountsByYear = computed(() => store.filteredData.map(d => ({
  DIAMOND: d.diamondCount,
  GOLD: d.goldCount,
  GREEN: d.greenCount,
  HYBRID: d.hybridCount,
  BRONZE: d.bronzeCount,
  CLOSED: d.closedCount
})))

watch(() => store.selectedYears, (newYears) => {
  if (selectedInstitutionId.value && newYears.length > 0) {
    fetchJournalsForYears(newYears)
  }
})

onMounted(() => {
  fetchInstitutions()
})
</script>

<template>
  <div class="fade-in-up">
    <div class="d-flex align-items-center justify-content-between mb-4">
      <div>
        <h1 class="page-title">Análisis Histórico</h1>
        <p class="text-muted mb-0 small">Evolución temporal de métricas de acceso abierto y APCs</p>
      </div>
    </div>

    <!-- Institution selector -->
    <div class="card shadow-sm mb-4">
      <div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-md-6">
            <label class="form-label fw-semibold small">Universidad</label>
            <select
              v-model="selectedInstitutionId"
              @change="selectInstitution(selectedInstitutionId)"
              class="form-select"
              :disabled="institutionsLoading"
            >
              <option value="" disabled>Selecciona una universidad...</option>
              <option v-for="inst in institutions" :key="inst.id" :value="inst.id">
                {{ inst.name }}
              </option>
            </select>
          </div>
          <div class="col-md-6" v-if="store.data">
            <label class="form-label fw-semibold small">Seleccionar años</label>
            <div class="d-flex flex-wrap gap-2">
              <button
                v-for="year in store.availableYears"
                :key="year"
                class="btn btn-sm"
                :class="store.selectedYears.includes(year) ? 'btn-primary' : 'btn-outline-secondary'"
                @click="store.toggleYear(year)"
              >
                {{ year }}
              </button>
              <button class="btn btn-sm btn-outline-secondary ms-1" @click="store.selectAllYears">Todos</button>
              <button class="btn btn-sm btn-outline-secondary" @click="store.clearSelection">Ninguno</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
      <p class="text-muted mt-2">Cargando datos históricos...</p>
    </div>

    <!-- Error -->
    <div v-else-if="store.error" class="alert alert-danger text-center">
      <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ store.error }}
    </div>

    <!-- No data -->
    <div v-else-if="!store.data" class="text-center py-5">
      <i class="bi bi-graph-up text-muted" style="font-size: 3rem"></i>
      <p class="text-muted mt-3">Selecciona una universidad para ver su análisis histórico</p>
    </div>

    <!-- Data -->
    <template v-else-if="store.filteredData.length > 0">

      <!-- KPI summary cards -->
      <div class="row g-3 mb-4">
        <div class="col-sm-6 col-lg-4">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex align-items-center gap-2 mb-2">
                <span class="d-inline-flex align-items-center justify-content-center rounded bg-primary bg-opacity-10"
                  style="width:32px;height:32px">
                  <i class="bi bi-file-text text-primary"></i>
                </span>
                <small class="text-muted fw-medium">Total artículos</small>
              </div>
              <p class="h3 fw-bold mb-0">{{ formatNum(totalPubs) }}</p>
              <small class="text-muted">{{ store.filteredData.length }} años seleccionados</small>
            </div>
          </div>
        </div>
        <div class="col-sm-6 col-lg-4">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex align-items-center gap-2 mb-2">
                <span class="d-inline-flex align-items-center justify-content-center rounded"
                  :class="avgOaPct >= 70 ? 'bg-success bg-opacity-10' : 'bg-warning bg-opacity-10'"
                  style="width:32px;height:32px">
                  <i class="bi bi-check-circle" :class="avgOaPct >= 70 ? 'text-success' : 'text-warning'"></i>
                </span>
                <small class="text-muted fw-medium">Media OA amplio</small>
              </div>
              <p class="h3 fw-bold mb-0"
                :class="avgOaPct >= 70 ? 'text-success' : 'text-warning'">
                {{ avgOaPct }}%
              </p>
              <small class="text-muted">Promedio del período</small>
            </div>
          </div>
        </div>
        <div class="col-sm-6 col-lg-4">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex align-items-center gap-2 mb-2">
                <span class="d-inline-flex align-items-center justify-content-center rounded"
                  style="width:32px;height:32px;background:rgba(168,85,247,0.1)">
                  <i class="bi bi-currency-euro" style="color:#a855f7"></i>
                </span>
                <small class="text-muted fw-medium">Coste APC acumulado</small>
              </div>
              <p class="h3 fw-bold mb-0">{{ formatEur(totalApcCost) }}</p>
              <small class="text-muted">Estimación total del período</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Publications by year and OA route -->
      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <h5 class="card-title fs-6 fw-semibold mb-1">Publicaciones por Año y Ruta de Acceso Abierto</h5>
          <p class="text-muted small mb-3">Dos columnas por año: abierto sin coste de publicación (Verde + Diamante) frente a con APC (Oro + Híbrido) o sin apertura garantizada (Bronce + Cerrado)</p>
          <OaRoutesColumnChart :categories="yearLabels" :counts="routeCountsByYear" />
        </div>
      </div>

      <!-- APC Evolution -->
      <div class="row g-4 mb-4">
        <div class="col-lg-7">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <h5 class="card-title fs-6 fw-semibold mb-1">Evolución de Costes APC</h5>
              <p class="text-muted small mb-3">Coste total estimado y APC medio por artículo</p>
              <ApcEvolutionChart :data="store.filteredData" />
            </div>
          </div>
        </div>
        <div class="col-lg-5">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <h5 class="card-title fs-6 fw-semibold mb-1">Artículos con APC</h5>
              <p class="text-muted small mb-3">Número de artículos GOLD + HYBRID con precio estimado</p>
              <ApcArticlesChart :data="store.filteredData" />
            </div>
          </div>
        </div>
      </div>

      <!-- Heatmap -->
      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <h5 class="card-title fs-6 fw-semibold mb-1">Mapa de Calor: Métricas por Año</h5>
          <p class="text-muted small mb-3">Visualización de rendimiento por métrica y año (verde = mejor, rojo = peor)</p>
          <div class="table-responsive">
            <table class="table table-sm mb-0 heatmap-table">
              <thead>
                <tr>
                  <th class="text-muted small">Métrica</th>
                  <th v-for="d in store.filteredData" :key="d.year" class="text-center small">{{ d.year }}</th>
                  <th class="text-muted small text-center">Descripción</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="metric in heatmapMetrics" :key="metric.key">
                  <td class="fw-semibold small">{{ metric.label }}</td>
                  <td v-for="d in store.filteredData" :key="d.year" class="text-center">
                    <span class="heatmap-cell" :style="{
                      background: heatmapColor((d as any)[metric.key] as number),
                      color: (d as any)[metric.key] >= 50 ? '#fff' : '#000'
                    }">
                      {{ (d as any)[metric.key] }}%
                    </span>
                  </td>
                  <td class="text-muted small text-center">{{ metric.description }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Detail table -->
      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <h5 class="card-title fs-6 fw-semibold mb-3">Detalle por Año</h5>
          <div class="table-responsive">
            <table class="table table-sm table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th>Año</th>
                  <th class="text-center">Artículos</th>
                  <th class="text-center">% OA</th>
                  <th class="text-center d-none d-xl-table-cell">Composición OA</th>
                  <th
                    v-for="col in ROUTE_COLUMNS"
                    :key="col.route"
                    class="text-center route-th"
                    :style="{ background: OA_COLORS[col.route], color: oaTextColor(col.route) }"
                  >{{ col.route }}</th>
                  <th class="text-center">Repositorio</th>
                  <th class="text-end">Coste APC</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in store.filteredData" :key="d.year">
                  <td class="fw-semibold">{{ d.year }}</td>
                  <td class="text-center">{{ formatNum(d.totalPublications) }}</td>
                  <td class="text-center oa-cell" :class="oaCellClass(d.broadOaPct)">
                    <PctBar :pct="d.broadOaPct" :label="d.broadOaPct + '%'" :color="oaBarColor(d.broadOaPct)" />
                  </td>
                  <td class="text-center d-none d-xl-table-cell">
                    <YearCompositionBar
                      :segments="{
                        DIAMOND: d.diamondCount,
                        GOLD: d.goldCount,
                        GREEN: d.greenCount,
                        HYBRID: d.hybridCount,
                        BRONZE: d.bronzeCount,
                        CLOSED: d.closedCount
                      }"
                      :total="d.totalPublications"
                    />
                  </td>
                  <td
                    v-for="col in ROUTE_COLUMNS"
                    :key="col.route"
                    class="text-center small"
                    :style="{ background: oaSoftColor(col.route) }"
                  >{{ d[col.key] }}</td>
                  <td class="text-center">
                    <PctBar
                      :pct="d.repositoryPct"
                      :label="formatNum(d.repositoryCount) + ' · ' + d.repositoryPct + '%'"
                      :color="OA_COLORS.GREEN"
                    />
                  </td>
                  <td class="text-end small">{{ formatEur(d.totalApcCost) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Top journals by year -->
      <div class="card shadow-sm mb-4" v-if="Object.keys(journalsByYear).length > 0">
        <div class="card-body">
          <h5 class="card-title fs-6 fw-semibold mb-3">Top 5 Revistas por Coste APC en Cada Año</h5>
          <div v-if="journalsLoading" class="text-center py-4">
            <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
          </div>
          <div v-else class="row g-3">
            <div v-for="year in store.filteredData.map(d => d.year).sort((a, b) => b - a)" :key="year" class="col-lg-6">
              <div class="border rounded p-3">
                <h6 class="fw-semibold small mb-2">{{ year }}</h6>
                <div v-if="journalsByYear[year]?.length > 0">
                  <div v-for="(j, i) in journalsByYear[year]" :key="i" class="d-flex align-items-center justify-content-between mb-2">
                    <div class="text-truncate me-2" style="max-width: 60%">
                      <small class="fw-medium">{{ j.journalName || 'Sin nombre' }}</small>
                      <small class="text-muted d-block">{{ j.publicationCount }} art.</small>
                    </div>
                    <small class="fw-semibold text-nowrap">{{ formatEur(j.totalApcCost) }}</small>
                  </div>
                </div>
                <p v-else class="text-muted small mb-0">Sin datos de APC</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </template>

    <!-- Empty after filtering -->
    <div v-else-if="store.data && store.filteredData.length === 0" class="text-center py-5">
      <i class="bi bi-calendar-x text-muted" style="font-size: 2rem"></i>
      <p class="text-muted mt-2">No hay datos para los años seleccionados</p>
      <button class="btn btn-outline-primary btn-sm" @click="store.selectAllYears">Seleccionar todos los años</button>
    </div>
  </div>
</template>

<style scoped>
.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0;
  color: var(--color-text-primary);
}

.heatmap-table {
  font-size: 0.85rem;
}

.heatmap-cell {
  display: inline-block;
  min-width: 60px;
  padding: 6px 10px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.8rem;
}

.heatmap-table th,
.heatmap-table td {
  vertical-align: middle;
}

/* Celdas de ruta en la tabla "Detalle por Año": fondo suave del color de ruta
   (inline) y cabecera en sólido. Aquí solo tipografía de cabecera. */
.route-th {
  font-size: 0.72rem;
  letter-spacing: 0.03em;
  font-weight: 600;
}

/* Celda % OA de la tabla "Detalle por Año": fondo semáforo suave */
.oa-cell {
  transition: background var(--transition-fast) ease;
}

.oa-cell-good {
  background: rgba(68, 112, 50, 0.10);
}

.oa-cell-mid {
  background: rgba(243, 156, 18, 0.12);
}

.oa-cell-low {
  background: rgba(239, 68, 68, 0.10);
}
</style>
