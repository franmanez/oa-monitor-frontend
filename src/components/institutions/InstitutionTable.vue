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
  <div v-if="institutions.length > 0" class="card shadow-sm">
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead class="table-light">
          <tr>
            <th>Universidad</th>
            <th class="d-none d-lg-table-cell">ROR ID</th>
            <th class="text-center d-none d-sm-table-cell">Artículos</th>
            <th class="text-center d-none d-md-table-cell">Última cosecha</th>
            <th class="text-center" style="width:60px"></th>
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
                <div class="d-flex align-items-center justify-content-center rounded fw-bold text-white flex-shrink-0"
                  style="width:38px;height:38px;background:linear-gradient(135deg,var(--color-primary),var(--color-secondary))">
                  {{ initials(inst.name, inst.rebiunCode) }}
                </div>
                <div class="text-truncate">
                  <p class="fw-semibold mb-0 text-truncate" style="font-size:0.88rem">{{ inst.name }}</p>
                  <div class="d-flex align-items-center gap-2">
                    <span class="small font-mono text-muted text-truncate" style="max-width:120px">
                      {{ inst.rorId.replace('https://ror.org/', '') }}
                    </span>
                    <span v-if="inst.rebiunCode" class="small text-muted fw-medium">{{ inst.rebiunCode }}</span>
                  </div>
                </div>
              </div>
            </td>

            <td class="d-none d-lg-table-cell">
              <span class="small font-mono text-muted">{{ inst.rorId.replace('https://ror.org/', '') }}</span>
            </td>

            <td class="text-center d-none d-sm-table-cell">
              <span class="fw-bold font-mono" style="font-size:0.85rem">{{ formatNum(inst.totalPublications) }}</span>
            </td>

            <td class="text-center small d-none d-md-table-cell" :class="harvestAgeClass(inst.lastHarvestAt)">
              <span class="d-inline-flex align-items-center gap-1">
                <span class="health-dot" :class="'health-dot-' + (inst.lastHarvestAt ? (harvestAgeClass(inst.lastHarvestAt) === 'harvest-fresh' ? 'active' : harvestAgeClass(inst.lastHarvestAt) === 'harvest-warn' ? 'warning' : 'danger') : 'danger')"></span>
                {{ formatDate(inst.lastHarvestAt) }}
              </span>
            </td>

            <td class="text-center">
              <i class="bi bi-chevron-right text-muted" style="font-size:0.8rem"></i>
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
.inst-row {
  cursor: pointer;
  transition: background var(--transition-fast);
}

.inst-row:hover {
  background: var(--color-surface-hover) !important;
}

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
