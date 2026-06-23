<script setup lang="ts">
defineProps<{
  label: string
  value: string
  subtitle?: string
  icon: string
  color: string
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
}>()
</script>

<template>
  <div class="kpi-card">
    <div class="kpi-top">
      <div class="kpi-icon" :style="{ backgroundColor: color + '15', color }">
        <i :class="'bi ' + icon"></i>
      </div>
      <div v-if="trend && trendLabel" class="kpi-trend" :class="'trend-' + trend">
        <i v-if="trend === 'up'" class="bi bi-arrow-up-short"></i>
        <i v-else-if="trend === 'down'" class="bi bi-arrow-down-short"></i>
        <i v-else class="bi bi-dash"></i>
        {{ trendLabel }}
      </div>
    </div>
    <div class="kpi-value">{{ value }}</div>
    <div class="kpi-label">{{ label }}</div>
    <div v-if="subtitle" class="kpi-subtitle">{{ subtitle }}</div>
  </div>
</template>

<style scoped>
.kpi-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-card);
  transition: box-shadow var(--transition-base), transform var(--transition-base);
}

.kpi-card:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-1px);
}

.kpi-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
}

.kpi-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.kpi-trend {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.trend-up {
  color: #059669;
  background: #ecfdf5;
}

.trend-down {
  color: #dc2626;
  background: #fef2f2;
}

.trend-neutral {
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
}

.kpi-value {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--color-text-primary);
}

.kpi-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: 2px;
}

.kpi-subtitle {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 4px;
}
</style>
