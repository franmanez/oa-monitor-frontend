<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { marked } from 'marked'

const content = ref('')
const loading = ref(true)
const error = ref('')
const activeTab = ref<'funcional' | 'tecnica'>('funcional')

async function loadDoc(type: 'funcional' | 'tecnica') {
  loading.value = true
  error.value = ''
  try {
    const filename = type === 'funcional' ? 'DOC_FUNCIONAL.md' : 'AGENTS.md'
    const response = await fetch(`/${filename}`)
    if (!response.ok) {
      throw new Error('No se pudo cargar la documentación')
    }
    const markdown = await response.text()
    content.value = await marked(markdown)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error desconocido'
  } finally {
    loading.value = false
  }
}

function switchTab(tab: 'funcional' | 'tecnica') {
  activeTab.value = tab
  loadDoc(tab)
}

onMounted(() => {
  loadDoc('funcional')
})
</script>

<template>
  <div class="container-fluid py-4">
    <div class="d-flex align-items-center gap-3 mb-4">
      <div class="d-inline-flex align-items-center justify-content-center rounded"
        style="width:40px;height:40px;background:rgba(99,102,241,0.1)">
        <i class="bi bi-info-circle-fill" style="color:#6366f1;font-size:1.2rem"></i>
      </div>
      <div>
        <h1 class="h4 fw-bold mb-0">Documentación</h1>
        <small class="text-muted">Información funcional y técnica del proyecto OpenScope</small>
      </div>
    </div>

    <!-- Tabs -->
    <div class="card shadow-sm mb-4">
      <div class="card-header bg-white border-bottom">
        <ul class="nav nav-tabs card-header-tabs mb-0">
          <li class="nav-item">
            <button
              class="nav-link"
              :class="{ active: activeTab === 'funcional' }"
              @click="switchTab('funcional')"
            >
              <i class="bi bi-book me-2"></i>
              Documentación funcional
            </button>
          </li>
          <li class="nav-item">
            <button
              class="nav-link"
              :class="{ active: activeTab === 'tecnica' }"
              @click="switchTab('tecnica')"
            >
              <i class="bi bi-code-slash me-2"></i>
              Documentación técnica
            </button>
          </li>
        </ul>
      </div>
      <div class="card-body p-4">
        <div v-if="loading" class="d-flex justify-content-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
        </div>

        <div v-else-if="error" class="alert alert-danger" role="alert">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          {{ error }}
        </div>

        <div v-else class="markdown-content" v-html="content"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nav-tabs {
  border-bottom-color: var(--bs-border-color);
}

.nav-tabs .nav-link {
  color: var(--bs-secondary-color);
  font-weight: 500;
  font-size: 0.9rem;
  padding: 0.75rem 1.25rem;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
}

.nav-tabs .nav-link:hover {
  color: var(--bs-body-color);
  border-bottom-color: var(--bs-border-color);
}

.nav-tabs .nav-link.active {
  color: var(--color-primary, #6366f1);
  border-bottom-color: var(--color-primary, #6366f1);
  background: transparent;
}

.markdown-content {
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--bs-body-color);
}

.markdown-content :deep(h1) {
  font-size: 1.75rem;
  font-weight: 700;
  margin-top: 0;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--bs-border-color);
}

.markdown-content :deep(h2) {
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 2rem;
  margin-bottom: 0.75rem;
  color: var(--bs-heading-color);
}

.markdown-content :deep(h3) {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}

.markdown-content :deep(p) {
  margin-bottom: 1rem;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin-bottom: 1rem;
  padding-left: 1.5rem;
}

.markdown-content :deep(li) {
  margin-bottom: 0.25rem;
}

.markdown-content :deep(code) {
  background-color: var(--bs-secondary-bg);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.85em;
}

.markdown-content :deep(pre) {
  background-color: var(--bs-secondary-bg);
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin-bottom: 1rem;
}

.markdown-content :deep(pre code) {
  background: none;
  padding: 0;
}

.markdown-content :deep(table) {
  width: 100%;
  margin-bottom: 1rem;
  border-collapse: collapse;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  padding: 0.5rem;
  border: 1px solid var(--bs-border-color);
}

.markdown-content :deep(th) {
  background-color: var(--bs-secondary-bg);
  font-weight: 600;
}

.markdown-content :deep(a) {
  color: var(--bs-primary);
  text-decoration: none;
}

.markdown-content :deep(a:hover) {
  text-decoration: underline;
}

.markdown-content :deep(strong) {
  font-weight: 600;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid var(--bs-border-color);
  padding-left: 1rem;
  margin-left: 0;
  margin-bottom: 1rem;
  color: var(--bs-secondary-color);
}
</style>
