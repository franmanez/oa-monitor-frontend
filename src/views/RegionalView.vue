<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { RegionalStats } from '@/stores/types'

const regionalData = ref<RegionalStats[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const availableYears = ref<number[]>([])
const selectedYear = ref<number | null>(null)
const showInfo = ref(false)
const expandedCommunity = ref<string | null>(null)

async function fetchYears() {
  try {
    const res = await fetch('/api/institutions/ranking/years')
    if (res.ok) {
      availableYears.value = await res.json()
      if (availableYears.value.length > 0 && selectedYear.value === null) {
        selectedYear.value = availableYears.value[0]
      }
    }
  } catch (e) { console.error('Error fetching years:', e) }
}

async function fetchRegional() {
  if (!selectedYear.value) { regionalData.value = []; return }
  loading.value = true; error.value = null
  try {
    const res = await fetch(`/api/institutions/stats/regional?year=${selectedYear.value}`)
    if (!res.ok) throw new Error('Error al cargar datos regionales')
    regionalData.value = await res.json()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error desconocido'
    regionalData.value = []
  } finally { loading.value = false }
}

watch(selectedYear, () => { fetchRegional() })
onMounted(async () => { await fetchYears() })

function formatNum(n: number) {
  return new Intl.NumberFormat('es-ES').format(n)
}

function gradeColor(score: number): string {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#3b82f6'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

function toggleExpand(community: string) {
  expandedCommunity.value = expandedCommunity.value === community ? null : community
}

const oaColors: Record<string, string> = {
  DIAMOND: '#a855f7',
  GOLD: '#f59e0b',
  GREEN: '#22c55e',
  HYBRID: '#3b82f6',
  BRONZE: '#d97706',
  CLOSED: '#ef4444'
}
</script>

<template>
  <div class="regional-view fade-in-up">
    <div class="page-header">
      <div>
        <h1 class="page-title">Análisis Regional</h1>
        <p class="page-subtitle">Compromiso con la Ciencia Abierta por Comunidad Autónoma</p>
      </div>
      <div class="page-actions">
        <div class="year-selector">
          <label class="year-label">Año</label>
          <select v-model="selectedYear" class="form-select form-select-sm">
            <option :value="null" disabled>Selecciona</option>
            <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
      </div>
    </div>

    <div class="card shadow-sm mb-4">
      <div class="card-body">
        <div class="d-flex align-items-start justify-content-between mb-1">
          <div>
            <h5 class="card-title fs-6 fw-semibold mb-1">
              <i class="bi bi-info-circle-fill me-2" style="color:#3b82f6"></i>Contexto metodológico
            </h5>
            <p class="text-muted small mb-0">
              Cómo interpretar estos datos sin comparaciones sesgadas
            </p>
          </div>
          <button class="btn btn-sm btn-outline-secondary" @click="showInfo = !showInfo" style="flex-shrink:0;font-size:0.75rem">
            <i class="bi" :class="showInfo ? 'bi-x-lg' : 'bi-chevron-down'"></i>
            {{ showInfo ? 'Cerrar' : 'Leer más' }}
          </button>
        </div>

        <div v-if="showInfo" class="regional-info-panel">
          <p class="small mb-2">
            Las comunidades autónomas tienen <strong>competencias directas en investigación y universidades</strong>.
            Analizar los datos por comunidad permite evaluar si las políticas públicas locales
            (planes regionales de I+D, financiación de repositorios, consorcios universitarios) están funcionando.
          </p>

          <h6 class="fw-semibold small mt-3 mb-2"><i class="bi bi-lightbulb me-1" style="color:#f59e0b"></i>Principios de lectura</h6>

          <div class="regional-principle">
            <strong class="small">1. Métricas relativas (%), no absolutas</strong>
            <p class="small text-muted mb-0">
              Comparar el número total de artículos de Madrid o Cataluña frente a comunidades uniprovinciales
              no aporta información útil sobre el esfuerzo de Ciencia Abierta. La clave está en los <strong>porcentajes
              de cumplimiento</strong>. Un centro pequeño puede tener un 90% de OA aunque publique 200 artículos,
              mientras que una gran universidad puede publicar 10.000 pero retener un 30% en acceso cerrado.
            </p>
          </div>

          <div class="regional-principle">
            <strong class="small">2. Composición del tejido científico</strong>
            <p class="small text-muted mb-0">
              Las rutas de Acceso Abierto varían según las áreas del conocimiento: las Ciencias de la Vida
              tienen altas tasas Gold/Hybrid, mientras que Humanidades recurre más a Diamond o Green.
              Comunidades con orientación biomédica tendrán un perfil distinto a las de mayor peso
              en ciencias sociales, <strong>sin que ello implique peor gestión</strong>.
            </p>
          </div>

          <div class="regional-principle">
            <strong class="small">3. Solo producción universitaria</strong>
            <p class="small text-muted mb-0">
              Este análisis solo incluye universidades (REBIUN). Los Organismos Públicos de Investigación
              (CSIC, institutos de investigación sanitaria) siguen mandatos y dinámicas diferentes.
              Separar la producción universitaria de la del sector sanitario y centros estatales
              es imprescindible para entender la realidad regional.
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="!selectedYear" class="text-center py-5 text-muted">
      <i class="bi bi-calendar-event" style="font-size:2rem"></i>
      <p class="mt-2">Selecciona un año para ver los datos regionales</p>
    </div>
    <div v-else-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
      <p class="text-muted mt-2">Cargando datos regionales...</p>
    </div>
    <div v-else-if="selectedYear && regionalData.length === 0" class="text-center py-5 text-muted">
      <i class="bi bi-geo-alt" style="font-size:2rem"></i>
      <p class="mt-2">No hay datos regionales para {{ selectedYear }}. Cosecha universidades primero.</p>
    </div>

    <template v-else>
      <div class="card">
        <div class="card-body">
          <h5 class="card-title-sm">% Acceso Abierto por Comunidad Autónoma — {{ selectedYear }}</h5>
          <p class="card-subtitle">Porcentaje de publicaciones en acceso abierto (todo menos CLOSED). Ordenadas de mayor a menor.</p>

          <div class="regional-simple-bars">
            <div v-for="item in regionalData" :key="item.community" class="regional-simple-bar-item">
              <div class="regional-simple-bar-row" @click="toggleExpand(item.community)">
                <div class="regional-simple-bar-label">
                  <span class="regional-simple-bar-name">{{ item.community }}</span>
                  <span class="regional-simple-bar-unis">{{ item.universityCount }} {{ item.universityCount === 1 ? 'uni.' : 'unis.' }}</span>
                </div>
                <div class="regional-simple-bar-track">
                  <div class="regional-simple-bar-fill"
                    :style="{
                      width: item.oaPercentage + '%',
                      background: item.oaPercentage >= 70 ? '#22c55e' : item.oaPercentage >= 50 ? '#f59e0b' : '#ef4444'
                    }">
                  </div>
                </div>
                <div class="regional-simple-bar-value">
                  <span class="regional-simple-bar-pct"
                    :style="{ color: item.oaPercentage >= 70 ? '#22c55e' : item.oaPercentage >= 50 ? '#f59e0b' : '#ef4444' }">
                    {{ item.oaPercentage }}%
                  </span>
                </div>
              </div>
              <div v-if="expandedCommunity === item.community" class="regional-simple-bar-detail">
                <div class="regional-detail-bar-track">
                  <div class="regional-detail-bar-segment" v-if="item.diamondPct > 0"
                    :style="{ width: item.diamondPct + '%', background: oaColors.DIAMOND }"
                    :title="'Diamond: ' + item.diamondPct + '%'"></div>
                  <div class="regional-detail-bar-segment" v-if="item.goldPct > 0"
                    :style="{ width: item.goldPct + '%', background: oaColors.GOLD }"
                    :title="'Gold: ' + item.goldPct + '%'"></div>
                  <div class="regional-detail-bar-segment" v-if="item.greenPct > 0"
                    :style="{ width: item.greenPct + '%', background: oaColors.GREEN }"
                    :title="'Green: ' + item.greenPct + '%'"></div>
                  <div class="regional-detail-bar-segment" v-if="item.hybridPct > 0"
                    :style="{ width: item.hybridPct + '%', background: oaColors.HYBRID }"
                    :title="'Hybrid: ' + item.hybridPct + '%'"></div>
                  <div class="regional-detail-bar-segment" v-if="item.bronzePct > 0"
                    :style="{ width: item.bronzePct + '%', background: oaColors.BRONZE }"
                    :title="'Bronze: ' + item.bronzePct + '%'"></div>
                  <div class="regional-detail-bar-segment" v-if="item.closedPct > 0"
                    :style="{ width: item.closedPct + '%', background: oaColors.CLOSED }"
                    :title="'Closed: ' + item.closedPct + '%'"></div>
                </div>
                <div class="regional-detail-legend">
                  <span class="small text-muted">Distribución:
                    <span v-if="item.diamondPct > 0" class="me-2"><span class="regional-detail-dot" :style="{ background: oaColors.DIAMOND }"></span>Diamond {{ item.diamondPct }}%</span>
                    <span v-if="item.goldPct > 0" class="me-2"><span class="regional-detail-dot" :style="{ background: oaColors.GOLD }"></span>Gold {{ item.goldPct }}%</span>
                    <span v-if="item.greenPct > 0" class="me-2"><span class="regional-detail-dot" :style="{ background: oaColors.GREEN }"></span>Green {{ item.greenPct }}%</span>
                    <span v-if="item.hybridPct > 0" class="me-2"><span class="regional-detail-dot" :style="{ background: oaColors.HYBRID }"></span>Hybrid {{ item.hybridPct }}%</span>
                    <span v-if="item.bronzePct > 0" class="me-2"><span class="regional-detail-dot" :style="{ background: oaColors.BRONZE }"></span>Bronze {{ item.bronzePct }}%</span>
                    <span v-if="item.closedPct > 0"><span class="regional-detail-dot" :style="{ background: oaColors.CLOSED }"></span>Closed {{ item.closedPct }}%</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card mt-4">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Comunidad</th>
                <th class="text-center" style="width:80px">Universidades</th>
                <th class="text-center d-none d-md-table-cell">Publicaciones</th>
                <th class="text-center">OA fuerte</th>
                <th class="text-center d-none d-md-table-cell">Depósito repo</th>
                <th class="text-center">% OA amplio</th>
                <th class="text-center" style="width:60px">Nota</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="item in regionalData" :key="item.community">
                <tr @click="toggleExpand(item.community)"
                  class="regional-row" :class="{ 'regional-row-expanded': expandedCommunity === item.community }"
                  style="cursor:pointer">
                  <td class="fw-semibold">{{ item.community }}</td>
                  <td class="text-center">
                    <span class="regional-uni-count">{{ item.universityCount }}</span>
                  </td>
                  <td class="text-center d-none d-md-table-cell text-muted small">
                    {{ formatNum(item.totalPublications) }}
                  </td>
                  <td class="text-center">
                    <div class="regional-metric">
                      <small class="fw-bold" :style="{ color: item.strongOaPct >= 70 ? '#22c55e' : item.strongOaPct >= 50 ? '#f59e0b' : '#ef4444' }">
                        {{ item.strongOaPct }}%
                      </small>
                    </div>
                  </td>
                  <td class="text-center d-none d-md-table-cell">
                    <small class="fw-bold" :style="{ color: item.repositoryPct >= 70 ? '#22c55e' : item.repositoryPct >= 50 ? '#f59e0b' : '#ef4444' }">
                      {{ item.repositoryPct }}%
                    </small>
                  </td>
                  <td class="text-center">
                    <div class="oa-bar-container">
                      <div class="oa-bar" :style="{ width: item.oaPercentage + '%', background: item.oaPercentage >= 70 ? '#22c55e' : item.oaPercentage >= 50 ? '#f59e0b' : '#ef4444' }"></div>
                      <span class="oa-pct">{{ item.oaPercentage }}%</span>
                    </div>
                  </td>
                  <td class="text-center">
                    <span class="regional-grade" :style="{ background: gradeColor(item.complianceScore), color: '#fff' }">
                      {{ item.complianceGrade }}
                    </span>
                  </td>
                </tr>
                <tr v-if="expandedCommunity === item.community" class="regional-detail-row">
                  <td colspan="7">
                    <div class="regional-detail-content">
                      <p class="small text-muted mb-1">
                        <strong>{{ item.community }}</strong> · {{ item.universityCount }} universidad{{ item.universityCount > 1 ? 'es' : '' }} ·
                        {{ formatNum(item.totalPublications) }} publicaciones
                      </p>
                      <p class="small mb-0">
                        Distribución completa:
                        Diamond {{ item.diamondPct }}% ·
                        Gold {{ item.goldPct }}% ·
                        Green {{ item.greenPct }}% ·
                        Hybrid {{ item.hybridPct }}% ·
                        Bronze {{ item.bronzePct }}% ·
                        Closed {{ item.closedPct }}%
                      </p>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.regional-view {
  max-width: 100%;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
  flex-wrap: wrap;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0;
  color: var(--color-text-primary);
}

.page-subtitle {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-top: 0.25rem;
}

.page-actions {
  display: flex;
  align-items: flex-end;
  gap: var(--space-md);
}

.year-selector {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.year-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.regional-info-panel {
  background: var(--bs-tertiary-bg, #f8f9fa);
  border-radius: var(--radius-lg, 12px);
  padding: var(--space-md, 1rem);
  margin-top: var(--space-md, 1rem);
  border: 1px solid var(--color-border, #e5e7eb);
}

.regional-principle {
  margin-bottom: 0.75rem;
  padding-left: 0.5rem;
  border-left: 2px solid var(--color-border, #e5e7eb);
}

.regional-principle p {
  padding-left: 0;
}

/* Barras simples por %OA */
.regional-simple-bars {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.regional-simple-bar-item {
  border-radius: 8px;
  transition: background 0.15s ease;
}

.regional-simple-bar-item:hover {
  background: var(--bs-tertiary-bg, #f8f9fa);
}

.regional-simple-bar-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  user-select: none;
}

.regional-simple-bar-label {
  min-width: 150px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.regional-simple-bar-name {
  font-size: 0.825rem;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.regional-simple-bar-unis {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.regional-simple-bar-track {
  flex: 1;
  height: 22px;
  border-radius: 6px;
  background: var(--color-surface-muted, #f3f4f6);
  overflow: hidden;
  position: relative;
}

.regional-simple-bar-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.4s ease;
  min-width: 4px;
}

.regional-simple-bar-value {
  min-width: 52px;
  text-align: right;
  flex-shrink: 0;
}

.regional-simple-bar-pct {
  font-weight: 700;
  font-size: 0.95rem;
}

/* Detalle expandido de distribución */
.regional-simple-bar-detail {
  padding: 0.5rem 0.75rem 0.75rem;
  margin: 0 0.5rem 0.5rem;
  background: var(--bs-tertiary-bg, #f8f9fa);
  border-radius: 6px;
  border: 1px solid var(--color-border, #e5e7eb);
}

.regional-detail-bar-track {
  display: flex;
  height: 24px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--color-surface-muted, #f3f4f6);
  margin-bottom: 0.5rem;
}

.regional-detail-bar-segment {
  height: 100%;
  min-width: 3px;
  transition: width 0.3s ease;
}

.regional-detail-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0;
  line-height: 1.8;
}

.regional-detail-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  margin-right: 3px;
  vertical-align: middle;
}

/* Table */
.table > :not(caption) > * > * {
  padding: 0.85rem 1rem;
}

.regional-row:hover {
  background: var(--bs-tertiary-bg, #f8f9fa);
}

.regional-row-expanded {
  background: var(--bs-tertiary-bg, #f8f9fa) !important;
}

.regional-uni-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-surface-muted, #f3f4f6);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.regional-grade {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 28px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 800;
}

.regional-detail-row td {
  padding: 0 !important;
  border-top: none;
}

.regional-detail-content {
  padding: 0.75rem 1rem 1rem;
  background: var(--bs-tertiary-bg, #f8f9fa);
  border-top: 1px dashed var(--color-border, #e5e7eb);
}

/* OA bar */
.oa-bar-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.oa-bar {
  height: 8px;
  border-radius: var(--radius-full);
  flex: 1;
  max-width: 100px;
}

.oa-pct {
  font-size: 0.875rem;
  font-weight: 600;
  min-width: 48px;
  text-align: right;
}

.card-title-sm {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 0.25rem;
}

.card-subtitle {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-md);
}

@media (max-width: 768px) {
  .regional-simple-bar-label {
    min-width: 90px;
  }
  .regional-simple-bar-name {
    font-size: 0.75rem;
  }
  .regional-simple-bar-unis {
    display: none;
  }
  .regional-simple-bar-track {
    height: 16px;
  }
  .regional-simple-bar-pct {
    font-size: 0.8rem;
  }
  .regional-detail-bar-track {
    height: 18px;
  }
  .regional-detail-legend {
    font-size: 0.7rem;
  }
}
</style>
