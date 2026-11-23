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
  counts: Record<string, number>[]
  unitLabel?: string
  heightPx?: number
}>(), {
  unitLabel: 'artículos',
  heightPx: 360
})

// Dos columnas por categoría:
//  - "open": Verde + Diamante → abierto sin coste de publicación (sin APC)
//  - "paid": Oro + Híbrido (OA pagado con APC) + Bronce + Cerrado
//    (sin apertura garantizada: lectura gratuita reversible o muro de pago)
// Los colores y la leyenda siguen siendo los de cada ruta OA individual.
const ROUTE_GROUPS = [
  { stack: 'open', routes: ['GREEN', 'DIAMOND'] },
  { stack: 'paid', routes: ['GOLD', 'HYBRID', 'BRONZE', 'CLOSED'] }
] as const

// Subgrupos para el desglose del footer del tooltip
const APC_ROUTES = ['GOLD', 'HYBRID'] as const
const LIMITED_ROUTES = ['BRONZE', 'CLOSED'] as const

const mode = ref<'values' | 'percent'>('values')

const totals = computed(() =>
  props.counts.map(c => ROUTE_GROUPS.reduce(
    (s, g) => s + g.routes.reduce((t, r) => t + (c[r] || 0), 0), 0))
)

const groupTotals = computed(() => {
  const sum = (c: Record<string, number>, routes: readonly string[]) =>
    routes.reduce((t, r) => t + (c[r] || 0), 0)
  return {
    open: props.counts.map(c => sum(c, ROUTE_GROUPS[0].routes)),
    apc: props.counts.map(c => sum(c, APC_ROUTES)),
    limited: props.counts.map(c => sum(c, LIMITED_ROUTES))
  }
})

const chartData = computed(() => {
  const datasets = ROUTE_GROUPS.flatMap(group =>
    group.routes.map(status => {
      const color = OA_COLORS[status]
      return {
        label: oaLabel(status),
        data: props.counts.map((c, i) => {
          const count = c[status] || 0
          if (mode.value === 'percent') {
            const t = totals.value[i]
            return t > 0 ? Math.round((count / t) * 1000) / 10 : 0
          }
          return count
        }),
        backgroundColor: color,
        borderColor: color,
        borderWidth: 0,
        borderRadius: 2,
        stack: group.stack,
        maxBarThickness: 52,
        // Pareja compacta: sin hueco entre las dos columnas de una misma
        // categoría; la separación grande es siempre entre categorías
        categoryPercentage: 0.5,
        barPercentage: 1,
        // Guardar los conteos absolutos para el tooltip en modo porcentaje
        _rawCounts: props.counts.map(c => c[status] || 0)
      }
    })
  ).filter(ds => ds.data.some(v => v > 0))

  return { labels: props.categories, datasets }
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
          return ` ${ctx.dataset.label}: ${count.toLocaleString('es-ES')} (${ctx.raw}%)`
        },
        footer: (items: any[]) => {
          const idx = items[0]?.dataIndex ?? 0
          const total = totals.value[idx]
          const fmt = (n: number) => n.toLocaleString('es-ES')
          const pct = (n: number) =>
            total > 0 ? ` (${Math.round((n / total) * 1000) / 10} %)` : ''
          const open = groupTotals.value.open[idx]
          const apc = groupTotals.value.apc[idx]
          const limited = groupTotals.value.limited[idx]
          return [
            `Abierto sin APC (Verde + Diamante): ${fmt(open)}${pct(open)}`,
            `Con APC (Oro + Híbrido): ${fmt(apc)}${pct(apc)}`,
            `Sin apertura garantizada (Bronce + Cerrado): ${fmt(limited)}${pct(limited)}`,
            `Total: ${fmt(total)} ${props.unitLabel}`
          ]
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
        text: mode.value === 'percent' ? '% del total de la categoría' : props.unitLabel,
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
      Cada categoría muestra dos columnas: <span class="fw-semibold">abierto sin coste de publicación</span> (Verde + Diamante)
      y <span class="fw-semibold">con APC (Oro + Híbrido) o sin apertura garantizada (Bronce + Cerrado)</span>
    </p>
  </div>
</template>

<style scoped>
.route-toggle .btn {
  font-size: 0.75rem;
  padding: 0.2rem 0.75rem;
}
</style>
