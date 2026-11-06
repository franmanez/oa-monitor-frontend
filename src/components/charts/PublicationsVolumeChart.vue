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
  data: import('@/stores/types').HistoricalYear[]
}>()

const chartData = computed(() => {
  const labels = props.data.map(d => d.year.toString())
  return {
    labels,
    datasets: [
      {
        label: 'Total publicaciones',
        data: props.data.map(d => d.totalPublications),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 7,
        borderWidth: 2.5
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
      display: false
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => `${ctx.raw} artículos publicados`
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { precision: 0 }
    }
  }
}))
</script>

<template>
  <div style="height: 300px">
    <Line v-if="data.length > 0" :data="chartData" :options="chartOptions" />
  </div>
</template>
