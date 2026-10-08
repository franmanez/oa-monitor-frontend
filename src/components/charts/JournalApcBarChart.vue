<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import type { JournalApcItem } from '@/stores/types'
import { useTheme } from '@/composables/useTheme'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const { isDark } = useTheme()
const axisColor = computed(() => (isDark.value ? '#f1f5f9' : '#000000'))

const props = defineProps<{
  journals: JournalApcItem[]
}>()

const topJournals = computed(() => {
  return props.journals.slice(0, 20)
})

const chartData = computed(() => ({
  labels: topJournals.value.map(j => {
    const name = j.journalName || j.journalIssn || 'Desconocida'
    return name.length > 40 ? name.slice(0, 38) + '…' : name
  }),
  datasets: [{
    data: topJournals.value.map(j => j.totalApcCost || 0),
    backgroundColor: topJournals.value.map((_, i) =>
      `rgba(37, 99, 235, ${0.9 - 0.6 * (i / Math.max(topJournals.value.length - 1, 1))})`
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
      title: { display: true, text: 'Coste APC estimado (€)', color: axisColor.value },
      ticks: {
        color: axisColor.value,
        callback: (v: any) => {
          if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M'
          if (v >= 1000) return (v / 1000).toFixed(0) + 'K'
          return v
        }
      }
    },
    y: {
      ticks: { font: { size: 11 }, color: axisColor.value }
    }
  },
  plugins: {
    legend: { display: false },
    datalabels: {
      color: axisColor.value,
      font: { weight: 'bold' as const, size: 11 },
      formatter: (value: number) => {
        if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M'
        if (value >= 1000) return (value / 1000).toFixed(0) + 'K'
        return value
      }
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const journal = topJournals.value[ctx.dataIndex]
          const cost = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(ctx.raw)
          return ` ${journal.publicationCount} art. — ${cost}`
        }
      }
    }
  }
}))
</script>

<template>
  <div class="position-relative" :style="{ height: Math.max(300, topJournals.length * 24 + 80) + 'px' }">
    <Bar v-if="topJournals.length > 0" :data="chartData" :options="chartOptions" />
    <div v-else class="d-flex align-items-center justify-content-center h-100 text-muted">
      <small>Sin datos APC para este período. Ejecuta "Calcular APC por artículo" primero.</small>
    </div>
  </div>
</template>
