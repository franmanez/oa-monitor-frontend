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
        label: 'Score de cumplimiento',
        data: props.data.map(d => d.complianceScore),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 7,
        borderWidth: 2.5,
        pointBackgroundColor: props.data.map(d => {
          if (d.complianceScore >= 80) return '#22c55e'
          if (d.complianceScore >= 60) return '#3b82f6'
          if (d.complianceScore >= 40) return '#f59e0b'
          return '#ef4444'
        }),
        pointBorderColor: '#fff',
        pointBorderWidth: 2
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
        title: (ctx: any) => {
          const year = ctx[0].label
          const grade = props.data.find(d => d.year.toString() === year)?.complianceGrade || ''
          return `Año ${year} — Nota: ${grade}`
        },
        label: (ctx: any) => `Score: ${ctx.raw} / 100`
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      max: 100,
      ticks: {
        callback: (value: any) => `${value}`,
        stepSize: 20
      }
    }
  }
}))
</script>

<template>
  <div style="height: 300px">
    <Line v-if="data.length > 0" :data="chartData" :options="chartOptions" />
  </div>
</template>
