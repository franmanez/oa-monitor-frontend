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
  Legend
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

const props = defineProps<{
  data: import('@/stores/types').HistoricalYear[]
}>()

const chartData = computed(() => {
  const labels = props.data.map(d => d.year.toString())
  return {
    labels,
    datasets: [
      {
        label: 'Coste APC total estimado (€)',
        data: props.data.map(d => d.totalApcCost),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 7,
        borderWidth: 2.5,
        yAxisID: 'y'
      },
      {
        label: 'APC medio por artículo (€)',
        data: props.data.map(d => d.averageApc),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: false,
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 7,
        borderWidth: 2.5,
        borderDash: [5, 5],
        yAxisID: 'y1'
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
        label: (ctx: any) => {
          const value = ctx.raw
          return `${ctx.dataset.label}: ${new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0
          }).format(value)}`
        }
      }
    }
  },
  scales: {
    y: {
      type: 'linear' as const,
      position: 'left' as const,
      beginAtZero: true,
      ticks: {
        callback: (value: any) => new Intl.NumberFormat('es-ES', {
          style: 'currency',
          currency: 'EUR',
          maximumFractionDigits: 0
        }).format(value)
      }
    },
    y1: {
      type: 'linear' as const,
      position: 'right' as const,
      beginAtZero: true,
      grid: { drawOnChartArea: false },
      ticks: {
        callback: (value: any) => new Intl.NumberFormat('es-ES', {
          style: 'currency',
          currency: 'EUR',
          maximumFractionDigits: 0
        }).format(value)
      }
    }
  }
}))
</script>

<template>
  <div style="height: 350px">
    <Line v-if="data.length > 0" :data="chartData" :options="chartOptions" />
  </div>
</template>
