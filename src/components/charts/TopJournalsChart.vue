<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import type { JournalCountItem } from '@/stores/types'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const props = defineProps<{
  journals: JournalCountItem[]
}>()

const topJournals = computed(() => {
  return [...props.journals].reverse()
})

const chartData = computed(() => ({
  labels: topJournals.value.map(j => {
    const name = j.journalName || j.journalIssn || 'Desconocida'
    return name.length > 40 ? name.slice(0, 38) + '…' : name
  }),
  datasets: [{
    data: topJournals.value.map(j => j.publicationCount),
    backgroundColor: topJournals.value.map((_, i) =>
      `rgba(16, 185, 129, ${0.3 + 0.6 * (i / Math.max(topJournals.value.length - 1, 1))})`
    ),
    borderWidth: 0,
    borderRadius: 3
  }]
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  scales: {
    x: {
      title: { display: true, text: 'Publicaciones' },
      beginAtZero: true
    },
    y: {
      ticks: { font: { size: 11 } }
    }
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: any) => ` ${ctx.raw} publicaciones`
      }
    }
  }
}))
</script>

<template>
  <div class="position-relative" :style="{ height: Math.max(300, topJournals.length * 24 + 80) + 'px' }">
    <Bar v-if="topJournals.length > 0" :data="chartData" :options="chartOptions" />
    <div v-else class="d-flex align-items-center justify-content-center h-100 text-muted">
      <small>Sin datos de revistas para este período</small>
    </div>
  </div>
</template>
