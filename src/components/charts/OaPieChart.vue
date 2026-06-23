<script setup lang="ts">
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'

ChartJS.register(ArcElement, Tooltip, ChartDataLabels)

const props = defineProps<{
  oaStatusCounts: Record<string, number>
}>()

const colors: Record<string, string> = {
  DIAMOND: '#a855f7',
  GOLD: '#f59e0b',
  GREEN: '#22c55e',
  HYBRID: '#3b82f6',
  BRONZE: '#d97706',
  CLOSED: '#ef4444'
}

const labels: Record<string, string> = {
  DIAMOND: 'Diamante',
  GOLD: 'Oro',
  GREEN: 'Verde',
  HYBRID: 'Híbrido',
  BRONZE: 'Bronce',
  CLOSED: 'Cerrado'
}

const entries = computed(() => {
  return Object.entries(colors)
    .map(([key, color]) => ({
      key,
      label: labels[key] || key,
      count: props.oaStatusCounts[key] || 0,
      color
    }))
    .filter(e => e.count > 0)
    .sort((a, b) => b.count - a.count)
})

const chartData = computed(() => {
  const total = entries.value.reduce((s, e) => s + e.count, 0)
  return {
    labels: entries.value.map(e => e.label),
    datasets: [{
      data: entries.value.map(e => e.count),
      backgroundColor: entries.value.map(e => e.color),
      borderColor: '#fff',
      borderWidth: 2,
      hoverBorderWidth: 3
    }],
    pctValues: entries.value.map(e => total > 0 ? Math.round((e.count / total) * 100) : 0)
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '55%',
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0)
          const pct = total > 0 ? Math.round((ctx.raw / total) * 100) : 0
          return ` ${ctx.label}: ${ctx.raw} (${pct}%)`
        }
      }
    },
    datalabels: {
      color: '#fff',
      font: { weight: 'bold' as const, size: 12 },
      formatter: (_value: number, ctx: any) => {
        const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0)
        const pct = total > 0 ? Math.round((ctx.dataset.data[ctx.dataIndex] / total) * 100) : 0
        return pct >= 5 ? pct + '%' : ''
      },
      display: (ctx: any) => {
        const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0)
        const pct = total > 0 ? Math.round((ctx.dataset.data[ctx.dataIndex] / total) * 100) : 0
        return pct >= 5
      }
    }
  }
}))
</script>

<template>
  <div class="position-relative" style="height:300px">
    <Doughnut v-if="entries.length > 0" :data="chartData" :options="chartOptions" />
    <div v-else class="d-flex align-items-center justify-content-center h-100 text-muted">
      <small>Sin datos para este período</small>
    </div>
  </div>
</template>
