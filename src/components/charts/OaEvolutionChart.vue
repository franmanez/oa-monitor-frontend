<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import type { HistoricalYear } from '@/stores/types'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const props = defineProps<{
  data: HistoricalYear[]
}>()

const chartData = computed(() => {
  const labels = props.data.map(d => d.year.toString())
  return {
    labels,
    datasets: [
      {
        label: 'OA amplio (todo menos cerrado)',
        data: props.data.map(d => d.broadOaPct),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2
      },
      {
        label: 'OA fuerte (DIAMOND+GOLD+GREEN)',
        data: props.data.map(d => d.strongOaPct),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2
      },
      {
        label: 'Depósito en repositorio',
        data: props.data.map(d => d.repositoryPct),
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2
      }
    ]
  }
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
      labels: { usePointStyle: true, padding: 16 }
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => `${ctx.dataset.label}: ${ctx.raw}%`
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      max: 100,
      ticks: { callback: (value: any) => `${value}%` }
    }
  }
}))
</script>

<template>
  <div style="height: 350px">
    <Line v-if="data.length > 0" :data="chartData" :options="chartOptions" />
  </div>
</template>
