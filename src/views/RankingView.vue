<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import RankingScatterChart from '@/components/charts/RankingScatterChart.vue'
import type { InstitutionScatterItem } from '@/stores/types'

interface RankingItem {
  institutionId: string
  institutionName: string
  totalPublications: number
  oaPercentage: number
  openAccessCount: number
  closedCount: number
}

const router = useRouter()
const ranking = ref<RankingItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const availableYears = ref<number[]>([])
const selectedYear = ref<number | null>(null)
const scatterData = ref<InstitutionScatterItem[]>([])
const scatterLoading = ref(false)

async function fetchRanking() {
  if (!selectedYear.value) {
    ranking.value = []
    return
  }
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`/api/institutions/ranking?year=${selectedYear.value}`)
    if (!res.ok) throw new Error('Error al cargar ranking')
    ranking.value = await res.json()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error desconocido'
    ranking.value = []
  } finally {
    loading.value = false
  }
}

async function fetchYears() {
  try {
    const res = await fetch('/api/institutions/ranking/years')
    if (res.ok) {
      availableYears.value = await res.json()
      if (availableYears.value.length > 0 && selectedYear.value === null) {
        selectedYear.value = availableYears.value[0]
      }
    }
  } catch (e) {
    console.error('Error fetching years:', e)
  }
}

async function fetchScatter() {
  if (!selectedYear.value) return
  scatterLoading.value = true
  try {
    const res = await fetch(`/api/institutions/stats/scatter?year=${selectedYear.value}`)
    if (!res.ok) throw new Error('Error al cargar scatter')
    scatterData.value = await res.json()
  } catch {
    scatterData.value = []
  } finally {
    scatterLoading.value = false
  }
}

watch(selectedYear, () => {
  fetchRanking()
  fetchScatter()
})

onMounted(async () => {
  await fetchYears()
})

function formatNum(n: number) {
  return new Intl.NumberFormat('es-ES').format(n)
}
</script>

<template>
  <div class="ranking-view fade-in-up">
    <div class="page-header">
      <div>
        <h1 class="page-title">Ranking nacional</h1>
        <p class="page-subtitle">Universidades ordenadas por porcentaje de Acceso Abierto</p>
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

    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-if="!selectedYear" class="text-center py-5 text-muted">
      <i class="bi bi-calendar-event" style="font-size:2rem"></i>
      <p class="mt-2">Selecciona un año para ver el ranking</p>
    </div>

    <div v-else-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
      <p class="text-muted mt-2">Cargando ranking...</p>
    </div>

    <div v-else-if="selectedYear && ranking.length === 0" class="text-center py-5 text-muted">
      <i class="bi bi-inbox" style="font-size:2rem"></i>
      <p class="mt-2">No hay datos de ranking para {{ selectedYear }}. Cosecha universidades primero.</p>
    </div>

    <template v-else>
      <div class="card">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th class="text-center" style="width:60px">#</th>
                <th>Universidad</th>
                <th class="text-center">Total artículos</th>
                <th class="text-center">Acceso Abierto</th>
                <th class="text-center d-none d-md-table-cell">Cerrados</th>
                <th class="text-center d-none d-sm-table-cell">% OA</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in ranking" :key="item.institutionId"
                @click="router.push('/institution/' + item.institutionId)"
                style="cursor:pointer">
                <td class="text-center">
                  <span class="rank-badge" :class="{ 'rank-gold': idx === 0, 'rank-silver': idx <= 3 }">
                    {{ idx + 1 }}
                  </span>
                </td>
                <td class="fw-semibold">{{ item.institutionName }}</td>
                <td class="text-center">{{ formatNum(item.totalPublications) }}</td>
                <td class="text-center">
                  <span class="oa-badge" :class="oaBadgeClass(item.oaPercentage)">
                    {{ formatNum(item.openAccessCount) }}
                  </span>
                </td>
                <td class="text-center d-none d-md-table-cell">{{ formatNum(item.closedCount) }}</td>
                <td class="text-center d-none d-sm-table-cell">
                  <div class="oa-bar-container">
                    <div class="oa-bar" :class="oaBarClass(item.oaPercentage)" :style="{ width: item.oaPercentage + '%' }"></div>
                    <span class="oa-pct">{{ item.oaPercentage }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card mt-4">
        <div class="card-body">
          <h3 class="card-title-sm">Coste APC vs % Acceso Abierto — {{ selectedYear }}</h3>
          <p class="card-subtitle">Cada burbuja representa una universidad. Tamaño = volumen de publicaciones.</p>
          <div v-if="scatterLoading" class="text-center py-4">
            <div class="spinner-border spinner-border-sm text-primary" role="status">
              <span class="visually-hidden">Cargando...</span>
            </div>
          </div>
          <RankingScatterChart v-else :data="scatterData" />
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
function oaBadgeClass(pct: number): string {
  if (pct >= 70) return 'oa-high'
  if (pct >= 50) return 'oa-mid'
  return 'oa-low'
}

function oaBarClass(pct: number): string {
  if (pct >= 70) return 'bar-high'
  if (pct >= 50) return 'bar-mid'
  return 'bar-low'
}
</script>

<style scoped>
.ranking-view {
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

/* Table styles */
.table > :not(caption) > * > * {
  padding: 0.85rem 1rem;
}

/* Rank badge */
.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 600;
  background: var(--color-surface-muted);
  color: var(--color-text-secondary);
}

.rank-gold {
  background: var(--color-warning-soft);
  color: var(--color-warning);
}

.rank-silver {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

/* OA badge */
.oa-badge {
  display: inline-block;
  padding: 0.25em 0.75em;
  border-radius: var(--radius-full);
  font-size: 0.875rem;
  font-weight: 600;
}

.oa-high {
  background: var(--color-success-soft);
  color: var(--color-success);
}

.oa-mid {
  background: var(--color-warning-soft);
  color: var(--color-warning);
}

.oa-low {
  background: var(--color-danger-soft);
  color: var(--color-danger);
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

.bar-high {
  background: var(--color-success);
}

.bar-mid {
  background: var(--color-warning);
}

.bar-low {
  background: var(--color-danger);
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
</style>
