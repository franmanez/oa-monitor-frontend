<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { TreemapChart } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { JournalApcItem, JournalArticleItem } from '@/stores/types'

use([TreemapChart, TooltipComponent, CanvasRenderer])

const props = defineProps<{
  institutionId: string
  year: string
}>()

const loading = ref(false)
const error = ref<string | null>(null)
const journals = ref<JournalApcItem[]>([])
const selectedJournal = ref<string | null>(null)
const articles = ref<JournalArticleItem[]>([])
const articlesLoading = ref(false)
const articlesCard = ref<HTMLElement | null>(null)
const showAllJournals = ref(false)
const showAllArticles = ref(false)

const TABLE_LIMIT = 10

function displayName(j: JournalApcItem): string {
  return j.journalName && j.journalName.trim() ? j.journalName : 'Sin nombre'
}

const visibleJournals = computed(() =>
  showAllJournals.value ? journals.value : journals.value.slice(0, TABLE_LIMIT)
)
const visibleArticles = computed(() =>
  showAllArticles.value ? articles.value : articles.value.slice(0, TABLE_LIMIT)
)

async function fetchJournals() {
  loading.value = true
  error.value = null
  selectedJournal.value = null
  articles.value = []
  showAllJournals.value = false
  try {
    const params = new URLSearchParams()
    if (props.year && props.year !== 'all') params.set('year', props.year)
    params.set('limit', '100')
    const res = await fetch(`/api/institutions/${props.institutionId}/journals/apc?${params}`)
    if (!res.ok) throw new Error(`Error ${res.status}`)
    journals.value = await res.json()
  } catch {
    journals.value = []
    error.value = 'No se pudieron cargar los datos por revista'
  } finally {
    loading.value = false
  }
}

async function selectJournal(name: string) {
  if (selectedJournal.value === name) return
  selectedJournal.value = name
  showAllArticles.value = false
  articlesLoading.value = true
  articles.value = []
  try {
    const params = new URLSearchParams()
    if (props.year && props.year !== 'all') params.set('year', props.year)
    params.set('journal', name)
    const res = await fetch(`/api/institutions/${props.institutionId}/journals/articles?${params}`)
    if (!res.ok) throw new Error(`Error ${res.status}`)
    articles.value = await res.json()
  } catch {
    articles.value = []
  } finally {
    articlesLoading.value = false
    setTimeout(() => {
      articlesCard.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }
}

function clearJournal() {
  selectedJournal.value = null
  articles.value = []
}

function formatEur(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0
  }).format(n)
}

// Tamaño de fuente adaptativo: proporcional a la raíz del peso de la celda
function treemapFontSize(share: number, max: number): number {
  return Math.round(Math.min(max, Math.max(9, 34 * Math.sqrt(Math.max(share, 0)) + 8)))
}

function formatNum(n: number) {
  return new Intl.NumberFormat('es-ES').format(n)
}

function formatPct(n: number) {
  return `${Number(n.toFixed(2))}%`
}

const totalApc = computed(() => journals.value.reduce((s, j) => s + Number(j.totalApcCost), 0))
const totalArticles = computed(() => journals.value.reduce((s, j) => s + j.publicationCount, 0))
const totalAverage = computed(() => totalArticles.value > 0 ? totalApc.value / totalArticles.value : 0)

const journalYearLabel = computed(() =>
  props.year && props.year !== 'all' ? `Año ${props.year}` : 'Todos los años'
)

// Azul único con intensidad proporcional al coste: máximo gasto = azul
// profundo; mínimo = azul muy claro. El drill-down no usa treemap porque
// los artículos de una misma revista comparten APC (celdas idénticas).
function blueFor(value: number): { bg: string; text: string; subtext: string; light: number } {
  const maxV = Math.max(...journals.value.map(j => Number(j.totalApcCost)), 1)
  const rel = Math.min(value / maxV, 1)
  const light = 80 - 48 * Math.sqrt(rel)
  const isDark = light < 52
  return {
    bg: `hsl(216 72% ${Math.round(light)}%)`,
    text: isDark ? '#ffffff' : '#0f2a52',
    subtext: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(15,42,82,0.78)',
    light: Math.round(light)
  }
}

const selectedJournalCost = computed(() => {
  const item = journals.value.find(j => displayName(j) === selectedJournal.value)
  return item ? Number(item.totalApcCost) : 0
})

const selectedJournalBorderColor = computed(() => blueFor(selectedJournalCost.value).bg)

const journalTreemapOption = computed(() => ({
  tooltip: {
    formatter: (p: any) => {
      const item = journals.value.find(x => displayName(x) === p.name)
      if (!item) return ''
      const avg = item.publicationCount > 0 ? Number(item.totalApcCost) / item.publicationCount : 0
      const pct = totalApc.value > 0 ? Number(item.totalApcCost) / totalApc.value * 100 : 0
      return `<div style="font-size:13px;line-height:1.6">
        <strong style="font-size:15px">${displayName(item)}</strong><br/>
        Gasto total: <strong>${formatEur(Number(item.totalApcCost))}</strong><br/>
        Artículos: ${formatNum(item.publicationCount)}<br/>
        Media por artículo: ${formatEur(avg)}<br/>
        ${formatPct(pct)} del gasto del ranking<br/>
        <span style="color:#9ca3af">Click para ver los artículos</span>
      </div>`
    },
    backgroundColor: 'rgba(17,24,39,0.92)',
    borderWidth: 0,
    textStyle: { color: '#f9fafb' }
  },
  series: [{
    type: 'treemap',
    animationDurationUpdate: 400,
    roam: false,
    nodeClick: false,
    breadcrumb: { show: false },
    label: {
      show: true,
      position: 'insideTopLeft',
      overflow: 'truncate',
      padding: [7, 9]
    },
    itemStyle: { borderColor: '#fff', borderWidth: 1, gapWidth: 1 },
    data: journals.value.map(j => {
      const cost = Number(j.totalApcCost)
      const share = totalApc.value > 0 ? cost / totalApc.value : 0
      const fs = treemapFontSize(share, 26)
      const colors = blueFor(cost)
      // Al pasar el ratón, ECharts reconstruye el label desde el nivel de serie
      // (donde no hay rich definido) y el texto caería a blanco sobre el fondo
      // aclarado. Se declara el emphasis explícito por ítem: mismos colores de
      // texto legibles + relleno aclarado controlado (tope L86, no blanco).
      const labelCfg = {
        fontSize: fs,
        formatter: `{val|${formatEur(cost)}}\n{name|${displayName(j)}}`,
        rich: {
          val: { fontSize: fs, lineHeight: Math.round(fs * 1.4), fontWeight: 'bold', color: colors.text },
          name: { fontSize: Math.max(9, Math.round(fs * 0.78)), lineHeight: Math.max(12, Math.round(fs * 1.15)), color: colors.subtext }
        }
      }
      const light = Math.min(colors.light + 8, 86)
      return {
        name: displayName(j),
        value: cost,
        itemStyle: { color: colors.bg },
        label: labelCfg,
        emphasis: {
          itemStyle: { color: `hsl(216 72% ${light}%)` },
          label: labelCfg
        }
      }
    })
  }]
}))

function onTreemapClick(params: { name?: string; seriesType?: string }) {
  if (params.seriesType === 'treemap' && params.name) {
    selectJournal(params.name)
  }
}

const articleTotal = computed(() => articles.value.reduce((s, a) => s + Number(a.apcEstimatedEur), 0))

function articlePct(a: JournalArticleItem) {
  if (articleTotal.value <= 0) return 0
  return (Number(a.apcEstimatedEur) / articleTotal.value) * 100
}

watch(() => [props.institutionId, props.year], () => {
  if (props.institutionId) fetchJournals()
})

onMounted(() => {
  if (props.institutionId) fetchJournals()
})
</script>

<template>
  <div>
    <!-- Treemap de revistas -->
    <div class="card shadow-sm mb-4">
      <div class="card-body">
        <div class="d-flex align-items-center justify-content-between mb-1 flex-wrap gap-2">
          <div>
            <h5 class="card-title fs-6 fw-semibold mb-1">
              <i class="bi bi-journal-text me-2" style="color:#1a4d2e"></i>Gasto en APC por revista
            </h5>
            <p class="text-muted small mb-0">{{ journalYearLabel }} · Top 100 revistas por gasto APC (el resto queda fuera del mapa por rendimiento). La intensidad del azul indica el gasto de cada revista. Click en una revista para ver sus artículos.</p>
          </div>
          <div v-if="journals.length > 0" class="d-flex align-items-center gap-2">
            <small class="text-muted">Total:</small>
            <span class="fw-bold">{{ formatEur(totalApc) }}</span>
            <small class="text-muted">({{ formatNum(totalArticles) }} artículos)</small>
          </div>
        </div>

        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
        </div>

        <div v-else-if="error" class="alert alert-danger mt-3 mb-0 small py-3">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ error }}
          <button class="btn btn-outline-danger btn-sm ms-2" @click="fetchJournals">Reintentar</button>
        </div>

        <div v-else-if="journals.length === 0" class="text-center py-5 text-muted">
          <i class="bi bi-box-seam" style="font-size:1.75rem"></i>
          <p class="small mt-2 mb-0">No hay artículos con coste APC estimado para este período.<br/>
            Ejecuta el cálculo de APC (<code>POST /api/institutions/:id/apc/calculate</code>) y selecciona otro año.</p>
        </div>

        <template v-else>
          <VChart :option="journalTreemapOption" autoresize class="treemap-box" @click="onTreemapClick" />

          <div class="table-responsive mt-3">
            <table class="table table-sm table-hover align-middle mb-0 journal-table">
              <thead class="table-light">
                <tr>
                  <th>Revista ({{ journals.length }} entradas)</th>
                  <th class="text-end">Suma</th>
                  <th class="text-center">Nº artículos</th>
                  <th class="text-end">Media</th>
                  <th class="text-end">%</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="j in visibleJournals" :key="displayName(j)"
                  class="journal-row"
                  :class="{ 'journal-row-selected': selectedJournal === displayName(j) }"
                  @click="selectJournal(displayName(j))">
                  <td>
                    <span class="journal-swatch me-2" :style="{ background: blueFor(Number(j.totalApcCost)).bg }"></span>
                    <span class="fw-medium small">{{ displayName(j) }}</span>
                  </td>
                  <td class="text-end small fw-semibold">{{ formatEur(Number(j.totalApcCost)) }}</td>
                  <td class="text-center small">{{ formatNum(j.publicationCount) }}</td>
                  <td class="text-end small">{{ formatEur(j.publicationCount > 0 ? Number(j.totalApcCost) / j.publicationCount : 0) }}</td>
                  <td class="text-end small">{{ formatPct(totalApc > 0 ? Number(j.totalApcCost) / totalApc * 100 : 0) }}</td>
                </tr>
                <tr v-if="journals.length > TABLE_LIMIT" class="show-more-row" @click="showAllJournals = !showAllJournals">
                  <td colspan="5" class="text-center py-2">
                    <span class="show-more-link">
                      <i class="bi me-1" :class="showAllJournals ? 'bi-dash-square' : 'bi-plus-square'"></i>
                      {{ showAllJournals ? 'Ocultar el resto' : `Ver las ${journals.length - TABLE_LIMIT} revistas restantes` }}
                    </span>
                  </td>
                </tr>
              </tbody>
              <tfoot class="table-light">
                <tr class="fw-bold small">
                  <td>Total ranking</td>
                  <td class="text-end">{{ formatEur(totalApc) }}</td>
                  <td class="text-center">{{ formatNum(totalArticles) }}</td>
                  <td class="text-end">{{ formatEur(totalAverage) }}</td>
                  <td class="text-end">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </template>
      </div>
    </div>

    <!-- Drill-down: artículos de la revista seleccionada -->
    <div v-if="selectedJournal" ref="articlesCard" class="card shadow-sm mb-4 article-card"
      :style="{ borderLeft: `3px solid ${selectedJournalBorderColor}` }">
      <div class="card-body">
        <div class="d-flex align-items-center justify-content-between mb-1 flex-wrap gap-2">
          <div>
            <h5 class="card-title fs-6 fw-semibold mb-1">
              Artículos de {{ selectedJournal }}
              <span class="badge bg-secondary ms-1 align-middle">{{ formatNum(articles.length) }}</span>
            </h5>
            <p class="text-muted small mb-0">Artículos con APC estimado en esta revista. Click en el DOI para abrirlo.</p>
          </div>
          <div class="d-flex align-items-center gap-3">
            <div v-if="articles.length > 0" class="text-end">
              <small class="text-muted d-block">Gasto revista</small>
              <span class="fw-bold">{{ formatEur(articleTotal) }}</span>
            </div>
            <button class="btn btn-sm btn-outline-secondary" @click="clearJournal">
              <i class="bi bi-x-lg me-1"></i>Cerrar
            </button>
          </div>
        </div>

        <div v-if="articlesLoading" class="text-center py-5">
          <div class="spinner-border spinner-border-sm text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
        </div>

        <div v-else-if="articles.length === 0" class="text-center py-4 text-muted small">
          No hay artículos con APC estimado para esta revista en el período seleccionado.
        </div>

        <template v-else>
          <div class="table-responsive mt-3">
            <table class="table table-sm table-hover align-middle mb-0 journal-table">
              <thead class="table-light">
                <tr>
                  <th>DOI ({{ articles.length }} artículos)</th>
                  <th class="text-end d-none d-md-table-cell">APC €</th>
                  <th class="text-center d-none d-md-table-cell">% de {{ selectedJournal }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="a in visibleArticles" :key="a.id">
                  <td>
                    <a v-if="a.doi" :href="`https://doi.org/${a.doi}`" target="_blank" rel="noopener" class="doi-link small">
                      {{ a.doi }}
                    </a>
                    <span v-else class="small text-muted">Sin DOI</span>
                    <div v-if="a.title" class="small text-muted ms-4 d-none d-md-block" style="max-width:520px">
                      <span class="text-truncate d-inline-block" style="max-width:500px">{{ a.title }}</span>
                    </div>
                  </td>
                  <td class="text-end small fw-semibold d-none d-md-table-cell">{{ formatEur(Number(a.apcEstimatedEur)) }}</td>
                  <td class="text-end small text-muted d-none d-md-table-cell">{{ formatPct(articlePct(a)) }}</td>
                </tr>
                <tr v-if="articles.length > TABLE_LIMIT" class="show-more-row" @click="showAllArticles = !showAllArticles">
                  <td colspan="3" class="text-center py-2">
                    <span class="show-more-link">
                      <i class="bi me-1" :class="showAllArticles ? 'bi-dash-square' : 'bi-plus-square'"></i>
                      {{ showAllArticles ? 'Ocultar el resto' : `Ver los ${articles.length - TABLE_LIMIT} artículos restantes` }}
                    </span>
                  </td>
                </tr>
              </tbody>
              <tfoot class="table-light">
                <tr class="fw-bold small">
                  <td>Total</td>
                  <td class="text-end">{{ formatEur(articleTotal) }}</td>
                  <td class="text-end">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.treemap-box {
  width: 100%;
  height: 440px;
}

.journal-table {
  font-size: 0.85rem;
}

.journal-row {
  cursor: pointer;
}

.journal-row-selected {
  background: var(--bs-primary-bg-subtle, #eff6ff);
}

.show-more-row {
  cursor: pointer;
}

.show-more-row:hover {
  background: var(--bs-tertiary-bg, #f8f9fa);
}

.show-more-link {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--bs-primary, #3b82f6);
}

.journal-swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
}

.doi-link {
  color: var(--bs-primary, #3b82f6);
  text-decoration: none;
  font-family: var(--font-mono, monospace);
}

.doi-link:hover {
  text-decoration: underline;
}

.article-card {
  animation: slideDown 0.25s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
