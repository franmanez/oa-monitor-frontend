<script setup lang="ts">
import { computed, ref } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js'
import { OA_COLORS, oaLabel } from '@/utils/oaRoutes'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const props = withDefaults(defineProps<{
  categories: string[]
  gold: number[]
  hybrid: number[]
  unitLabel?: string
  heightPx?: number
}>(), {
  unitLabel: 'artículos',
  heightPx: 360
})

// Composición de los artículos CON APC por categoría (editoriales):
// GOLD (revista de acceso abierto) frente a HYBRID (artículo liberado en
// revista de suscripción). No hay columna "abierta" porque el ranking de
// editoriales solo incluye publicaciones con APC estimado.
const mode = ref<'values' | 'percent'>('values')

const totals = computed(() => props.gold.map((g, i) => g + props.hybrid[i]))

const chartData = computed(() => {
  const mk = (key: 'GOLD' | 'HYBRID', raw: number[]) => ({
    label: oaLabel(key),
    data: raw.map((v, i) =>
      mode.value === 'percent'
        ? (totals.value[i] > 0 ? Math.round((v / totals.value[i]) * 1000) / 10 : 0)
        : v),
    backgroundColor: OA_COLORS[key],
    borderColor: OA_COLORS[key],
    borderWidth: 0,
    borderRadius: 2,
    maxBarThickness: 52,
    // Conteos absolutos para el tooltip en modo porcentaje
    _rawCounts: raw
  })
  return { labels: props.categories, datasets: [mk('GOLD', props.gold), mk('HYBRID', props.hybrid)] }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'index' as const
  },
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { usePointStyle: true, padding: 14, font: { size: 11 } }
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const count = ctx.dataset._rawCounts[ctx.dataIndex]
          const total = totals.value[ctx.dataIndex]
          const pct = total > 0 ? Math.round((count / total) * 1000) / 10 : 0
          if (mode.value === 'percent') {
            return ` ${ctx.dataset.label}: ${ctx.raw}% (${count.toLocaleString('es-ES')})`
          }
          return ` ${ctx.dataset.label}: ${count.toLocaleString('es-ES')} (${pct}%)`
        },
        footer: (items: any[]) => {
          const idx = items[0]?.dataIndex ?? 0
          return `Total con APC: ${totals.value[idx].toLocaleString('es-ES')} ${props.unitLabel}`
        }
      }
    }
  },
  scales: {
    x: {
      stacked: true,
      grid: { display: false },
      ticks: { font: { size: 11 }, autoSkip: false, maxRotation: 45, minRotation: 0 }
    },
    y: {
      stacked: true,
      beginAtZero: true,
      ...(mode.value === 'percent' ? { max: 100, ticks: { callback: (v: any) => `${v}%` } } : {}),
      title: {
        display: true,
        text: mode.value === 'percent' ? '% de artículos con APC' : props.unitLabel,
        font: { size: 11 }
      }
    }
  }
}))
</script>

<template>
  <div>
    <div class="d-flex justify-content-end mb-2">
      <div class="btn-group btn-group-sm route-toggle" role="group">
        <button type="button" class="btn" :class="mode === 'values' ? 'btn-dark' : 'btn-outline-secondary'"
          @click="mode = 'values'">Valores</button>
        <button type="button" class="btn" :class="mode === 'percent' ? 'btn-dark' : 'btn-outline-secondary'"
          @click="mode = 'percent'">Porcentaje</button>
      </div>
    </div>
    <div v-if="categories.length > 0" :style="{ height: heightPx + 'px' }">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
    <p v-else class="text-muted text-center small py-4 mb-0">Sin datos para este período</p>
    <p class="text-muted small mb-0 mt-2 text-center">
      Cada columna descompone los artículos con APC de la categoría:
      <span class="fw-semibold">Oro</span> (revista de acceso abierto) frente a
      <span class="fw-semibold">Híbrido</span> (artículo liberado en revista de suscripción)
    </p>
  </div>
</template>

<style scoped>
.route-toggle .btn {
  font-size: 0.75rem;
  padding: 0.2rem 0.75rem;
}
</style>
