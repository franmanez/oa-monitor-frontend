<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useInstitutionsStore } from '@/stores/institutions'

const router = useRouter()
const store = useInstitutionsStore()

onMounted(() => {
  store.fetchAll()
})

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

function initials(name: string, code: string | null) {
  if (code) return code
  return name.substring(0, 2).toUpperCase()
}
</script>

<template>
  <div>
    <div class="mb-4">
      <h1 class="h3 fw-bold">Universidades</h1>
      <p class="text-muted">
        Monitor de cumplimiento de Acceso Abierto
        <span class="fw-semibold">{{ store.totalElements }}</span> instituciones REBIUN
      </p>
    </div>

    <div v-if="store.error" class="alert alert-danger d-flex align-items-center gap-2">
      <i class="bi bi-exclamation-triangle-fill"></i>
      <span>{{ store.error }}</span>
      <button @click="store.fetchAll()" class="btn btn-outline-danger btn-sm ms-auto">Reintentar</button>
    </div>

    <div class="card shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>Universidad</th>
              <th class="d-none d-lg-table-cell">ROR ID</th>
              <th class="d-none d-xl-table-cell">Repositorio OAI-PMH</th>
              <th class="text-center d-none d-sm-table-cell">Artículos</th>
              <th class="text-center d-none d-md-table-cell">Última cosecha</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="inst in store.institutions"
              :key="inst.id"
              @click="router.push('/institution/' + inst.id)"
              style="cursor:pointer"
            >
              <td>
                <div class="d-flex align-items-center gap-3">
                  <div class="d-flex align-items-center justify-content-center rounded fw-bold text-white flex-shrink-0"
                    style="width:40px;height:40px;background:linear-gradient(135deg,#3b82f6,#4f46e5)">
                    {{ initials(inst.name, inst.rebiunCode) }}
                  </div>
                  <div class="text-truncate">
                    <p class="fw-semibold mb-0 text-truncate">{{ inst.name }}</p>
                    <div class="d-flex align-items-center gap-2">
                      <span class="small font-monospace text-primary-emphasis text-truncate"
                        style="max-width:120px">
                        {{ inst.rorId.replace('https://ror.org/', '') }}
                      </span>
                      <span v-if="inst.rebiunCode" class="small text-muted">{{ inst.rebiunCode }}</span>
                    </div>
                  </div>
                </div>
              </td>

              <td class="d-none d-lg-table-cell">
                <a v-if="inst.rorId" :href="inst.rorId" target="_blank"
                  class="text-decoration-none small d-inline-flex align-items-center gap-1">
                  <i class="bi bi-box-arrow-up-right"></i>
                  {{ inst.rorId.replace('https://ror.org/', '') }}
                </a>
              </td>

              <td class="d-none d-xl-table-cell">
                <a v-if="inst.oaiEndpoint" :href="inst.oaiEndpoint" target="_blank"
                  class="text-decoration-none small d-inline-flex align-items-center gap-1">
                  <i class="bi bi-link-45deg"></i>
                  <span class="text-truncate" style="max-width:180px">{{ inst.oaiEndpoint.replace('https://', '').replace('/oai/request', '') }}</span>
                </a>
                <span v-else class="small text-muted">—</span>
              </td>

              <td class="text-center d-none d-sm-table-cell">
                <span class="badge bg-light text-dark fs-6">{{ inst.totalPublications.toLocaleString('es-ES') }}</span>
              </td>

              <td class="text-center small text-muted d-none d-md-table-cell">
                {{ formatDate(inst.lastHarvestAt) }}
              </td>
            </tr>

            <tr v-if="!store.loading && store.institutions.length === 0">
              <td colspan="5" class="text-center py-5">
                <i class="bi bi-inbox text-muted" style="font-size:2rem"></i>
                <p class="text-muted mt-2">No se encontraron instituciones</p>
              </td>
            </tr>

            <tr v-if="store.loading">
              <td colspan="5" class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Cargando...</span>
                </div>
                <p class="text-muted mt-2">Cargando instituciones...</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
