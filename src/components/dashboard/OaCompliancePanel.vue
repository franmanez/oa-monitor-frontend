<script setup lang="ts">
import { computed } from 'vue'
import OaPieChart from '@/components/charts/OaPieChart.vue'

const props = defineProps<{
  oaStatusCounts: Record<string, number>
  overallOaPercentage: number
}>()

const oaColors: Record<string, string> = {
  DIAMOND: '#a855f7',
  GOLD: '#f59e0b',
  GREEN: '#22c55e',
  HYBRID: '#3b82f6',
  BRONZE: '#d97706',
  CLOSED: '#ef4444'
}

const oaLabels: Record<string, string> = {
  DIAMOND: 'Diamante',
  GOLD: 'Oro',
  GREEN: 'Verde',
  HYBRID: 'Híbrido',
  BRONZE: 'Bronce',
  CLOSED: 'Cerrado'
}

const oaDescriptions: Record<string, string> = {
  DIAMOND: 'Revista 100% abierta sin coste para el autor ni para el lector.',
  GOLD: 'Artículo en revista OA. El autor o su institución paga un APC.',
  GREEN: 'Versión depositada en repositorio institucional o temático.',
  HYBRID: 'Artículo OA en revista de suscripción. Se paga un APC.',
  BRONZE: 'Artículo gratuito sin licencia OA explícita. Puede retirarse.',
  CLOSED: 'Artículo bajo muro de pago. Solo accesible con suscripción.'
}

const entries = computed(() => {
  const total = Object.values(props.oaStatusCounts).reduce((a, b) => a + b, 0)
  return Object.entries(oaColors)
    .map(([key, color]) => ({
      key,
      label: oaLabels[key] || key,
      description: oaDescriptions[key] || '',
      count: props.oaStatusCounts[key] || 0,
      color,
      pct: total > 0 ? ((props.oaStatusCounts[key] || 0) / total) * 100 : 0
    }))
    .filter(e => e.count > 0)
    .sort((a, b) => b.count - a.count)
})

const pctClass = computed(() => {
  if (props.overallOaPercentage >= 70) return 'pct-high'
  if (props.overallOaPercentage >= 50) return 'pct-mid'
  return 'pct-low'
})
</script>

<template>
  <div class="oa-panel">
    <div class="panel-header">
      <h3 class="panel-title">Cumplimiento nacional de Acceso Abierto</h3>
      <div class="oa-big-number" :class="pctClass">
        {{ overallOaPercentage }}%
      </div>
      <p class="oa-big-label">de la producción científica nacional es Acceso Abierto</p>
    </div>

    <div class="panel-body">
      <div class="oa-chart-col">
        <OaPieChart :oaStatusCounts="oaStatusCounts" />
      </div>
      <div class="oa-legend-col">
        <div v-for="entry in entries" :key="entry.key" class="oa-legend-item">
          <span class="legend-dot" :style="{ backgroundColor: entry.color }"></span>
          <div class="legend-info">
            <span class="legend-label">{{ entry.label }}</span>
            <span class="legend-desc">{{ entry.description }}</span>
          </div>
          <div class="legend-stats">
            <span class="legend-count">{{ entry.count.toLocaleString('es-ES') }}</span>
            <span class="legend-pct">{{ entry.pct.toFixed(1) }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.oa-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.panel-header {
  padding: var(--space-lg) var(--space-lg) 0;
  text-align: center;
}

.panel-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-md);
}

.oa-big-number {
  font-family: var(--font-display);
  font-size: 3rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
}

.oa-big-number.pct-high {
  background: linear-gradient(135deg, var(--color-success), #059669);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.oa-big-number.pct-mid {
  background: linear-gradient(135deg, var(--color-warning), #d97706);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.oa-big-number.pct-low {
  background: linear-gradient(135deg, var(--color-danger), #dc2626);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.oa-big-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-top: var(--space-xs);
}

.panel-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: var(--space-lg);
  gap: var(--space-xl);
  align-items: start;
}

@media (max-width: 768px) {
  .panel-body {
    grid-template-columns: 1fr;
  }
}

.oa-chart-col {
  min-height: 300px;
}

.oa-legend-col {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  justify-content: center;
}

.oa-legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--color-border-light);
}

.oa-legend-item:last-child {
  border-bottom: none;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-info {
  flex: 1;
  min-width: 0;
}

.legend-label {
  display: block;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.legend-desc {
  display: block;
  font-size: 0.7rem;
  color: var(--color-text-muted);
  line-height: 1.3;
  margin-top: 1px;
}

.legend-stats {
  text-align: right;
  flex-shrink: 0;
}

.legend-count {
  display: block;
  font-size: 0.85rem;
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--color-text-primary);
}

.legend-pct {
  display: block;
  font-size: 0.7rem;
  color: var(--color-text-muted);
  margin-top: 1px;
}
</style>
