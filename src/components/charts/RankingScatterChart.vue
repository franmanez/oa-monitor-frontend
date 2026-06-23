<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Scatter } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, Tooltip, Legend } from 'chart.js'
import type { InstitutionScatterItem } from '@/stores/types'

ChartJS.register(CategoryScale, LinearScale, PointElement, Tooltip, Legend)

const props = defineProps<{
  data: InstitutionScatterItem[]
}>()

const router = useRouter()

const chartData = computed(() => ({
  datasets: [{
    label: 'Universidades',
    data: props.data.map(item => ({
      x: item.oaPercentage,
      y: item.totalApcCost > 0 ? item.totalApcCost : null,
      institutionId: item.institutionId,
      institutionName: item.institutionName,
      totalPublications: item.totalPublications,
      hasApcData: item.hasApcData
    })),
    backgroundColor: props.data.map(item =>
      item.hasApcData ? 'rgba(37, 99, 235, 0.6)' : 'rgba(156, 163, 175, 0.4)'
    ),
    borderColor: props.data.map(item =>
      item.hasApcData ? 'rgba(37, 99, 235, 0.9)' : 'rgba(156, 163, 175, 0.6)'
    ),
    pointRadius: props.data.map(item => Math.max(4, Math.min(12, item.totalPublications / 500))),
    pointHoverRadius: props.data.map(item => Math.max(6, Math.min(16, item.totalPublications / 350)))
  }]
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      title: { display: true, text: '% Acceso Abierto' },
      min: 0,
      max: 100
    },
    y: {
      title: { display: true, text: 'Coste APC estimado (€)' },
      ticks: {
        callback: (v: any) => {
          if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M'
          if (v >= 1000) return (v / 1000).toFixed(0) + 'K'
          return v
        }
      }
    }
  },
  plugins: {
    legend: {
      labels: {
        usePointStyle: true,
        generateLabels: () => [
          { text: 'Con datos APC', fillStyle: 'rgba(37, 99, 235, 0.6)', strokeStyle: 'rgba(37, 99, 235, 0.9)', pointStyle: 'circle' as const },
          { text: 'Sin datos APC', fillStyle: 'rgba(156, 163, 175, 0.4)', strokeStyle: 'rgba(156, 163, 175, 0.6)', pointStyle: 'circle' as const }
        ]
      },
      position: 'bottom' as const
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const raw = ctx.raw
          const cost = raw.y ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(raw.y) : 'Sin APC'
          return [
            ` ${raw.institutionName}`,
            `  %OA: ${raw.x.toFixed(1)}% | Publicaciones: ${raw.totalPublications}`,
            `  APC: ${cost}`
          ]
        }
      }
    }
  },
  onClick: (_event: any, elements: any[]) => {
    if (elements.length > 0) {
      const idx = elements[0].index
      const item = props.data[idx]
      if (item) {
        router.push(`/institution/${item.institutionId}`)
      }
    }
  }
}))
</script>

<template>
  <div class="position-relative" style="height:420px">
    <Scatter v-if="data.length > 0" :data="chartData" :options="chartOptions" />
    <div v-else class="d-flex align-items-center justify-content-center h-100 text-muted">
      <small>Sin datos para este año</small>
    </div>
  </div>
</template>
