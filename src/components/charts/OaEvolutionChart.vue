<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend)

const props = defineProps<{
  yearlyStatusCounts: Record<string, Record<string, number>>
}>()

const statusEntries: { key: string; color: string; label: string }[] = [
  { key: 'DIAMOND', color: '#a855f7', label: 'Diamante' },
  { key: 'GOLD', color: '#f59e0b', label: 'Oro' },
  { key: 'GREEN', color: '#22c55e', label: 'Verde' },
  { key: 'HYBRID', color: '#3b82f6', label: 'Híbrido' },
  { key: 'BRONZE', color: '#d97706', label: 'Bronce' },
  { key: 'CLOSED', color: '#ef4444', label: 'Cerrado' }
]

const sortedYears = computed(() => {
  return Object.keys(props.yearlyStatusCounts).sort()
})

const chartData = computed(() => ({
  labels: sortedYears.value,
  datasets: statusEntries.map(entry => ({
    label: entry.label,
    data: sortedYears.value.map(y => props.yearlyStatusCounts[y]?.[entry.key] || 0),
    borderColor: entry.color,
    backgroundColor: entry.color + '20',
    pointBackgroundColor: entry.color,
    pointBorderColor: '#fff',
    pointBorderWidth: 2,
    pointRadius: 5,
    pointHoverRadius: 7,
    tension: 0.3,
    borderWidth: 2.5
  }))
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false
  },
  scales: {
    x: {
      grid: { display: false },
      title: { display: true, text: 'Año' }
    },
    y: {
      title: { display: true, text: 'Publicaciones' },
      beginAtZero: true
    }
  },
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        usePointStyle: true,
        pointStyle: 'circle' as const,
        padding: 14,
        font: { size: 12 }
      }
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.raw} publicaciones`
      }
    }
  }
}))
</script>

<template>
  <div class="position-relative" style="height:360px">
    <Line v-if="sortedYears.length > 0" :data="chartData" :options="chartOptions" />
    <div v-else class="d-flex align-items-center justify-content-center h-100 text-muted">
      <small>Sin datos históricos</small>
    </div>
  </div>
</template>
