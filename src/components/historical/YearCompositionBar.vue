<script setup lang="ts">
import { computed } from 'vue'
import { OA_COLORS, OA_ROUTE_ORDER, oaLabel } from '@/utils/oaRoutes'

// Barra apilada compacta (100 % del total del año) con la composición por
// ruta OA. Consumo obligatorio de la paleta canónica: prohibido hardcodear hex.
const props = withDefaults(defineProps<{
  segments: Record<string, number>
  total: number
  height?: number
  maxWidth?: number
}>(), {
  height: 12,
  maxWidth: 170
})

const parts = computed(() => {
  if (props.total <= 0) return []
  return Object.entries(props.segments)
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => OA_ROUTE_ORDER.indexOf(a as typeof OA_ROUTE_ORDER[number]) - OA_ROUTE_ORDER.indexOf(b as typeof OA_ROUTE_ORDER[number]))
    .map(([route, count]) => ({
      route,
      count,
      pct: Math.round((count / props.total) * 1000) / 10,
      color: OA_COLORS[route]
    }))
})
</script>

<template>
  <div v-if="parts.length > 0" class="comp-bar" :style="{ height: height + 'px', maxWidth: maxWidth + 'px' }" :title="parts.map(p => `${oaLabel(p.route)}: ${p.count} (${p.pct} %)`).join(' · ')">
    <div
      v-for="p in parts"
      :key="p.route"
      class="comp-seg"
      :style="{ width: (p.count / total) * 100 + '%', background: p.color }"
    />
  </div>
  <span v-else class="text-muted small">—</span>
</template>

<style scoped>
.comp-bar {
  display: flex;
  width: 100%;
  max-width: 170px;
  height: 12px;
  margin: 0 auto;
  border-radius: var(--radius-full, 999px);
  overflow: hidden;
  background: var(--color-primary-soft, #eef2f7);
}

.comp-seg {
  height: 100%;
  min-width: 2px;
}

.comp-seg:first-child {
  border-radius: 0;
}

.comp-seg:last-child {
  border-radius: 0;
}
</style>
