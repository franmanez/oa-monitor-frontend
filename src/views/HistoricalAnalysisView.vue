<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useHistoricalStore } from '@/stores/historical'
import type { InstitutionPageResponse } from '@/stores/types'
import type { JournalApcItem } from '@/stores/types'
import OaEvolutionChart from '@/components/charts/OaEvolutionChart.vue'
import OaRoutesStackedBarChart from '@/components/charts/OaRoutesStackedBarChart.vue'
import ApcEvolutionChart from '@/components/charts/ApcEvolutionChart.vue'
import ApcArticlesChart from '@/components/charts/ApcArticlesChart.vue'
import ComplianceEvolutionChart from '@/components/charts/ComplianceEvolutionChart.vue'
import PublicationsVolumeChart from '@/components/charts/PublicationsVolumeChart.vue'
import RadarCompareChart from '@/components/charts/RadarCompareChart.vue'

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
  { key: 'repositoryPct', label: 'Repositorio', description: 'Depósito art. 37 LCI' },
  { key: 'complianceScore', label: 'Cumplimiento', description: 'Score Plan S + LCI' }
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

function gradeColor(grade: string): string {
  if (grade.startsWith('A')) return '#22c55e'
  if (grade.startsWith('B')) return '#3b82f6'
  if (grade.startsWith('C')) return '#f59e0b'
  return '#ef4444'
}

function semaforoClass(pct: number): string {
  if (pct >= 70) return 'sem-green'
  if (pct >= 50) return 'sem-yellow'
  return 'sem-red'
}

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
const avgCompliance = computed(() => {
  if (store.filteredData.length === 0) return 0
  const avg = store.filteredData.reduce((s, d) => s + d.complianceScore, 0) / store.filteredData.length
  return Math.round(avg * 10) / 10
})
const latestGrade = computed(() => {
  const sorted = [...store.filteredData].sort((a, b) => b.year - a.year)
  return sorted[0]?.complianceGrade || '—'
})

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
        <p class="text-muted mb-0 small">Evolución temporal de métricas de acceso abierto, APCs y cumplimiento normativo</p>
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
        <div class="col-sm-6 col-lg-3">
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
        <div class="col-sm-6 col-lg-3">
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
        <div class="col-sm-6 col-lg-3">
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
        <div class="col-sm-6 col-lg-3">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex align-items-center gap-2 mb-2">
                <span class="d-inline-flex align-items-center justify-content-center rounded"
                  style="width:32px;height:32px;background:rgba(34,197,94,0.1)">
                  <i class="bi bi-shield-check" style="color:#22c55e"></i>
                </span>
                <small class="text-muted fw-medium">Cumplimiento medio</small>
              </div>
              <div class="d-flex align-items-center gap-2">
                <p class="h3 fw-bold mb-0" :style="{ color: gradeColor(latestGrade) }">{{ avgCompliance }}</p>
                <span class="badge fs-6" :style="{ background: gradeColor(latestGrade), color: '#fff' }">
                  {{ latestGrade }}
                </span>
              </div>
              <small class="text-muted">Score promedio (última nota: {{ latestGrade }})</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Evolution of OA -->
      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <h5 class="card-title fs-6 fw-semibold mb-1">Evolución del Acceso Abierto</h5>
          <p class="text-muted small mb-3">Porcentaje de artículos en acceso abierto a lo largo del tiempo</p>
          <OaEvolutionChart :data="store.filteredData" />
        </div>
      </div>

      <!-- OA Routes stacked -->
      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <h5 class="card-title fs-6 fw-semibold mb-1">Rutas de Acceso Abierto por Año</h5>
          <p class="text-muted small mb-3">Distribución porcentual de cada ruta OA (DIAMOND, GOLD, GREEN, HYBRID, BRONZE, CLOSED)</p>
          <OaRoutesStackedBarChart :data="store.filteredData" />
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

      <!-- Compliance Evolution + Publications Volume -->
      <div class="row g-4 mb-4">
        <div class="col-lg-7">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <h5 class="card-title fs-6 fw-semibold mb-1">
                <i class="bi bi-shield-check me-2" style="color:#22c55e"></i>Evolución del Cumplimiento Normativo
              </h5>
              <p class="text-muted small mb-3">Score de cumplimiento (Plan S + art. 37 LCI) por año</p>
              <ComplianceEvolutionChart :data="store.filteredData" />
            </div>
          </div>
        </div>
        <div class="col-lg-5">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <h5 class="card-title fs-6 fw-semibold mb-1">Volumen de Publicaciones</h5>
              <p class="text-muted small mb-3">Total de artículos de revista por año</p>
              <PublicationsVolumeChart :data="store.filteredData" />
            </div>
          </div>
        </div>
      </div>

      <!-- Radar comparison -->
      <div class="card shadow-sm mb-4" v-if="store.filteredData.length >= 2">
        <div class="card-body">
          <h5 class="card-title fs-6 fw-semibold mb-1">Comparativa Multidimensional</h5>
          <p class="text-muted small mb-3">Radar chart comparando las métricas clave entre los años seleccionados</p>
          <RadarCompareChart :data="store.filteredData" />
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
                  <th class="text-center">DIAMOND</th>
                  <th class="text-center">GOLD</th>
                  <th class="text-center">GREEN</th>
                  <th class="text-center">HYBRID</th>
                  <th class="text-center">CLOSED</th>
                  <th class="text-center">Repositorio</th>
                  <th class="text-end">Coste APC</th>
                  <th class="text-center">Score</th>
                  <th class="text-center">Nota</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in store.filteredData" :key="d.year">
                  <td class="fw-semibold">{{ d.year }}</td>
                  <td class="text-center">{{ formatNum(d.totalPublications) }}</td>
                  <td class="text-center">
                    <span :class="d.broadOaPct >= 70 ? 'text-success' : d.broadOaPct >= 50 ? 'text-warning' : 'text-danger'" class="fw-semibold">
                      {{ d.broadOaPct }}%
                    </span>
                  </td>
                  <td class="text-center small">{{ d.diamondCount }}</td>
                  <td class="text-center small">{{ d.goldCount }}</td>
                  <td class="text-center small">{{ d.greenCount }}</td>
                  <td class="text-center small">{{ d.hybridCount }}</td>
                  <td class="text-center small text-danger">{{ d.closedCount }}</td>
                  <td class="text-center">
                    <span class="text-muted small">{{ d.repositoryCount }}</span>
                    <small class="text-muted ms-1">({{ d.repositoryPct }}%)</small>
                  </td>
                  <td class="text-end small">{{ formatEur(d.totalApcCost) }}</td>
                  <td class="text-center fw-semibold" :style="{ color: gradeColor(d.complianceGrade) }">{{ d.complianceScore }}</td>
                  <td class="text-center">
                    <span class="badge" :style="{ background: gradeColor(d.complianceGrade), color: '#fff' }">
                      {{ d.complianceGrade }}
                    </span>
                  </td>
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

.sem-green {
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.4);
}

.sem-yellow {
  background: #f59e0b;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.4);
}

.sem-red {
  background: #ef4444;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.4);
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
</style>
