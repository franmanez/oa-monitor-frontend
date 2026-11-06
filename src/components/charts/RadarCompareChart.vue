<script setup lang="ts">
import { computed } from 'vue'
import { Radar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
)

const props = defineProps<{
  data: import('@/stores/types').HistoricalYear[]
}>()

const radarColors = [
  { bg: 'rgba(59, 130, 246, 0.2)', border: '#3b82f6' },
  { bg: 'rgba(34, 197, 94, 0.2)', border: '#22c55e' },
  { bg: 'rgba(245, 158, 11, 0.2)', border: '#f59e0b' },
  { bg: 'rgba(168, 85, 247, 0.2)', border: '#a855f7' },
  { bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444' }
]

const chartData = computed(() => {
  const labels = ['% OA amplio', '% OA fuerte', '% Repositorio', '% Cumplimiento', 'Publicaciones (normalizado)']

  // Normalizar publicaciones a 0-100
  const maxPubs = Math.max(...props.data.map(d => d.totalPublications), 1)

  const datasets = props.data.map((d, i) => {
    const color = radarColors[i % radarColors.length]
    return {
      label: d.year.toString(),
      data: [
        d.broadOaPct,
        d.strongOaPct,
        d.repositoryPct,
        d.complianceScore,
        (d.totalPublications / maxPubs) * 100
      ],
      backgroundColor: color.bg,
      borderColor: color.border,
      borderWidth: 2,
      pointBackgroundColor: color.border,
      pointRadius: 3,
      pointHoverRadius: 5
    }
  })

  return { labels, datasets }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: { usePointStyle: true, padding: 16 }
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const label = ctx.label
          if (label.includes('Publicaciones')) {
            const d = props.data[ctx.datasetIndex]
            return `${ctx.dataset.label}: ${d.totalPublications} artículos`
          }
          return `${ctx.dataset.label}: ${ctx.raw}%`
        }
      }
    }
  },
  scales: {
    r: {
      beginAtZero: true,
      max: 100,
      ticks: {
        stepSize: 20,
        callback: (value: any) => `${value}%`,
        font: { size: 10 }
      },
      pointLabels: {
        font: { size: 11 }
      }
    }
  }
}))
</script>

<template>
  <div style="height: 380px">
    <Radar v-if="data.length > 0" :data="chartData" :options="chartOptions" />
  </div>
</template>
