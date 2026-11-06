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

const chartData = computed(() => {
  const labels = props.data.map(d => d.year.toString())
  return {
    labels,
    datasets: [
      {
        label: 'Artículos con APC (GOLD + HYBRID)',
        data: props.data.map(d => d.articlesWithApc),
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: '#3b82f6',
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  }
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
        label: (ctx: any) => `${ctx.dataset.label}: ${ctx.raw} artículos`
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
    <Bar v-if="data.length > 0" :data="chartData" :options="chartOptions" />
  </div>
</template>
