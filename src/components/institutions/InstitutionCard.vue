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

const repoUrl = computed(() => {
  if (!props.institution.oaiEndpoint) return null
  try {
    return new URL(props.institution.oaiEndpoint).hostname
  } catch {
    return props.institution.oaiEndpoint
  }
})

function statusLabel(status: string) {
  switch (status) {
    case 'ACTIVE': return 'Activo'
    case 'INACTIVE': return 'Inactivo'
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
  return Math.floor((Date.now() - new Date(props.institution.lastHarvestAt).getTime()) / 86400000)
})

const harvestStatus = computed(() => {
  if (!harvestAge.value) return null
  if (harvestAge.value > 180) return 'danger'
  if (harvestAge.value > 90) return 'warning'
  return 'active'
})
</script>

<template>
  <div class="inst-card" @click="$emit('click', institution.id)">
    <div class="card-body">
      <div class="card-avatar">
        {{ initials }}
      </div>

      <div class="card-content">
        <div class="card-name-row">
          <h3 class="card-name">{{ institution.name }}</h3>
          <span
            v-if="harvestStatus"
            class="health-dot"
            :class="'health-dot-' + harvestStatus"
            :title="statusLabel(institution.oaiStatus)"
          ></span>
        </div>

        <div class="card-meta">
          <a
            v-if="rorShort"
            class="meta-ror"
            :href="institution.rorId"
            target="_blank"
            rel="noopener"
            title="Ficha ROR"
            @click.stop
          >{{ rorShort }}</a>
          <a
            v-if="repoUrl"
            class="meta-repo"
            :href="institution.oaiEndpoint || undefined"
            target="_blank"
            rel="noopener"
            title="Repositorio institucional"
            @click.stop
          >
            <i class="bi bi-archive"></i>
            {{ repoUrl }}
          </a>
        </div>
      </div>

      <i class="bi bi-chevron-right card-chevron"></i>
    </div>

    <div class="card-footer">
      <div class="footer-metric">
        <span class="metric-value">{{ formatNum(institution.totalPublications) }}</span>
        <span class="metric-label">Artículos</span>
      </div>
      <div class="footer-divider"></div>
      <div class="footer-harvest">
        <template v-if="harvestDate">
          <i class="bi bi-cloud-download"></i>
          <span>{{ harvestDate }}</span>
        </template>
        <template v-else>
          <i class="bi bi-cloud-slash"></i>
          <span class="harvest-none">Sin cosechar</span>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inst-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition: box-shadow var(--transition-base), border-color var(--transition-base);
  overflow: hidden;
}

.inst-card:hover {
  box-shadow: var(--shadow-card-hover);
  border-color: var(--color-primary);
}

.inst-card:hover .card-chevron {
  opacity: 1;
  transform: translateX(0);
  color: var(--color-primary);
}

.card-body {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg);
}

.card-avatar {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-lg);
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: -0.01em;
  flex-shrink: 0;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-name-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.card-name {
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.3;
  margin: 0;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.health-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.health-dot-active { background: var(--color-success); }
.health-dot-warning { background: var(--color-warning); }
.health-dot-danger { background: var(--color-danger); }

.card-meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: 4px;
  flex-wrap: wrap;
}

.meta-ror {
  font-size: 0.75rem;
  color: var(--color-primary);
  background: var(--color-primary-soft);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-weight: 500;
  text-decoration: none;
  font-family: var(--font-mono);
  transition: opacity var(--transition-fast);
}

.meta-ror:hover {
  opacity: 0.8;
}

.meta-repo {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--color-accent);
  text-decoration: none;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background: var(--color-accent-soft);
  transition: opacity var(--transition-fast);
}

.meta-repo:hover {
  opacity: 0.8;
}

.meta-repo i {
  font-size: 0.7rem;
}

.card-chevron {
  font-size: 1rem;
  color: var(--color-text-muted);
  opacity: 0;
  transform: translateX(-4px);
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-lg);
  border-top: 1px solid var(--color-border-light);
  background: var(--color-surface-muted);
}

.footer-metric {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.metric-value {
  font-size: 1rem;
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--color-text-primary);
}

.metric-label {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.footer-divider {
  width: 1px;
  height: 20px;
  background: var(--color-border-light);
}

.footer-harvest {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-left: auto;
}

.footer-harvest i {
  font-size: 0.8rem;
}

.harvest-none {
  font-style: italic;
}
</style>
