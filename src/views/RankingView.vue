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
    <div class="view-header">
      <h1 class="view-title">Ranking nacional</h1>
      <p class="view-subtitle">Universidades ordenadas por porcentaje de Acceso Abierto</p>
    </div>

    <div class="card shadow-sm mb-4">
      <div class="card-body py-3 d-flex flex-column flex-sm-row align-items-center gap-3">
        <label class="fw-semibold text-muted small text-uppercase" style="letter-spacing:0.04em">Año:</label>
        <select v-model="selectedYear" class="form-select form-select-sm" style="width:auto;max-width:200px">
          <option :value="null" disabled>Selecciona un año</option>
          <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
        </select>
        <small v-if="availableYears.length > 0 && ranking.length > 0" class="text-muted fw-medium">
          {{ ranking.length }} universidades con datos en {{ selectedYear }}
        </small>
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

    <div v-else class="card shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
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
                <span class="badge rounded-pill"
                  :class="idx === 0 ? 'text-bg-warning' : idx <= 3 ? 'text-bg-info' : 'text-bg-light text-dark'">
                  {{ idx + 1 }}
                </span>
              </td>
              <td class="fw-semibold">{{ item.institutionName }}</td>
              <td class="text-center">{{ formatNum(item.totalPublications) }}</td>
              <td class="text-center">
                <span class="badge" :class="item.oaPercentage >= 70 ? 'text-bg-success' : item.oaPercentage >= 50 ? 'text-bg-warning' : 'text-bg-danger'">
                  {{ formatNum(item.openAccessCount) }}
                </span>
              </td>
              <td class="text-center d-none d-md-table-cell">{{ formatNum(item.closedCount) }}</td>
              <td class="text-center d-none d-sm-table-cell">
                <div class="d-flex align-items-center gap-2">
                  <div class="progress flex-grow-1" style="height:10px;max-width:100px">
                    <div class="progress-bar"
                      :class="item.oaPercentage >= 70 ? 'bg-success' : item.oaPercentage >= 50 ? 'bg-warning' : 'bg-danger'"
                      :style="{ width: item.oaPercentage + '%' }">
                    </div>
                  </div>
                  <small class="fw-semibold">{{ item.oaPercentage }}%</small>
                </div>
              </td>
            </tr>

            <tr v-if="ranking.length === 0 && selectedYear">
              <td colspan="6" class="text-center py-5 text-muted">
                <i class="bi bi-inbox" style="font-size:2rem"></i>
                <p class="mt-2">No hay datos de ranking disponibles. Cosecha alguna universidad primero.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="selectedYear" class="card shadow-sm mt-4">
      <div class="card-body">
        <h5 class="chart-section-title">Coste APC vs % Acceso Abierto — {{ selectedYear }}</h5>
        <p class="chart-section-sub">Cada burbuja representa una universidad. Tamaño = volumen de publicaciones.</p>
        <div v-if="scatterLoading" class="text-center py-4">
          <div class="spinner-border spinner-border-sm text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
        </div>
        <RankingScatterChart v-else :data="scatterData" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.ranking-view {
  max-width: 100%;
}

.view-header {
  margin-bottom: var(--space-lg);
}

.view-title {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin-bottom: 0;
}

.view-subtitle {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin-top: var(--space-xs);
}

.chart-section-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.chart-section-sub {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  margin-bottom: var(--space-md);
}
</style>
