<script setup lang="ts">
// Celda compacta: texto + barra de progreso fina. Usada en % OA y Repositorio
// de la tabla "Detalle por Año". El color lo decide el padre (semáforo o ruta).
const props = withDefaults(defineProps<{
  pct: number
  label: string
  color?: string
  width?: number
}>(), {
  color: '#447032',
  width: 92
})
</script>

<template>
  <div class="pctbar">
    <span class="pctbar-label">{{ props.label }}</span>
    <div class="pctbar-track" :style="{ width: props.width + 'px' }">
      <div
        class="pctbar-fill"
        :style="{ width: Math.min(Math.max(props.pct, 0), 100) + '%', background: props.color }"
      />
    </div>
  </div>
</template>

<style scoped>
.pctbar {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.pctbar-label {
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
}

.pctbar-track {
  height: 5px;
  border-radius: var(--radius-full, 999px);
  background: var(--color-primary-soft, #eef2f7);
  overflow: hidden;
}

.pctbar-fill {
  height: 100%;
  border-radius: var(--radius-full, 999px);
  transition: width var(--transition-fast, 150ms) ease;
}
</style>
