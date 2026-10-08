<script setup lang="ts">
import type { Institution } from '@/stores/types'

defineProps<{
  institutions: Institution[]
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

function initials(name: string, code: string | null) {
  if (code) return code
  return name.substring(0, 2).toUpperCase()
}

function repoUrl(oaiEndpoint: string | null) {
  if (!oaiEndpoint) return null
  try {
    return new URL(oaiEndpoint).hostname
  } catch {
    return oaiEndpoint
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

function formatNum(n: number) {
  return new Intl.NumberFormat('es-ES').format(n)
}

function harvestAgeClass(dateStr: string | null) {
  if (!dateStr) return ''
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (days > 180) return 'harvest-old'
  if (days > 90) return 'harvest-warn'
  return 'harvest-fresh'
}
</script>

<template>
  <div v-if="institutions.length > 0" class="inst-table-wrap">
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>Universidad</th>
            <th class="d-none d-xl-table-cell">Repositorio</th>
            <th class="text-center d-none d-sm-table-cell">Artículos</th>
            <th class="text-center d-none d-md-table-cell">Última cosecha</th>
            <th class="text-center" style="width:50px"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="inst in institutions"
            :key="inst.id"
            @click="emit('select', inst.id)"
            class="inst-row"
          >
            <td>
              <div class="d-flex align-items-center gap-3">
                <div class="table-avatar">
                  {{ initials(inst.name, inst.rebiunCode) }}
                </div>
                <div class="text-truncate">
                  <p class="inst-name text-truncate">{{ inst.name }}</p>
                  <a
                    class="small font-mono text-truncate d-block inst-ror-link"
                    :href="inst.rorId"
                    target="_blank"
                    rel="noopener"
                    style="max-width:200px"
                    @click.stop
                  >{{ inst.rorId.replace('https://ror.org/', '') }}</a>
                </div>
              </div>
            </td>

            <td class="d-none d-xl-table-cell">
              <a
                v-if="repoUrl(inst.oaiEndpoint)"
                class="repo-link"
                :href="inst.oaiEndpoint || undefined"
                target="_blank"
                rel="noopener"
                @click.stop
              >
                <i class="bi bi-archive"></i>
                {{ repoUrl(inst.oaiEndpoint) }}
              </a>
              <span v-else class="text-muted small">—</span>
            </td>

            <td class="text-center d-none d-sm-table-cell">
              <span class="fw-bold font-mono inst-pubs">{{ formatNum(inst.totalPublications) }}</span>
            </td>

            <td class="text-center small d-none d-md-table-cell" :class="harvestAgeClass(inst.lastHarvestAt)">
              <span class="d-inline-flex align-items-center gap-1">
                <span class="health-dot" :class="'health-dot-' + (inst.lastHarvestAt ? (harvestAgeClass(inst.lastHarvestAt) === 'harvest-fresh' ? 'active' : harvestAgeClass(inst.lastHarvestAt) === 'harvest-warn' ? 'warning' : 'danger') : 'danger')"></span>
                {{ formatDate(inst.lastHarvestAt) }}
              </span>
            </td>

            <td class="text-center">
              <i class="bi bi-chevron-right text-muted inst-chevron"></i>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <div v-else class="empty-state">
    <i class="bi bi-building-slash empty-state-icon"></i>
    <p>No se encontraron universidades.</p>
  </div>
</template>

<style scoped>
.inst-table-wrap {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

.inst-table-wrap thead th {
  background: var(--color-surface-muted);
  border-bottom: 1px solid var(--color-border);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  padding: 0.75rem 1rem;
  white-space: nowrap;
}

.inst-table-wrap tbody td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border-light);
}

.inst-table-wrap tbody tr:last-child td {
  border-bottom: none;
}

.table-avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.8125rem;
  flex-shrink: 0;
}

.inst-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.inst-pubs {
  font-size: 0.9375rem;
  color: var(--color-text-primary);
}

.repo-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.8125rem;
  color: var(--color-accent);
  text-decoration: none;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  background: var(--color-accent-soft);
  transition: opacity var(--transition-fast);
  white-space: nowrap;
}

.repo-link:hover {
  opacity: 0.8;
}

.repo-link i {
  font-size: 0.75rem;
}

.inst-ror-link {
  color: var(--color-primary);
  text-decoration: none;
  transition: opacity var(--transition-fast);
}

.inst-ror-link:hover {
  opacity: 0.8;
}

.inst-row {
  cursor: pointer;
  transition: background var(--transition-fast);
}

.inst-row:hover {
  background: var(--color-surface-hover) !important;
}

.inst-row:hover .inst-chevron {
  color: var(--color-primary);
  transform: translateX(2px);
}

.inst-chevron {
  font-size: 0.875rem;
  transition: all var(--transition-fast);
}

.health-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.health-dot-active { background: var(--color-success); }
.health-dot-warning { background: var(--color-warning); }
.health-dot-danger { background: var(--color-danger); }

.harvest-fresh {
  color: var(--color-success);
}

.harvest-warn {
  color: var(--color-warning);
}

.harvest-old {
  color: var(--color-danger);
}
</style>
