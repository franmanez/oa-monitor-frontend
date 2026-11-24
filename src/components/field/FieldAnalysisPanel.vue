<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { FieldArticle, FieldStats } from '@/stores/types'
import YearCompositionBar from '@/components/historical/YearCompositionBar.vue'
import PctBar from '@/components/historical/PctBar.vue'
import { OA_COLORS, oaLabel, oaSoftColor, oaTextColor } from '@/utils/oaRoutes'

// Pestaña "Áreas Temáticas" del detalle de institución. Se autoabastece de
// GET /fields y GET /fields/articles, igual que JournalApcPanel/PublisherApcPanel.
const props = defineProps<{
  institutionId: string
  year: string // '' o 'all' = todos los años
}>()

const loading = ref(false)
const error = ref<string | null>(null)
const fields = ref<FieldStats[]>([])

const selectedField = ref<string | null>(null)
const fieldArticles = ref<FieldArticle[]>([])
const articlesLoading = ref(false)
const visibleArticles = ref(25)

// Columnas por ruta: cabecera en color sólido, celdas en tono suave
const ROUTE_COLUMNS = [
  { route: 'DIAMOND', key: 'diamondCount' },
  { route: 'GOLD', key: 'goldCount' },
  { route: 'GREEN', key: 'greenCount' },
  { route: 'HYBRID', key: 'hybridCount' },
  { route: 'CLOSED', key: 'closedCount' }
] as const

function yearParam(): string {
  return props.year && props.year !== 'all' ? `year=${props.year}` : ''
}

async function fetchFields() {
  if (!props.institutionId) return
  loading.value = true
  error.value = null
  selectedField.value = null
  fieldArticles.value = []
  try {
    const y = yearParam()
    const res = await fetch(`/api/institutions/${props.institutionId}/fields${y ? '?' + y : ''}`)
    if (res.ok) {
      fields.value = await res.json()
    } else {
      throw new Error('No se pudieron cargar las áreas temáticas')
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error desconocido'
    fields.value = []
  } finally {
    loading.value = false
  }
}

async function toggleField(field: string) {
  if (selectedField.value === field) {
    selectedField.value = null
    fieldArticles.value = []
    return
  }
  selectedField.value = field
  visibleArticles.value = 25
  articlesLoading.value = true
  try {
    const params = new URLSearchParams({ field })
    if (props.year && props.year !== 'all') params.set('year', props.year)
    const res = await fetch(`/api/institutions/${props.institutionId}/fields/articles?${params}`)
    fieldArticles.value = res.ok ? await res.json() : []
  } finally {
    articlesLoading.value = false
  }
}

// KPIs
const totalPubs = computed(() => fields.value.reduce((s, f) => s + f.articleCount, 0))
const classifiedCount = computed(() =>
  fields.value.filter(f => f.field !== 'Sin clasificar').reduce((s, f) => s + f.articleCount, 0))
const unclassified = computed(() => fields.value.find(f => f.field === 'Sin clasificar'))
const fieldCount = computed(() => fields.value.filter(f => f.field !== 'Sin clasificar').length)
const broadOaPct = computed(() => {
  if (totalPubs.value === 0) return 0
  const closed = fields.value.reduce((s, f) => s + f.closedCount, 0)
  return Math.round((totalPubs.value - closed) / totalPubs.value * 1000) / 10
})
const strongOaPct = computed(() => {
  if (totalPubs.value === 0) return 0
  const strong = fields.value.reduce((s, f) => s + f.diamondCount + f.goldCount + f.greenCount, 0)
  return Math.round(strong / totalPubs.value * 1000) / 10
})
const totalApc = computed(() => fields.value.reduce((s, f) => s + Number(f.totalApc), 0))
const maxFieldCount = computed(() =>
  fields.value.reduce((m, f) => Math.max(m, f.articleCount), 0))
const classifiedPct = computed(() =>
  totalPubs.value > 0 ? Math.round(classifiedCount.value / totalPubs.value * 100) : 0)

function segmentsOf(f: FieldStats): Record<string, number> {
  return {
    DIAMOND: f.diamondCount,
    GOLD: f.goldCount,
    GREEN: f.greenCount,
    HYBRID: f.hybridCount,
    BRONZE: f.bronzeCount,
    CLOSED: f.closedCount
  }
}

// Semáforo coherente con el heatmap y el detalle por año (umbrales 70/50)
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

function badgeStyle(status: string | null | undefined) {
  const color = status ? OA_COLORS[status] : undefined
  if (!color) return { background: '#e5e7eb', color: '#374151' }
  return { background: color, color: oaTextColor(status) }
}

function formatEur(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0
  }).format(n)
}

function formatNum(n: number) {
  return new Intl.NumberFormat('es-ES').format(n)
}

onMounted(fetchFields)
watch(() => [props.institutionId, props.year], fetchFields)
</script>

<template>
  <div>
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
      <p class="text-muted mt-2">Cargando clasificación temática...</p>
    </div>

    <div v-else-if="error" class="alert alert-danger text-center">
      <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ error }}
    </div>

    <div v-else-if="fields.length === 0" class="text-center py-5">
      <i class="bi bi-collection text-muted" style="font-size: 2rem"></i>
      <p class="text-muted mt-2">No hay publicaciones cosechadas para este filtro</p>
    </div>

    <template v-else>
      <!-- KPIs -->
      <div class="row g-3 mb-4">
        <div class="col-sm-6 col-lg-3">
          <div class="card shadow-sm h-100">
            <div class="card-body py-3">
              <div class="text-muted small fw-semibold">Artículos</div>
              <div class="fs-4 fw-bold">{{ formatNum(totalPubs) }}</div>
            </div>
          </div>
        </div>
        <div class="col-sm-6 col-lg-3">
          <div class="card shadow-sm h-100">
            <div class="card-body py-3">
              <div class="text-muted small fw-semibold">Áreas con producción</div>
              <div class="fs-4 fw-bold">{{ fieldCount }}</div>
              <div class="small text-muted">{{ classifiedPct }} % clasificadas</div>
            </div>
          </div>
        </div>
        <div class="col-sm-6 col-lg-3">
          <div class="card shadow-sm h-100">
            <div class="card-body py-3">
              <div class="text-muted small fw-semibold">% OA amplio</div>
              <div class="fs-4 fw-bold">{{ broadOaPct }}%</div>
              <div class="small text-muted">OA fuerte: {{ strongOaPct }}%</div>
            </div>
          </div>
        </div>
        <div class="col-sm-6 col-lg-3">
          <div class="card shadow-sm h-100">
            <div class="card-body py-3">
              <div class="text-muted small fw-semibold">Coste APC total</div>
              <div class="fs-4 fw-bold">{{ formatEur(totalApc) }}</div>
              <div v-if="unclassified" class="small text-muted">Sin clasificar: {{ formatNum(unclassified.articleCount) }} art.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Panorama: barras horizontales -->
      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <h5 class="card-title fs-6 fw-semibold mb-1">Panorama por área</h5>
          <p class="text-muted small mb-3">
            Longitud de la barra ∝ nº de artículos (respecto al área mayor); segmentos = composición por ruta OA.
            Sin clasificar: artículos sin primary_topic en OpenAlex (p. ej. procedentes solo del repositorio).
          </p>
          <div
            v-for="f in fields"
            :key="f.field"
            class="field-row d-flex align-items-center gap-3 py-2"
            :class="{ 'field-row-active': selectedField === f.field }"
            @click="toggleField(f.field)"
          >
            <div class="field-name text-truncate" :title="f.field">{{ f.field }}</div>
            <div class="field-bar-wrap flex-grow-1">
              <div class="field-bar-outer" :style="{ width: (maxFieldCount ? f.articleCount / maxFieldCount * 100 : 0) + '%' }">
                <YearCompositionBar :segments="segmentsOf(f)" :total="f.articleCount" :height="18" :max-width="9999" />
              </div>
            </div>
            <div class="field-meta text-nowrap">
              <span class="fw-semibold small">{{ formatNum(f.articleCount) }}</span>
              <small class="text-muted ms-1">({{ f.sharePct }}%)</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabla detalle por área -->
      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <h5 class="card-title fs-6 fw-semibold mb-3">Detalle por Área</h5>
          <div class="table-responsive">
            <table class="table table-sm table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th>Área</th>
                  <th class="text-center">Artículos</th>
                  <th class="text-center">% OA</th>
                  <th class="text-center d-none d-xl-table-cell">Composición</th>
                  <th
                    v-for="col in ROUTE_COLUMNS"
                    :key="col.route"
                    class="text-center route-th"
                    :style="{ background: OA_COLORS[col.route], color: oaTextColor(col.route) }"
                  >{{ col.route }}</th>
                  <th class="text-center">Repositorio</th>
                  <th class="text-end">Coste APC</th>
                  <th class="text-end">APC medio</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="f in fields"
                  :key="f.field"
                  class="field-row clickable"
                  :class="{ 'field-row-active': selectedField === f.field }"
                  @click="toggleField(f.field)"
                >
                  <td class="fw-medium text-truncate" style="max-width: 260px" :title="f.field">{{ f.field }}</td>
                  <td class="text-center small">{{ formatNum(f.articleCount) }} <small class="text-muted">({{ f.sharePct }}%)</small></td>
                  <td class="text-center oa-cell" :class="oaCellClass(f.broadOaPct)">
                    <PctBar :pct="f.broadOaPct" :label="f.broadOaPct + '%'" :color="oaBarColor(f.broadOaPct)" />
                  </td>
                  <td class="text-center d-none d-xl-table-cell">
                    <YearCompositionBar :segments="segmentsOf(f)" :total="f.articleCount" />
                  </td>
                  <td
                    v-for="col in ROUTE_COLUMNS"
                    :key="col.route"
                    class="text-center small"
                    :style="{ background: oaSoftColor(col.route) }"
                  >{{ f[col.key] }}</td>
                  <td class="text-center">
                    <PctBar
                      :pct="f.repositoryPct"
                      :label="formatNum(f.repositoryCount) + ' · ' + f.repositoryPct + '%'"
                      :color="OA_COLORS.GREEN"
                    />
                  </td>
                  <td class="text-end small">{{ formatEur(Number(f.totalApc)) }}</td>
                  <td class="text-end small">{{ formatEur(f.averageApc != null ? Number(f.averageApc) : null) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Drill-down de artículos del área seleccionada -->
      <div v-if="selectedField" class="card shadow-sm mb-4">
        <div class="card-body">
          <div class="d-flex align-items-center justify-content-between mb-3">
            <h5 class="card-title fs-6 fw-semibold mb-0">
              Artículos de {{ selectedField }}
              <small class="text-muted fw-normal">— ordenados por APC</small>
            </h5>
            <button class="btn btn-sm btn-outline-secondary" @click="selectedField && toggleField(selectedField)">
              <i class="bi bi-x-lg me-1"></i>Cerrar
            </button>
          </div>
          <div v-if="articlesLoading" class="text-center py-4">
            <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
          </div>
          <template v-else>
            <div class="table-responsive">
              <table class="table table-sm align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Año</th>
                    <th>Título</th>
                    <th class="d-none d-md-table-cell">Revista</th>
                    <th class="d-none d-lg-table-cell">Subárea</th>
                    <th class="text-center">Estado</th>
                    <th class="text-end">APC</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="a in fieldArticles.slice(0, visibleArticles)" :key="a.id">
                    <td class="small text-muted">{{ a.publicationYear ?? '—' }}</td>
                    <td class="text-truncate" style="max-width: 420px" :title="a.title ?? ''">
                      <a
                        v-if="a.doi"
                        :href="`https://doi.org/${a.doi}`"
                        target="_blank"
                        rel="noopener"
                        class="text-decoration-none"
                      >{{ a.title || a.doi }}</a>
                      <span v-else>{{ a.title || a.doi || '—' }}</span>
                    </td>
                    <td class="small text-muted text-truncate d-none d-md-table-cell" style="max-width: 220px">{{ a.journalName || '—' }}</td>
                    <td class="small text-muted text-truncate d-none d-lg-table-cell" style="max-width: 220px">{{ a.subfield || '—' }}</td>
                    <td class="text-center">
                      <span v-if="a.oaStatus" class="badge rounded-pill" :style="badgeStyle(a.oaStatus)">{{ oaLabel(a.oaStatus) }}</span>
                      <span v-else class="text-muted small">—</span>
                    </td>
                    <td class="text-end small">{{ formatEur(a.apcEstimatedEur) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="fieldArticles.length === 0" class="text-center text-muted small py-3">Sin artículos para este área</div>
            <div v-else-if="fieldArticles.length > visibleArticles" class="text-center mt-3">
              <button class="btn btn-sm btn-outline-primary" @click="visibleArticles = fieldArticles.length">
                Mostrar los {{ formatNum(fieldArticles.length) }} artículos
              </button>
            </div>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.route-th {
  font-size: 0.72rem;
  letter-spacing: 0.03em;
  font-weight: 600;
}

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

.field-row {
  cursor: pointer;
  border-radius: var(--radius-sm, 6px);
  transition: background var(--transition-fast) ease;
}

.field-row:hover {
  background: var(--color-primary-soft, #eef2f7);
}

.field-row-active {
  background: var(--color-primary-soft, #eef2f7);
}

.field-name {
  width: 220px;
  flex-shrink: 0;
  font-size: 0.85rem;
  font-weight: 500;
}

.field-bar-wrap {
  min-width: 120px;
}

.field-bar-outer {
  min-width: 14px;
}

.field-meta {
  width: 110px;
  text-align: right;
  flex-shrink: 0;
}
</style>
