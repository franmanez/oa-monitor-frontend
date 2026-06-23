<script setup lang="ts">
import type { Institution } from '@/stores/types'
import { computed } from 'vue'

const props = defineProps<{
  institution: Institution
}>()

const initials = computed(() => {
  if (props.institution.rebiunCode) return props.institution.rebiunCode
  return props.institution.name.substring(0, 2).toUpperCase()
})

const rorShort = computed(() => {
  return props.institution.rorId?.replace('https://ror.org/', '') || ''
})

function statusColor(status: string) {
  switch (status) {
    case 'ACTIVE': return 'var(--color-success)'
    case 'DEGRADED': return 'var(--color-warning)'
    case 'UNREACHABLE': return 'var(--color-danger)'
    default: return 'var(--color-text-muted)'
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'ACTIVE': return 'Activo'
    case 'DEGRADED': return 'Degradado'
    case 'UNREACHABLE': return 'Inaccesible'
    default: return status
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

function formatNum(n: number) {
  return new Intl.NumberFormat('es-ES').format(n)
}

const harvestDate = computed(() => formatDate(props.institution.lastHarvestAt))

const harvestAge = computed(() => {
  if (!props.institution.lastHarvestAt) return null
  const days = Math.floor((Date.now() - new Date(props.institution.lastHarvestAt).getTime()) / 86400000)
  return days
})

const harvestStatus = computed(() => {
  if (!harvestAge.value) return null
  if (harvestAge.value > 180) return 'danger'
  if (harvestAge.value > 90) return 'warning'
  return 'active'
})
</script>

<template>
  <div class="institution-card fade-in-up" @click="$emit('click', institution.id)">
    <div class="card-top">
      <div class="card-avatar" :style="{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }">
        {{ initials }}
      </div>

      <div class="card-status">
        <span class="health-dot" :class="'health-dot-' + harvestStatus"></span>
      </div>
    </div>

    <h3 class="card-name">{{ institution.name }}</h3>

    <div class="card-ids">
      <span class="card-ror font-mono">{{ rorShort }}</span>
      <span v-if="institution.rebiunCode" class="card-rebiun">{{ institution.rebiunCode }}</span>
    </div>

    <div class="card-metrics">
      <div class="metric">
        <span class="metric-value">{{ formatNum(institution.totalPublications) }}</span>
        <span class="metric-label">Artículos</span>
      </div>
      <div class="metric-divider"></div>
      <div class="metric">
        <span class="metric-value" :style="{ color: statusColor(institution.oaiStatus) }">{{ statusLabel(institution.oaiStatus) }}</span>
        <span class="metric-label">Estado</span>
      </div>
    </div>

    <div class="card-footer">
      <div v-if="harvestDate" class="harvest-info">
        <i class="bi bi-cloud-download"></i>
        <span>{{ harvestDate }}</span>
      </div>
      <div v-else class="harvest-info harvest-none">
        <i class="bi bi-cloud-slash"></i>
        <span>Sin cosechar</span>
      </div>
      <i class="bi bi-chevron-right card-chevron"></i>
    </div>
  </div>
</template>

<style scoped>
.institution-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition: all var(--transition-base);
  display: flex;
  flex-direction: column;
}

.institution-card:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
  border-color: var(--color-primary);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-md);
}

.card-avatar {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 0.85rem;
  letter-spacing: -0.01em;
}

.card-name {
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.3;
  margin: 0 0 var(--space-sm);
  color: var(--color-text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-ids {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.card-ror {
  font-size: 0.68rem;
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.card-rebiun {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.card-metrics {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) 0;
  border-top: 1px solid var(--color-border-light);
  border-bottom: 1px solid var(--color-border-light);
  margin-bottom: var(--space-sm);
}

.metric {
  display: flex;
  align-items: center;
  gap: 6px;
}

.metric-value {
  font-size: 0.85rem;
  font-weight: 700;
  font-family: var(--font-mono);
}

.metric-label {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.metric-divider {
  width: 1px;
  height: 24px;
  background: var(--color-border-light);
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.harvest-info {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.harvest-info i {
  font-size: 0.75rem;
}

.harvest-none {
  color: var(--color-text-muted);
  font-style: italic;
}

.card-chevron {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  opacity: 0;
  transform: translateX(-4px);
  transition: all var(--transition-fast);
}

.institution-card:hover .card-chevron {
  opacity: 1;
  transform: translateX(0);
  color: var(--color-primary);
}
</style>
