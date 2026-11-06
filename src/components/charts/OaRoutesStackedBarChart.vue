<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

const props = defineProps<{
  data: import('@/stores/types').HistoricalYear[]
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

const statuses = ['DIAMOND', 'GOLD', 'GREEN', 'HYBRID', 'BRONZE', 'CLOSED']

const chartData = computed(() => {
  const labels = props.data.map(d => d.year.toString())

  const datasets = statuses.map(status => {
    const key = status.toLowerCase() + 'Count' as keyof import('@/stores/types').HistoricalYear
    return {
      label: oaLabels[status],
      data: props.data.map(d => {
        const total = d.totalPublications
        const count = d[key] as number
        return total > 0 ? Math.round((count / total) * 1000) / 10 : 0
      }),
      backgroundColor: oaColors[status],
      borderColor: oaColors[status],
      borderWidth: 0,
      borderRadius: 2
    }
  })

  return { labels, datasets }
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
      position: 'top' as const,
      labels: { usePointStyle: true, padding: 12, font: { size: 11 } }
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => `${ctx.dataset.label}: ${ctx.raw}%`
      }
    }
  },
  scales: {
    x: {
      stacked: true,
      grid: { display: false }
    },
    y: {
      stacked: true,
      beginAtZero: true,
      max: 100,
      ticks: { callback: (value: any) => `${value}%` }
    }
  }
}))
</script>

<template>
  <div style="height: 350px">
    <Bar v-if="data.length > 0" :data="chartData" :options="chartOptions" />
  </div>
</template>
