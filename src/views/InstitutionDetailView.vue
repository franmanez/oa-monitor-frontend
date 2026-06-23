<script setup lang="ts">
import { onMounted, computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useInstitutionDetailStore } from '@/stores/institutionDetail'
import type { PublicationItem, PublicationPageResponse, JournalApcItem, JournalCountItem } from '@/stores/types'
import OaPieChart from '@/components/charts/OaPieChart.vue'
import OaEvolutionChart from '@/components/charts/OaEvolutionChart.vue'
import JournalApcBarChart from '@/components/charts/JournalApcBarChart.vue'
import TopJournalsChart from '@/components/charts/TopJournalsChart.vue'

const route = useRoute()
const router = useRouter()
const store = useInstitutionDetailStore()

const pubs = ref<PublicationItem[]>([])
const pubsLoading = ref(false)
const pubsTotal = ref(0)
const pubsPages = ref(0)
const pubsPage = ref(0)
const pubsSize = ref(20)
const filterStatus = ref('')
const filterSearch = ref('')
const calculatingApc = ref(false)
const showHarvestModal = ref(false)
const harvestYear = ref(new Date().getFullYear())
const harvesting = ref(false)

const activeTab = ref('revistas')
const journalApcData = ref<JournalApcItem[]>([])
const journalTopData = ref<JournalCountItem[]>([])
const journalsLoading = ref(false)

async function fetchJournalData() {
  journalsLoading.value = true
  try {
    const yearParam = store.selectedYear && store.selectedYear !== 'all' ? `?year=${store.selectedYear}` : ''
    const [apcRes, topRes] = await Promise.all([
      fetch(`/api/institutions/${route.params.id}/journals/apc${yearParam}`),
      fetch(`/api/institutions/${route.params.id}/journals/top${yearParam}&limit=10`)
    ])
    journalApcData.value = apcRes.ok ? await apcRes.json() : []
    journalTopData.value = topRes.ok ? await topRes.json() : []
  } catch {
    journalApcData.value = []
    journalTopData.value = []
  } finally {
    journalsLoading.value = false
  }
}

async function runHarvest() {
  harvesting.value = true
  try {
    const res = await fetch(`/api/harvest/trigger/${route.params.id}?year=${harvestYear.value}`, { method: 'POST' })
    if (res.ok) {
      showHarvestModal.value = false
      await store.fetchAll(route.params.id as string)
      await fetchPublications()
    }
  } finally {
    harvesting.value = false
  }
}

async function calculateApc() {
  calculatingApc.value = true
  try {
    const res = await fetch(`/api/institutions/${route.params.id}/apc/calculate`, { method: 'POST' })
    if (res.ok) {
      await store.fetchAll(route.params.id as string)
    }
  } finally {
    calculatingApc.value = false
  }
}

function pubsPagesToShow() {
  const total = pubsPages.value
  const current = pubsPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)
  const pages: number[] = []
  pages.push(0)
  if (current > 2) pages.push(-1)
  for (let p = Math.max(1, current - 1); p <= Math.min(total - 2, current + 1); p++) {
    pages.push(p)
  }
  if (current < total - 3) pages.push(-1)
  pages.push(total - 1)
  return pages
}

async function fetchPublications() {
  pubsLoading.value = true
  try {
    const params = new URLSearchParams()
    params.set('page', String(pubsPage.value))
    params.set('size', String(pubsSize.value))
    if (store.selectedYear && store.selectedYear !== 'all') params.set('year', store.selectedYear)
    if (filterStatus.value) params.set('status', filterStatus.value)
    if (filterSearch.value) params.set('search', filterSearch.value)
    const res = await fetch(`/api/institutions/${route.params.id}/publications?${params}`)
    if (res.ok) {
      const data: PublicationPageResponse = await res.json()
      const pg = data.page
      pubs.value = data.content
      pubsTotal.value = pg.totalElements
      pubsPages.value = pg.totalPages
      pubsPage.value = pg.number
    }
  } finally {
    pubsLoading.value = false
  }
}

watch(() => store.selectedYear, () => { pubsPage.value = 0; fetchPublications(); fetchJournalData() })

onMounted(() => {
  store.fetchAll(route.params.id as string)
  fetchPublications()
  fetchJournalData()
})

function statusBadgeClass(status: string | null) {
  switch (status) {
    case 'GOLD': return 'text-bg-warning'
    case 'HYBRID': return 'text-bg-primary'
    case 'GREEN': return 'text-bg-success'
    case 'BRONZE': return 'text-bg-secondary'
    case 'CLOSED': return 'text-bg-danger'
    case 'DIAMOND': return 'badge-diamond'
    default: return 'text-bg-light text-dark'
  }
}

function formatEur(n: number | null | undefined) {
  if (n == null) return null
  return new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR',
    maximumFractionDigits: 0
  }).format(n)
}

function oaLabel(key: string | null): string {
  if (!key) return '—'
  const map: Record<string, string> = { GOLD: 'Oro', HYBRID: 'Híbrido', GREEN: 'Verde', BRONZE: 'Bronce', CLOSED: 'Cerrado', DIAMOND: 'Diamante' }
  return map[key] || key
}

const oaDescriptions: Record<string, string> = {
  DIAMOND: 'Revista 100% abierta sin coste para el autor ni para el lector. Financiada por instituciones o subvenciones.',
  GOLD: 'Artículo publicado en una revista de acceso abierto. El autor o su institución paga un APC (Article Processing Charge).',
  GREEN: 'Versión del artículo depositada en un repositorio institucional o temático (autoarchivado). Puede tener embargo.',
  HYBRID: 'Artículo de acceso abierto en una revista de suscripción. Se paga un APC para liberar ese artículo concreto.',
  BRONZE: 'Artículo gratuito en la web del editor, pero sin licencia de acceso abierto explícita. Puede retirarse en cualquier momento.',
  CLOSED: 'Artículo bajo muro de pago. Solo accesible mediante suscripción individual o institucional.'
}

const oaColors: Record<string, string> = {
  DIAMOND: '#a855f7',
  GOLD: '#f59e0b',
  GREEN: '#22c55e',
  HYBRID: '#3b82f6',
  BRONZE: '#d97706',
  CLOSED: '#ef4444'
}

const statusCounts = computed(() => {
  return store.filteredSummary?.oaStatusCounts ?? {}
})

const statusEntries = computed(() => {
  const total = Object.values(statusCounts.value).reduce((a, b) => a + b, 0)
  return Object.entries(oaColors).map(([key, color]) => ({
    key,
    label: oaLabel(key),
    count: statusCounts.value[key] || 0,
    color,
    pct: total > 0 ? ((statusCounts.value[key] || 0) / total) * 100 : 0
  }))
})

const maxCost = computed(() => {
  if (!store.apcEstimate?.breakdownByYear) return 0
  const vals = Object.values(store.apcEstimate.breakdownByYear)
  return Math.max(...vals.map(d => d.totalCost), 0)
})

const pctWithPrice = computed(() => {
  const est = store.filteredApc
  if (!est || est.totalPublications === 0) return 0
  return Math.round((est.publicationsWithPrice / est.totalPublications) * 100)
})

function formatNum(n: number) {
  return new Intl.NumberFormat('es-ES').format(n)
}
</script>

<template>
  <div v-if="store.institution" class="fade-in-up">

    <button @click="router.push('/institutions')"
      class="btn btn-link text-decoration-none p-0 mb-3 d-inline-flex align-items-center gap-1 back-link">
      <i class="bi bi-arrow-left"></i>
      Volver a universidades
    </button>

    <div class="detail-header">
      <div>
        <h1 class="detail-title">{{ store.institution.name }}</h1>
        <div class="detail-meta">
          <a :href="store.institution.rorId" target="_blank" class="text-mono small text-primary text-decoration-none">
            {{ store.institution.rorId }}
          </a>
          <span v-if="store.institution.rebiunCode" class="detail-sep">·</span>
          <span v-if="store.institution.rebiunCode" class="small text-muted fw-medium">{{ store.institution.rebiunCode }}</span>
          <span class="detail-sep">·</span>
          <span class="badge" :class="store.institution.oaiStatus === 'ACTIVE' ? 'text-bg-success' :
            store.institution.oaiStatus === 'DEGRADED' ? 'text-bg-warning' : 'text-bg-danger'">
            {{ store.institution.oaiStatus }}
          </span>
        </div>
      </div>

      <div class="d-flex align-items-center gap-2">
        <button @click="showHarvestModal = true" :disabled="harvesting"
          class="btn btn-outline-success btn-sm">
          <i v-if="harvesting" class="bi bi-arrow-repeat spinner-border spinner-border-sm me-1"></i>
          <i v-else class="bi bi-cloud-download me-1"></i>
          {{ harvesting ? 'Cosechando...' : 'Cosechar OpenAlex' }}
        </button>
        <button @click="calculateApc" :disabled="calculatingApc"
          class="btn btn-outline-primary btn-sm">
          <i v-if="calculatingApc" class="bi bi-arrow-repeat spinner-border spinner-border-sm me-1"></i>
          <i v-else class="bi bi-calculator me-1"></i>
          {{ calculatingApc ? 'Calculando...' : 'Calcular APC' }}
        </button>
        <a           :href="`/api/institutions/${route.params.id}/export${store.selectedYear && store.selectedYear !== 'all' ? '?year=' + store.selectedYear : ''}`"
          class="btn btn-outline-secondary btn-sm" download>
          <i class="bi bi-download me-1"></i>CSV
        </a>
        <select :value="store.selectedYear" @change="store.setYear(($event.target as HTMLSelectElement).value)"
          class="form-select form-select-sm" style="width:auto">
          <option v-for="y in store.availableYears" :key="y" :value="y">{{ y }}</option>
          <option value="all">Todos los años</option>
        </select>
      </div>
    </div>

    <div v-if="store.loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
      <p class="text-muted mt-2">Cargando datos de la institución...</p>
    </div>

    <div v-else-if="store.error" class="alert alert-danger text-center">
      <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ store.error }}
      <button @click="router.push('/')" class="btn btn-outline-danger btn-sm ms-3">Volver al listado</button>
    </div>

    <template v-else>

      <div class="row g-3 mb-4">
        <div class="col-sm-4">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex align-items-center gap-2 mb-2">
                <span class="d-inline-flex align-items-center justify-content-center rounded bg-primary bg-opacity-10"
                  style="width:32px;height:32px">
                  <i class="bi bi-file-text text-primary"></i>
                </span>
                <small class="text-muted fw-medium">Publicaciones</small>
              </div>
              <p class="h3 fw-bold mb-0">{{ formatNum(store.filteredSummary?.totalPublications ?? 0) }}</p>
              <small class="text-muted">{{ store.selectedYear === 'all' ? 'Total acumulado' : 'Año ' + store.selectedYear }}</small>
            </div>
          </div>
        </div>

        <div class="col-sm-4">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex align-items-center gap-2 mb-2">
                <span class="d-inline-flex align-items-center justify-content-center rounded"
                  :class="(store.filteredSummary?.oaPercentage ?? 0) >= 70 ? 'bg-success bg-opacity-10' : 'bg-warning bg-opacity-10'"
                  style="width:32px;height:32px">
                  <i class="bi bi-check-circle" :class="(store.filteredSummary?.oaPercentage ?? 0) >= 70 ? 'text-success' : 'text-warning'"></i>
                </span>
                <small class="text-muted fw-medium">Acceso Abierto</small>
              </div>
              <p class="h3 fw-bold mb-0"
                :class="(store.filteredSummary?.oaPercentage ?? 0) >= 70 ? 'text-success' : 'text-warning'">
                {{ store.filteredSummary?.oaPercentage ?? 0 }}%
              </p>
              <small class="text-muted">{{ formatNum(store.filteredSummary?.foundInRepository ?? 0) }} publicaciones en abierto</small>
            </div>
          </div>
        </div>

        <div class="col-sm-4">
          <div class="card shadow-sm h-100">
            <div class="card-body d-flex flex-column">
              <div class="d-flex align-items-center gap-2 mb-2">
                <span class="d-inline-flex align-items-center justify-content-center rounded bg-purple bg-opacity-10"
                  style="width:32px;height:32px;background:rgba(168,85,247,0.1)">
                  <i class="bi bi-currency-euro" style="color:#a855f7"></i>
                </span>
                <small class="text-muted fw-medium">Coste APC estimado</small>
              </div>
              <div class="d-flex align-items-center gap-3">
                <div class="flex-grow-1">
                  <p class="h3 fw-bold mb-0">{{ formatEur(store.filteredApc?.totalEstimatedCost ?? 0) }}</p>
                  <small class="text-muted">{{ formatNum(store.filteredApc?.publicationsWithPrice ?? 0) }} artículos con precio</small>
                </div>
                <div class="position-relative flex-shrink-0" style="width:80px;height:80px">
                  <svg class="w-100 h-100" style="transform:rotate(-90deg)" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" stroke-width="3.5"/>
                    <circle v-if="pctWithPrice > 0" cx="18" cy="18" r="15.9" fill="none" stroke="#3b82f6" stroke-width="3.5"
                      :stroke-dasharray="pctWithPrice + ' ' + (100 - pctWithPrice)"
                      stroke-linecap="round"/>
                  </svg>
                  <div class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center">
                    <div class="text-center lh-1">
                      <span class="fw-bold" style="font-size:1.1rem">{{ pctWithPrice }}%</span>
                      <br><small class="text-muted" style="font-size:0.6rem">con prec.</small>
                    </div>
                  </div>
                </div>
              </div>
              <table class="table table-sm table-borderless mb-0 mt-2">
                <tbody>
                  <tr>
                    <td class="text-muted ps-0" style="font-size:0.8rem">Artículos con precio</td>
                    <td class="fw-semibold text-end" style="font-size:0.8rem">{{ formatNum(store.filteredApc?.publicationsWithPrice ?? 0) }}</td>
                  </tr>
                  <tr>
                    <td class="text-muted ps-0" style="font-size:0.8rem">Artículos sin precio</td>
                    <td class="fw-semibold text-end" style="font-size:0.8rem">{{ formatNum(store.filteredApc?.publicationsWithoutPrice ?? 0) }}</td>
                  </tr>
                  <tr>
                    <td class="text-muted ps-0 border-top" style="font-size:0.8rem">Coste directo estimado</td>
                    <td class="fw-semibold text-end border-top" style="font-size:0.8rem">{{ formatEur(store.filteredApc?.directCost ?? 0) }}</td>
                  </tr>
                  <tr v-if="(store.filteredApc?.coveredByAgreements ?? 0) > 0">
                    <td class="text-success ps-0" style="font-size:0.8rem">Cubierto por acuerdos</td>
                    <td class="fw-semibold text-success text-end" style="font-size:0.8rem">{{ formatEur(store.filteredApc?.coveredByAgreements ?? 0) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <h5 class="card-title fs-6 fw-semibold mb-3">Acceso Abierto</h5>
          <div class="row g-3">
            <div class="col-lg-6">
              <div class="card h-100">
                <h6 class="card-header fw-semibold py-2">Rutas de Acceso Abierto</h6>
                <div class="card-body">
                  <div v-if="statusEntries.length > 0">
                    <div v-for="(item, idx) in statusEntries" :key="item.key"
                      class="d-flex align-items-center gap-3 py-2"
                      :class="{ 'border-bottom border-light-subtle': idx < statusEntries.length - 1 }">
                      <span class="badge flex-shrink-0" :class="statusBadgeClass(item.key)"
                        style="width:72px">
                        {{ item.label }}
                      </span>
                      <small class="text-muted">{{ oaDescriptions[item.key] || '' }}</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-lg-6">
              <div class="card border h-100">
                <div class="card-body d-flex flex-column">
                  <h6 class="fw-semibold mb-3">Distribución por tipo de OA</h6>
                  <div v-if="statusEntries.length > 0">
                    <div v-for="item in statusEntries" :key="item.key" class="d-flex align-items-center gap-2 mb-2">
                      <span class="rounded-circle flex-shrink-0" style="width:10px;height:10px;background-color:item.color"></span>
                      <small class="fw-medium" style="width:72px">{{ item.label }}</small>
                      <div class="progress flex-grow-1" style="height:10px">
                        <div class="progress-bar" :style="{ width: item.pct + '%', backgroundColor: item.color }"></div>
                      </div>
                      <span class="fw-semibold small" style="width:52px;text-align:right">{{ formatNum(item.count) }}</span>
                      <small class="text-muted" style="width:40px;text-align:right">{{ item.pct.toFixed(1) }}%</small>
                    </div>
                    <div class="mt-3 flex-grow-1">
                      <OaPieChart :oaStatusCounts="statusCounts" />
                    </div>
                  </div>
                  <p v-else class="text-muted text-center small py-4">No hay datos de OA para este período</p>
                </div>
              </div>
            </div>
          </div>

          <div class="row g-3 mt-3">
            <div class="col-12">
              <div class="card border">
                <div class="card-body d-flex flex-column">
                  <h6 class="fw-semibold mb-3">Evolución del Acceso Abierto</h6>
                  <div v-if="store.oaBreakdown && Object.keys(store.oaBreakdown.yearlyOaPercentage).length > 0">
                    <div v-for="[year, pct] of Object.entries(store.oaBreakdown.yearlyOaPercentage).sort().reverse()" :key="year"
                      class="d-flex align-items-center gap-2 mb-2">
                      <small class="fw-medium text-muted" style="width:48px">{{ year }}</small>
                      <div class="progress flex-grow-1" style="height:16px">
                        <div class="progress-bar" :style="{ width: pct + '%' }"
                          :class="pct >= 70 ? 'bg-success' : pct >= 50 ? 'bg-warning' : 'bg-danger'">
                        </div>
                      </div>
                      <small class="fw-semibold" style="width:56px;text-align:right">{{ pct.toFixed(1) }}%</small>
                    </div>
                    <div class="mt-4 flex-grow-1">
                      <OaEvolutionChart :yearlyStatusCounts="store.oaBreakdown.yearlyStatusCounts" />
                    </div>
                  </div>
                  <p v-else class="text-muted text-center small py-4">Sin datos históricos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="store.apcEstimate && Object.keys(store.apcEstimate.breakdownByYear).length > 1 && store.selectedYear === 'all'"
        class="card shadow-sm mb-4">
        <div class="card-body">
          <h5 class="card-title fs-6 fw-semibold">Coste APC por año</h5>
          <div class="mt-3">
            <div v-for="[year, data] of Object.entries(store.apcEstimate.breakdownByYear).sort().reverse()" :key="year"
              class="d-flex align-items-center gap-2 mb-2">
              <small class="fw-medium text-muted" style="width:48px">{{ year }}</small>
              <div class="progress flex-grow-1" style="height:16px">
                <div class="progress-bar bg-primary" :style="{ width: maxCost > 0 ? (data.totalCost / maxCost) * 100 + '%' : '0%' }">
                </div>
              </div>
              <small class="fw-semibold" style="width:112px;text-align:right">{{ formatEur(data.totalCost) }}</small>
              <small class="text-muted" style="width:64px;text-align:right">{{ data.publicationsCount }} art.</small>
            </div>
          </div>
        </div>
      </div>

      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <h5 class="card-title fs-6 fw-semibold mb-3">Revistas</h5>
          <div v-if="journalsLoading" class="text-center py-4">
            <div class="spinner-border spinner-border-sm text-primary" role="status">
              <span class="visually-hidden">Cargando...</span>
            </div>
          </div>
          <div v-else class="row g-3">
            <div class="col-lg-6">
              <h6 class="fw-semibold small text-muted text-uppercase mb-2">Coste APC por revista</h6>
              <JournalApcBarChart :journals="journalApcData" />
            </div>
            <div class="col-lg-6">
              <h6 class="fw-semibold small text-muted text-uppercase mb-2">Top 10 revistas por volumen</h6>
              <TopJournalsChart :journals="journalTopData" />
            </div>
          </div>
        </div>
      </div>

      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <div class="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-2 mb-3">
            <h5 class="card-title fs-6 fw-semibold mb-0">Publicaciones</h5>
            <div class="d-flex gap-2">
              <select v-model="filterStatus" @change="pubsPage=0;fetchPublications()" class="form-select form-select-sm" style="width:auto">
                <option value="">Todos los estados</option>
                <option value="GOLD">Oro</option>
                <option value="HYBRID">Híbrido</option>
                <option value="GREEN">Verde</option>
                <option value="BRONZE">Bronce</option>
                <option value="DIAMOND">Diamante</option>
                <option value="CLOSED">Cerrado</option>
              </select>
              <div class="input-group input-group-sm">
                <input v-model="filterSearch" @keyup.enter="pubsPage=0;fetchPublications()" type="text" class="form-control" placeholder="Buscar título/DOI/revisa...">
                <button @click="pubsPage=0;fetchPublications()" class="btn btn-outline-secondary">
                  <i class="bi bi-search"></i>
                </button>
              </div>
            </div>
          </div>

          <div v-if="pubsLoading" class="text-center py-4">
            <div class="spinner-border spinner-border-sm text-primary" role="status">
              <span class="visually-hidden">Cargando...</span>
            </div>
          </div>

          <div v-else-if="pubs.length === 0" class="text-center py-4 text-muted">
            <i class="bi bi-journal-text" style="font-size:1.5rem"></i>
            <p class="small mt-1">No hay publicaciones para este filtro</p>
          </div>

          <div v-else class="table-responsive">
            <table class="table table-sm table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th>Título</th>
                  <th class="d-none d-md-table-cell">Revista</th>
                  <th class="text-center" style="width:80px">Año</th>
                  <th class="text-center" style="width:90px">Estado OA</th>
                  <th class="text-center d-none d-sm-table-cell" style="width:60px">Repo</th>
                  <th class="text-end d-none d-lg-table-cell" style="width:110px">APC €</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="pub in pubs" :key="pub.id">
                  <td>
                    <div class="text-truncate" style="max-width:400px">
                      <span class="small fw-medium">{{ pub.title }}</span>
                    </div>
                    <div v-if="pub.doi" class="text-truncate" style="max-width:400px">
                      <code class="small text-muted">{{ pub.doi }}</code>
                    </div>
                  </td>
                  <td class="d-none d-md-table-cell">
                    <small class="text-muted">{{ pub.journalName || '—' }}</small>
                  </td>
                  <td class="text-center small">{{ pub.publicationYear }}</td>
                  <td class="text-center">
                    <span class="badge" :class="statusBadgeClass(pub.oaStatusResolved || pub.oaStatusOpenalex)">
                      {{ oaLabel(pub.oaStatusResolved || pub.oaStatusOpenalex) }}
                    </span>
                  </td>
                  <td class="text-center d-none d-sm-table-cell">
                    <i v-if="pub.foundInRepository" class="bi bi-check-circle-fill text-success" title="En repositorio"></i>
                    <i v-else class="bi bi-x-circle-fill text-muted" title="No encontrado"></i>
                  </td>
                  <td class="text-end d-none d-lg-table-cell small">
                    <span v-if="pub.apcEstimatedEur != null" class="fw-semibold">
                      {{ formatEur(pub.apcEstimatedEur) }}
                      <i v-if="pub.apcCoveredByAgreement" class="bi bi-shield-check text-success ms-1" title="Cubierto por acuerdo"></i>
                    </span>
                    <span v-else class="text-muted">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-2 mt-3">
            <small class="text-muted">
              <span v-if="pubsTotal > 0">
                Mostrando <span class="fw-semibold">{{ pubsPage * pubsSize + 1 }}</span>
                – <span class="fw-semibold">{{ Math.min((pubsPage + 1) * pubsSize, pubsTotal) }}</span>
                de <span class="fw-semibold">{{ pubsTotal }}</span> publicaciones
              </span>
              <span v-else>Sin publicaciones</span>
            </small>
            <ul v-if="pubsPages > 1" class="pagination pagination-sm mb-0">
              <li class="page-item" :class="{ disabled: pubsPage === 0 }">
                <button class="page-link" @click="pubsPage--;fetchPublications()" :disabled="pubsPage === 0">
                  <i class="bi bi-chevron-left"></i>
                </button>
              </li>
              <li v-for="p in pubsPagesToShow()" :key="p" class="page-item"
                :class="{ disabled: p < 0, active: p === pubsPage }">
                <button class="page-link" @click="p >= 0 && (pubsPage = p) && fetchPublications()" :disabled="p < 0">
                  <span v-if="p >= 0">{{ p + 1 }}</span>
                  <span v-else>…</span>
                </button>
              </li>
              <li class="page-item" :class="{ disabled: pubsPage >= pubsPages - 1 }">
                <button class="page-link" @click="pubsPage++;fetchPublications()" :disabled="pubsPage >= pubsPages - 1">
                  <i class="bi bi-chevron-right"></i>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

    </template>
  </div>

  <div v-else-if="!store.loading" class="text-center py-5">
    <i class="bi bi-building-slash text-muted" style="font-size:2rem"></i>
    <p class="text-muted mt-2">Institución no encontrada</p>
    <button @click="router.push('/')" class="btn btn-outline-primary btn-sm">Volver al listado</button>
  </div>

  <div v-if="showHarvestModal" class="modal d-block" tabindex="-1" style="background:rgba(0,0,0,0.5)">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Cosechar desde OpenAlex</h5>
          <button type="button" class="btn-close" @click="showHarvestModal = false"></button>
        </div>
        <div class="modal-body">
          <label class="form-label">Año de publicación a cosechar</label>
          <input v-model.number="harvestYear" type="number" class="form-control" min="2000" max="2030" step="1">
          <small class="text-muted mt-1 d-block">Se descargarán todos los artículos de {{ store.institution?.name }} para este año.</small>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary btn-sm" @click="showHarvestModal = false">Cancelar</button>
          <button type="button" class="btn btn-success btn-sm" @click="runHarvest" :disabled="harvesting">
            <i v-if="harvesting" class="bi bi-arrow-repeat spinner-border spinner-border-sm me-1"></i>
            {{ harvesting ? 'Cosechando...' : 'Cosechar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-sm);
  margin-bottom: var(--space-xl);
}

@media (min-width: 576px) {
  .detail-header {
    flex-direction: row;
    align-items: center;
  }
}

.detail-title {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 0;
  color: var(--color-text-primary);
  word-break: break-word;
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
  margin-top: var(--space-xs);
}

.detail-sep {
  color: var(--color-text-muted);
  font-size: 0.8rem;
}

.back-link {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  transition: color var(--transition-fast);
}

.back-link:hover {
  color: var(--color-primary);
}

.badge-diamond {
  background-color: #a855f7 !important;
  color: #fff !important;
}
</style>
