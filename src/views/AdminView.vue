<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface AdminInstitution {
  id: string
  name: string
  rorId: string
  oaiEndpoint: string | null
  oaiStatus: string
  totalPublications: number
}

interface HarvestJob {
  id: string
  institutionCode: string
  harvestType: string
  status: string
  recordsFetched: number
  recordsUpdated: number
  errorMessage: string | null
  startedAt: string
  finishedAt: string | null
}

interface OperationResult {
  type: 'harvest' | 'oai' | 'apc' | 'import' | 'status' | 'activation'
  success: boolean
  message: string
  timestamp: Date
}

const institutions = ref<AdminInstitution[]>([])
const sortedInstitutions = computed(() => {
  const active = institutions.value
    .filter(i => i.oaiStatus === 'ACTIVE')
    .sort((a, b) => a.name.localeCompare(b.name))
  const inactive = institutions.value
    .filter(i => i.oaiStatus !== 'ACTIVE')
    .sort((a, b) => a.name.localeCompare(b.name))
  return [...active, ...inactive]
})
const selectedInstitution = ref<string>('')
const harvestYear = ref(new Date().getFullYear())
const loading = ref(false)
const harvesting = ref(false)
const harvestingOai = ref(false)
const calculatingApc = ref(false)
const importingApc = ref(false)
const updatingStatus = ref<string | null>(null)
const harvestJobs = ref<HarvestJob[]>([])
const loadingJobs = ref(false)
const operationLog = ref<OperationResult[]>([])

// Activation modal state
const showActivationModal = ref(false)
const activatingInstitution = ref<AdminInstitution | null>(null)
const activationForm = ref({
  rorId: '',
  oaiEndpoint: ''
})
const savingActivation = ref(false)

const selectedInst = computed(() =>
  institutions.value.find(i => i.id === selectedInstitution.value)
)

const canHarvestOai = computed(() =>
  selectedInst.value?.oaiEndpoint != null && selectedInst.value.oaiEndpoint !== ''
)

function addLog(result: Omit<OperationResult, 'timestamp'>) {
  operationLog.value.unshift({ ...result, timestamp: new Date() })
  if (operationLog.value.length > 20) operationLog.value.pop()
}

async function fetchInstitutions() {
  loading.value = true
  try {
    const res = await fetch('/api/admin/institutions')
    if (res.ok) {
      institutions.value = await res.json()
    }
  } finally {
    loading.value = false
  }
}

async function fetchHarvestJobs() {
  loadingJobs.value = true
  try {
    const res = await fetch('/api/harvest/jobs?page=0&size=20')
    if (res.ok) {
      const data = await res.json()
      harvestJobs.value = data.content || []
    }
  } finally {
    loadingJobs.value = false
  }
}

async function runOpenAlexHarvest() {
  if (!selectedInstitution.value) return
  harvesting.value = true
  try {
    const res = await fetch(
      `/api/harvest/trigger/${selectedInstitution.value}?year=${harvestYear.value}`,
      { method: 'POST' }
    )
    if (res.ok) {
      addLog({ type: 'harvest', success: true, message: `Cosecha OpenAlex ${harvestYear.value} iniciada para ${selectedInst.value?.name}` })
      await fetchHarvestJobs()
    } else {
      addLog({ type: 'harvest', success: false, message: `Error al iniciar cosecha: ${res.status}` })
    }
  } catch (e) {
    addLog({ type: 'harvest', success: false, message: `Error: ${e instanceof Error ? e.message : 'desconocido'}` })
  } finally {
    harvesting.value = false
  }
}

async function runOaiHarvest() {
  if (!selectedInstitution.value) return
  harvestingOai.value = true
  try {
    const res = await fetch(
      `/api/harvest/trigger-oai/${selectedInstitution.value}?year=${harvestYear.value}`,
      { method: 'POST' }
    )
    if (res.ok) {
      addLog({ type: 'oai', success: true, message: `Cosecha OAI-PMH ${harvestYear.value} iniciada para ${selectedInst.value?.name}` })
      await fetchHarvestJobs()
    } else {
      addLog({ type: 'oai', success: false, message: `Error al iniciar cosecha OAI: ${res.status}` })
    }
  } catch (e) {
    addLog({ type: 'oai', success: false, message: `Error: ${e instanceof Error ? e.message : 'desconocido'}` })
  } finally {
    harvestingOai.value = false
  }
}

async function calculateApc() {
  if (!selectedInstitution.value) return
  calculatingApc.value = true
  try {
    const res = await fetch(
      `/api/institutions/${selectedInstitution.value}/apc/calculate`,
      { method: 'POST' }
    )
    if (res.ok) {
      const data = await res.json()
      addLog({
        type: 'apc',
        success: true,
        message: `APC calculado: ${data.publicationsWithPrice}/${data.totalPublications} artículos con precio, coste total ${data.totalEstimatedCost?.toLocaleString('es-ES')}€`
      })
    } else {
      addLog({ type: 'apc', success: false, message: `Error al calcular APC: ${res.status}` })
    }
  } catch (e) {
    addLog({ type: 'apc', success: false, message: `Error: ${e instanceof Error ? e.message : 'desconocido'}` })
  } finally {
    calculatingApc.value = false
  }
}

async function importApcPrices() {
  importingApc.value = true
  try {
    const res = await fetch('/api/admin/apc/import', { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      addLog({
        type: 'import',
        success: true,
        message: `OpenAPC importado: ${data.pricesCreated} precios por año creados, ${data.rowsProcessed} filas procesadas en ${data.durationSeconds?.toFixed(1)}s`
      })
    } else {
      addLog({ type: 'import', success: false, message: `Error al importar OpenAPC: ${res.status}` })
    }
  } catch (e) {
    addLog({ type: 'import', success: false, message: `Error: ${e instanceof Error ? e.message : 'desconocido'}` })
  } finally {
    importingApc.value = false
  }
}

function openActivationModal(inst: AdminInstitution) {
  activatingInstitution.value = inst
  activationForm.value = {
    rorId: inst.rorId || '',
    oaiEndpoint: inst.oaiEndpoint || ''
  }
  showActivationModal.value = true
}

async function toggleStatus(inst: AdminInstitution) {
  if (inst.oaiStatus !== 'ACTIVE') {
    openActivationModal(inst)
    return
  }

  updatingStatus.value = inst.id
  try {
    const res = await fetch(
      `/api/admin/institutions/${inst.id}/status?status=INACTIVE`,
      { method: 'PUT' }
    )
    if (res.ok) {
      inst.oaiStatus = 'INACTIVE'
      addLog({
        type: 'status',
        success: true,
        message: `${inst.name} desactivada`
      })
    } else {
      addLog({ type: 'status', success: false, message: `Error al desactivar ${inst.name}: ${res.status}` })
    }
  } catch (e) {
    addLog({ type: 'status', success: false, message: `Error: ${e instanceof Error ? e.message : 'desconocido'}` })
  } finally {
    updatingStatus.value = null
  }
}

async function confirmActivation() {
  if (!activatingInstitution.value) return
  savingActivation.value = true

  const inst = activatingInstitution.value
  const wasActive = inst.oaiStatus === 'ACTIVE'
  try {
    const activationRes = await fetch(
      `/api/admin/institutions/${inst.id}/activation?rorId=${encodeURIComponent(activationForm.value.rorId)}&oaiEndpoint=${encodeURIComponent(activationForm.value.oaiEndpoint)}`,
      { method: 'PUT' }
    )
    if (!activationRes.ok) {
      addLog({ type: 'activation', success: false, message: `Error al guardar datos: ${activationRes.status}` })
      return
    }

    if (!wasActive) {
      const res = await fetch(
        `/api/admin/institutions/${inst.id}/status?status=ACTIVE`,
        { method: 'PUT' }
      )
      if (!res.ok) {
        addLog({ type: 'activation', success: false, message: `Error al activar ${inst.name}: ${res.status}` })
        return
      }
    }

    inst.oaiStatus = 'ACTIVE'
    inst.rorId = activationForm.value.rorId
    inst.oaiEndpoint = activationForm.value.oaiEndpoint || null
    showActivationModal.value = false
    addLog({
      type: 'activation',
      success: true,
      message: wasActive
        ? `${inst.name} actualizada correctamente`
        : `${inst.name} activada correctamente`
    })
  } catch (e) {
    addLog({ type: 'activation', success: false, message: `Error: ${e instanceof Error ? e.message : 'desconocido'}` })
  } finally {
    savingActivation.value = false
  }
}

function cancelActivation() {
  showActivationModal.value = false
  activatingInstitution.value = null
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function statusBadge(status: string): string {
  switch (status) {
    case 'COMPLETED': return 'bg-success'
    case 'RUNNING': return 'bg-primary'
    case 'FAILED': return 'bg-danger'
    case 'PENDING': return 'bg-secondary'
    default: return 'bg-secondary'
  }
}

function oaiStatusBadge(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'bg-success'
    case 'INACTIVE': return 'bg-secondary'
    case 'UNREACHABLE': return 'bg-danger'
    case 'DEGRADED': return 'bg-warning text-dark'
    default: return 'bg-secondary'
  }
}

onMounted(() => {
  fetchInstitutions()
  fetchHarvestJobs()
})
</script>

<template>
  <div class="container-fluid py-4">
    <div class="d-flex align-items-center gap-3 mb-4">
      <div class="d-inline-flex align-items-center justify-content-center rounded"
        style="width:40px;height:40px;background:rgba(99,102,241,0.1)">
        <i class="bi bi-gear-fill" style="color:#6366f1;font-size:1.2rem"></i>
      </div>
      <div>
        <h1 class="h4 fw-bold mb-0">Administración</h1>
        <small class="text-muted">Gestión de cosechas, precios APC y estado de instituciones</small>
      </div>
    </div>

    <div class="row g-4">
      <!-- Columna principal -->
      <div class="col-lg-6">
        <!-- Selector de institución y año -->
        <div class="card shadow-sm mb-4">
          <div class="card-body">
            <h5 class="card-title fs-6 fw-semibold mb-3">
              <i class="bi bi-building me-2"></i>Institución y período
            </h5>
            <div class="row g-3">
              <div class="col-md-8">
                <label class="form-label small text-muted">Universidad</label>
                <select v-model="selectedInstitution" class="form-select" :disabled="loading">
                  <option value="" disabled>Seleccionar universidad...</option>
                  <option v-for="inst in sortedInstitutions" :key="inst.id" :value="inst.id">
                    {{ inst.name }}{{ inst.oaiStatus !== 'ACTIVE' ? ' (' + inst.oaiStatus + ')' : '' }}
                  </option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label small text-muted">Año</label>
                <input v-model.number="harvestYear" type="number" class="form-control" min="2000" max="2030">
              </div>
            </div>
          </div>
        </div>

        <!-- Acciones de cosecha -->
        <div class="card shadow-sm mb-4">
          <div class="card-body">
            <h5 class="card-title fs-6 fw-semibold mb-3">
              <i class="bi bi-cloud-download me-2"></i>Cosechas
            </h5>
            <div class="d-flex flex-wrap gap-2">
              <button
                @click="runOpenAlexHarvest"
                :disabled="!selectedInstitution || harvesting"
                class="btn btn-outline-success"
              >
                <i v-if="harvesting" class="bi bi-arrow-repeat spinner-border spinner-border-sm me-1"></i>
                <i v-else class="bi bi-cloud-download me-1"></i>
                {{ harvesting ? 'Cosechando...' : 'Cosechar OpenAlex' }}
              </button>
              <button
                @click="runOaiHarvest"
                :disabled="!selectedInstitution || !canHarvestOai || harvestingOai"
                class="btn btn-outline-info"
                :title="!canHarvestOai ? 'Esta institución no tiene repositorio OAI-PMH configurado' : ''"
              >
                <i v-if="harvestingOai" class="bi bi-arrow-repeat spinner-border spinner-border-sm me-1"></i>
                <i v-else class="bi bi-building me-1"></i>
                {{ harvestingOai ? 'Cosechando...' : 'Cosechar Repositorio' }}
              </button>
              <button
                @click="calculateApc"
                :disabled="!selectedInstitution || calculatingApc"
                class="btn btn-outline-primary"
              >
                <i v-if="calculatingApc" class="bi bi-arrow-repeat spinner-border spinner-border-sm me-1"></i>
                <i v-else class="bi bi-calculator me-1"></i>
                {{ calculatingApc ? 'Calculando...' : 'Calcular APC por artículo' }}
              </button>
            </div>
            <small v-if="!canHarvestOai && selectedInstitution" class="text-muted d-block mt-2">
              <i class="bi bi-info-circle me-1"></i>
              Esta institución no tiene endpoint OAI-PMH configurado.
            </small>
          </div>
        </div>

        <!-- Import global APC -->
        <div class="card shadow-sm mb-4">
          <div class="card-body">
            <h5 class="card-title fs-6 fw-semibold mb-3">
              <i class="bi bi-currency-euro me-2"></i>Precios APC (global)
            </h5>
            <p class="text-muted small mb-3">
              Importa los precios APC desde OpenAPC. Se calcula la media por ISSN y año de publicación.
              Este proceso reemplaza todos los datos existentes de precios.
            </p>
            <button
              @click="importApcPrices"
              :disabled="importingApc"
              class="btn btn-outline-warning"
            >
              <i v-if="importingApc" class="bi bi-arrow-repeat spinner-border spinner-border-sm me-1"></i>
              <i v-else class="bi bi-download me-1"></i>
              {{ importingApc ? 'Importando...' : 'Importar precios APC (OpenAPC)' }}
            </button>
          </div>
        </div>

        <!-- Gestión de instituciones -->
        <div class="card shadow-sm mb-4">
          <div class="card-body">
            <h5 class="card-title fs-6 fw-semibold mb-3">
              <i class="bi bi-list-check me-2"></i>Gestión de instituciones
            </h5>
            <p class="text-muted small mb-3">
              Activa o desactiva instituciones. Solo las activas aparecen en el listado público.
            </p>
            <div v-if="loading" class="text-center py-3">
              <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
            </div>
            <div v-else class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Institución</th>
                    <th class="text-center">Estado</th>
                    <th class="text-end">Publicaciones</th>
                    <th class="text-center" style="width:60px">Activa</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="inst in sortedInstitutions" :key="inst.id"
                    @click="openActivationModal(inst)"
                    style="cursor:pointer">
                    <td class="fw-medium">{{ inst.name }}</td>
                    <td class="text-center">
                      <span class="badge" :class="oaiStatusBadge(inst.oaiStatus)">{{ inst.oaiStatus }}</span>
                    </td>
                    <td class="text-end text-muted small">{{ inst.totalPublications?.toLocaleString() }}</td>
                    <td class="text-center">
                      <div class="form-check form-switch d-inline-block" @click.stop>
                        <input
                          class="form-check-input"
                          type="checkbox"
                          role="switch"
                          :checked="inst.oaiStatus === 'ACTIVE'"
                          :disabled="updatingStatus === inst.id"
                          @change="toggleStatus(inst)"
                          :id="'switch-' + inst.id"
                        >
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Columna lateral derecha -->
      <div class="col-lg-6">
        <!-- Historial de cosechas -->
        <div class="card shadow-sm mb-4" style="position: sticky; top: 1rem;">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h5 class="card-title fs-6 fw-semibold mb-0">
                <i class="bi bi-clock-history me-2"></i>Historial de cosechas
              </h5>
              <button @click="fetchHarvestJobs" class="btn btn-sm btn-outline-secondary" :disabled="loadingJobs">
                <i class="bi bi-arrow-clockwise"></i>
              </button>
            </div>
            <div v-if="loadingJobs" class="text-center py-4">
              <div class="spinner-border spinner-border-sm text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
              </div>
            </div>
            <div v-else-if="harvestJobs.length === 0" class="text-center py-4 text-muted small">
              No hay cosechas registradas
            </div>
            <div v-else class="table-responsive">
              <table class="table table-sm table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th class="small">Institución</th>
                    <th class="small">Tipo</th>
                    <th class="small">Estado</th>
                    <th class="text-end small">Registros</th>
                    <th class="small">Inicio</th>
                    <th class="small">Error</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="job in harvestJobs" :key="job.id">
                    <td class="small">{{ job.institutionCode }}</td>
                    <td><span class="badge bg-light text-dark">{{ job.harvestType }}</span></td>
                    <td><span class="badge" :class="statusBadge(job.status)">{{ job.status }}</span></td>
                    <td class="text-end small">{{ job.recordsFetched?.toLocaleString() }}</td>
                    <td class="small text-muted">{{ formatTime(job.startedAt) }}</td>
                    <td class="small text-danger text-truncate" style="max-width:200px" :title="job.errorMessage ?? undefined">
                      {{ job.errorMessage || '—' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de activación -->
    <div v-if="showActivationModal" class="modal d-block" tabindex="-1" style="background:rgba(0,0,0,0.5)">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ activatingInstitution?.oaiStatus === 'ACTIVE' ? 'Editar institución' : 'Activar institución' }}</h5>
            <button type="button" class="btn-close" @click="cancelActivation"></button>
          </div>
          <div class="modal-body">
            <p class="small text-muted mb-3">
              {{ activatingInstitution?.oaiStatus === 'ACTIVE'
                ? 'Edita los datos de'
                : 'Configura los datos de' }}
              <strong>{{ activatingInstitution?.name }}</strong>
              {{ activatingInstitution?.oaiStatus === 'ACTIVE' ? '.' : 'antes de activarla.' }}
            </p>
            <div class="mb-3">
              <label class="form-label small fw-medium">Identificador ROR *</label>
              <input v-model="activationForm.rorId" type="text" class="form-control"
                placeholder="https://ror.org/03mb6wj31" required>
              <small class="text-muted">Identificador único de la institución en ROR</small>
            </div>
            <div class="mb-3">
              <label class="form-label small fw-medium">Endpoint OAI-PMH</label>
              <input v-model="activationForm.oaiEndpoint" type="text" class="form-control"
                placeholder="https://repositorio.upc.edu/oai/request">
              <small class="text-muted">URL del repositorio institucional (opcional)</small>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary btn-sm" @click="cancelActivation">Cancelar</button>
            <button type="button" class="btn btn-success btn-sm" @click="confirmActivation" :disabled="savingActivation || !activationForm.rorId">
              <i v-if="savingActivation" class="bi bi-arrow-repeat spinner-border spinner-border-sm me-1"></i>
              {{ savingActivation
                ? (activatingInstitution?.oaiStatus === 'ACTIVE' ? 'Guardando...' : 'Activando...')
                : (activatingInstitution?.oaiStatus === 'ACTIVE' ? 'Guardar cambios' : 'Activar institución') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Log de operaciones -->
    <div v-if="operationLog.length > 0" class="card shadow-sm mt-4">
      <div class="card-body">
        <h5 class="card-title fs-6 fw-semibold mb-3">
          <i class="bi bi-journal-text me-2"></i>Registro de operaciones
        </h5>
        <div class="list-group list-group-flush">
          <div
            v-for="(log, idx) in operationLog"
            :key="idx"
            class="list-group-item d-flex align-items-start gap-2 px-0"
          >
            <i
              class="bi mt-1 flex-shrink-0"
              :class="log.success ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'"
            ></i>
            <div style="min-width:0">
              <small class="d-block">{{ log.message }}</small>
              <small class="text-muted" style="font-size:0.7rem">{{ formatTime(log.timestamp.toISOString()) }}</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-select:disabled {
  opacity: 0.6;
}
</style>
