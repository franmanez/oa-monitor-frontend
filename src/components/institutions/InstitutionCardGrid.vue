<script setup lang="ts">
import type { Institution } from '@/stores/types'
import InstitutionCard from './InstitutionCard.vue'

defineProps<{
  institutions: Institution[]
}>()

const emit = defineEmits<{
  select: [id: string]
}>()
</script>

<template>
  <div v-if="institutions.length > 0" class="card-grid">
    <InstitutionCard
      v-for="inst in institutions"
      :key="inst.id"
      :institution="inst"
      @click="emit('select', inst.id)"
    />
  </div>
  <div v-else class="empty-state">
    <i class="bi bi-building-slash empty-state-icon"></i>
    <p>No se encontraron universidades con ese criterio de búsqueda.</p>
  </div>
</template>

<style scoped>
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
}

@media (max-width: 992px) {
  .card-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 576px) {
  .card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
