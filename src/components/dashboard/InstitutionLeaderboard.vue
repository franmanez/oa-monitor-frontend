<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

defineProps<{
  institutions: Array<{
    institutionId: string
    institutionName: string
    totalPublications: number
    oaPercentage: number
    openAccessCount: number
    closedCount: number
  }>
  type: 'top' | 'bottom'
  rankOffset: number
}>()

function formatNum(n: number) {
  return new Intl.NumberFormat('es-ES').format(n)
}

function oaPctClass(pct: number) {
  if (pct >= 70) return 'pct-high'
  if (pct >= 50) return 'pct-mid'
  return 'pct-low'
}

function navigate(id: string) {
  router.push('/institution/' + id)
}
</script>

<template>
  <div class="leaderboard">
    <div class="leaderboard-header" :class="'lb-' + type">
      <i v-if="type === 'top'" class="bi bi-stars"></i>
      <i v-else class="bi bi-exclamation-triangle"></i>
      <span>{{ type === 'top' ? 'Mayor cumplimiento OA' : 'Menor cumplimiento OA' }}</span>
    </div>
    <div class="leaderboard-body">
      <div
        v-for="(inst, idx) in institutions"
        :key="inst.institutionId"
        class="lb-row"
        @click="navigate(inst.institutionId)"
      >
        <span class="lb-rank">{{ rankOffset + idx + 1 }}</span>
        <span class="lb-name">{{ inst.institutionName }}</span>
        <div class="lb-bar-wrap">
          <div class="lb-bar" :class="oaPctClass(inst.oaPercentage)" :style="{ width: inst.oaPercentage + '%' }"></div>
        </div>
        <span class="lb-pct" :class="oaPctClass(inst.oaPercentage)">{{ inst.oaPercentage }}%</span>
        <span class="lb-pubs">{{ formatNum(inst.totalPublications) }} art.</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.leaderboard {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.leaderboard-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.leaderboard-header i {
  font-size: 0.9rem;
}

.lb-top {
  background: var(--color-success-soft);
  color: #059669;
}

.lb-bottom {
  background: var(--color-danger-soft);
  color: #dc2626;
}

.leaderboard-body {
  padding: var(--space-xs) 0;
}

.lb-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.lb-row:hover {
  background: var(--color-surface-hover);
}

.lb-rank {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  width: 24px;
  text-align: center;
}

.lb-name {
  flex: 1;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.lb-bar-wrap {
  width: 80px;
  height: 6px;
  background: var(--color-border-light);
  border-radius: var(--radius-full);
  flex-shrink: 0;
  overflow: hidden;
}

.lb-bar {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width var(--transition-slow);
}

.lb-bar.pct-high { background: var(--color-success); }
.lb-bar.pct-mid { background: var(--color-warning); }
.lb-bar.pct-low { background: var(--color-danger); }

.lb-pct {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 700;
  width: 48px;
  text-align: right;
}

.lb-pct.pct-high { color: #059669; }
.lb-pct.pct-mid { color: #d97706; }
.lb-pct.pct-low { color: #dc2626; }

.lb-pubs {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  width: 56px;
  text-align: right;
}
</style>
