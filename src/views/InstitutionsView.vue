<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useInstitutionsStore } from '@/stores/institutions'
import InstitutionsToolbar from '@/components/institutions/InstitutionsToolbar.vue'
import InstitutionCardGrid from '@/components/institutions/InstitutionCardGrid.vue'
import InstitutionTable from '@/components/institutions/InstitutionTable.vue'

const router = useRouter()
const store = useInstitutionsStore()

const search = ref('')
const viewMode = ref<'cards' | 'table'>('cards')

const filteredInstitutions = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return store.institutions
  return store.institutions.filter(i =>
    i.name.toLowerCase().includes(q) ||
    (i.rorId && i.rorId.toLowerCase().includes(q)) ||
    (i.rebiunCode && i.rebiunCode.toLowerCase().includes(q))
  )
})

function selectInstitution(id: string) {
  router.push('/institution/' + id)
}

onMounted(() => {
  store.fetchAll()
})
</script>

<template>
  <div class="institutions-view fade-in-up">
    <div class="view-header">
      <h1 class="h2 fw-bold">Universidades</h1>
      <p class="text-muted">Monitor de cumplimiento de Acceso Abierto</p>
    </div>

    <InstitutionsToolbar
      v-model:search="search"
      v-model:viewMode="viewMode"
      :totalElements="store.totalElements"
      :filteredCount="filteredInstitutions.length"
    />

    <div v-if="store.error" class="alert alert-danger d-flex align-items-center gap-2">
      <i class="bi bi-exclamation-triangle-fill"></i>
      <span>{{ store.error }}</span>
      <button @click="store.fetchAll()" class="btn btn-outline-danger btn-sm ms-auto">Reintentar</button>
    </div>

    <div v-if="store.loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
      <p class="text-muted mt-2">Cargando universidades...</p>
    </div>

    <div v-else-if="store.institutions.length === 0 && !store.error" class="empty-state">
      <i class="bi bi-inbox empty-state-icon"></i>
      <p>No se encontraron universidades registradas.</p>
    </div>

    <template v-else>
      <InstitutionCardGrid
        v-if="viewMode === 'cards'"
        :institutions="filteredInstitutions"
        @select="selectInstitution"
      />
      <InstitutionTable
        v-else
        :institutions="filteredInstitutions"
        @select="selectInstitution"
      />
    </template>
  </div>
</template>

<style scoped>
.institutions-view {
  max-width: 100%;
}

.view-header {
  margin-bottom: var(--space-lg);
}

.view-header h1 {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin-bottom: 0;
}

.view-header p {
  font-size: 0.9rem;
  margin-top: var(--space-xs);
}
</style>
