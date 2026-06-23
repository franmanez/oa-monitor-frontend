<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useDashboardStats } from '@/composables/useDashboardStats'
import OverviewKpiCard from '@/components/dashboard/OverviewKpiCard.vue'
import OaCompliancePanel from '@/components/dashboard/OaCompliancePanel.vue'
import InstitutionLeaderboard from '@/components/dashboard/InstitutionLeaderboard.vue'
import RankingScatterChart from '@/components/charts/RankingScatterChart.vue'

const {
  stats,
  statsLoading,
  availableYears,
  selectedYear,
  ranking,
  rankingLoading,
  scatterData,
  scatterLoading,
  top5,
  bottom5,
  fetchStats,
  fetchYears
} = useDashboardStats()

onMounted(async () => {
  await Promise.all([fetchStats(), fetchYears()])
})

function formatNum(n: number) {
  return new Intl.NumberFormat('es-ES').format(n)
}

function formatEur(n: number) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(n)
}

const nationalApcTotal = computed(() => {
  return scatterData.value.reduce((sum, d) => sum + (d.totalApcCost || 0), 0)
})

</script>

<template>
  <div class="dashboard fade-in-up">

    <div class="dash-header">
      <div>
        <h1 class="dash-title">Monitor de Revistas OA</h1>
        <p class="dash-subtitle">Panel nacional de Acceso Abierto en universidades españolas</p>
      </div>
      <div class="dash-year-selector">
        <label class="year-label">Año de referencia</label>
        <select v-model="selectedYear" class="form-select form-select-sm">
          <option :value="null" disabled>—</option>
          <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
    </div>

    <div v-if="statsLoading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
      <p class="text-muted mt-2">Cargando estadísticas nacionales...</p>
    </div>

    <template v-else-if="stats">

      <div class="kpi-grid">
        <OverviewKpiCard
          icon="bi-building"
          color="var(--color-primary)"
          :value="stats.totalInstitutions.toLocaleString('es-ES')"
          label="Universidades REBIUN"
          subtitle="Monitorizadas con datos OpenAlex"
        />
        <OverviewKpiCard
          icon="bi-file-text"
          color="var(--color-secondary)"
          :value="formatNum(stats.totalPublications)"
          label="Artículos indexados"
          subtitle="Total nacional acumulado"
        />
        <OverviewKpiCard
          icon="bi-check-circle"
          color="var(--color-success)"
          :value="stats.overallOaPercentage + '%'"
          label="Acceso Abierto"
          :subtitle="formatNum(stats.totalOpenAccess) + ' artículos en abierto'"
        />
        <OverviewKpiCard
          icon="bi-currency-euro"
          color="var(--color-accent)"
          :value="formatEur(nationalApcTotal)"
          label="Coste APC estimado"
          subtitle="Suma de todas las universidades"
        />
      </div>

      <div class="section-h">
        <OaCompliancePanel
          :oaStatusCounts="stats.oaStatusCounts"
          :overallOaPercentage="stats.overallOaPercentage"
        />
      </div>

      <div class="section-h">
        <div class="row g-3">
          <div class="col-md-6">
            <div v-if="rankingLoading" class="text-center py-4">
              <div class="spinner-border spinner-border-sm text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
              </div>
            </div>
            <InstitutionLeaderboard
              v-else-if="top5.length > 0"
              :institutions="top5"
              type="top"
              :rankOffset="0"
            />
          </div>
          <div class="col-md-6">
            <div v-if="rankingLoading" class="text-center py-4">
              <div class="spinner-border spinner-border-sm text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
              </div>
            </div>
            <InstitutionLeaderboard
              v-else-if="bottom5.length > 0"
              :institutions="bottom5"
              type="bottom"
              :rankOffset="ranking.length - bottom5.length"
            />
          </div>
        </div>
      </div>

      <div class="section-h">
        <div class="card">
          <div class="card-body">
            <h3 class="chart-section-title">Coste APC vs % Acceso Abierto — {{ selectedYear }}</h3>
            <p class="chart-section-sub">Cada burbuja representa una universidad. Tamaño = volumen de artículos.</p>
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

    <div v-else class="empty-state">
      <i class="bi bi-exclamation-circle empty-state-icon"></i>
      <p>No se pudieron cargar las estadísticas nacionales.</p>
    </div>

  </div>
</template>

<style scoped>
.dashboard {
  max-width: 100%;
}

.dash-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-lg);
  margin-bottom: var(--space-2xl);
  flex-wrap: wrap;
}

.dash-title {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 0;
}

.dash-subtitle {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  margin: var(--space-xs) 0 0;
}

.dash-year-selector {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-xs);
}

.year-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

@media (max-width: 992px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 576px) {
  .kpi-grid {
    grid-template-columns: 1fr;
  }
}

.section-h {
  margin-bottom: var(--space-xl);
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
