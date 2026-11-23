<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { TreemapChart } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { PublisherApcItem, PublisherArticleItem } from '@/stores/types'
import GoldHybridChart from '@/components/charts/GoldHybridChart.vue'

use([TreemapChart, TooltipComponent, CanvasRenderer])

const props = defineProps<{
  institutionId: string
  year: string
}>()

// Paleta estilo OpenAPC: colores sólidos y distinguibles
const palette = [
  '#1a4d2e', '#c2274f', '#00a896', '#d35400', '#7a5af8',
  '#22c55e', '#b7791f', '#3b82f6', '#a855f7', '#ef4444',
  '#0ea5e9', '#84cc16', '#f59e0b', '#6366f1', '#14b8a6',
  '#e11d48', '#8b5cf6', '#059669', '#d97706', '#475569'
]

const loading = ref(false)
const error = ref<string | null>(null)
const publishers = ref<PublisherApcItem[]>([])
const selectedPublisher = ref<string | null>(null)
const articles = ref<PublisherArticleItem[]>([])
const articlesLoading = ref(false)
const articlesCard = ref<HTMLElement | null>(null)
const showAllPublishers = ref(false)
const showAllArticles = ref(false)

const TABLE_LIMIT = 10
const visiblePublishers = computed(() =>
  showAllPublishers.value ? publishers.value : publishers.value.slice(0, TABLE_LIMIT)
)
const visibleArticles = computed(() =>
  showAllArticles.value ? articles.value : articles.value.slice(0, TABLE_LIMIT)
)

async function fetchPublishers() {
  loading.value = true
  error.value = null
  selectedPublisher.value = null
  articles.value = []
  showAllPublishers.value = false
  try {
    const params = new URLSearchParams()
    if (props.year && props.year !== 'all') params.set('year', props.year)
    const res = await fetch(`/api/institutions/${props.institutionId}/publishers?${params}`)
    if (!res.ok) throw new Error(`Error ${res.status}`)
    publishers.value = await res.json()
  } catch {
    publishers.value = []
    error.value = 'No se pudieron cargar los datos por editorial'
  } finally {
    loading.value = false
  }
}

async function selectPublisher(name: string) {
  if (selectedPublisher.value === name) return
  selectedPublisher.value = name
  showAllArticles.value = false
  articlesLoading.value = true
  articles.value = []
  try {
    const params = new URLSearchParams()
    if (props.year && props.year !== 'all') params.set('year', props.year)
    params.set('publisher', name)
    const res = await fetch(`/api/institutions/${props.institutionId}/publishers/articles?${params}`)
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

function clearPublisher() {
  selectedPublisher.value = null
  articles.value = []
}

function publisherColor(name: string): string {
  const idx = publishers.value.findIndex(p => p.publisher === name)
  return palette[(idx < 0 ? 0 : idx) % palette.length]
}

function formatEur(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0
  }).format(n)
}

// Tamaño de fuente adaptativo: proporcional a la raíz del peso de la celda
// (área ≈ share · superficie total). Acotado para que lo pequeño siga siendo legible.
function treemapFontSize(share: number, max: number): number {
  return Math.round(Math.min(max, Math.max(9, 34 * Math.sqrt(Math.max(share, 0)) + 8)))
}

function formatNum(n: number) {
  return new Intl.NumberFormat('es-ES').format(n)
}

function formatPct(n: number) {
  return `${Number(n.toFixed(2))}%`
}

const totalApc = computed(() => publishers.value.reduce((s, p) => s + Number(p.totalApc), 0))
const totalArticles = computed(() => publishers.value.reduce((s, p) => s + p.articleCount, 0))
const totalAverage = computed(() => totalArticles.value > 0 ? totalApc.value / totalArticles.value : 0)

const publisherYearLabel = computed(() =>
  props.year && props.year !== 'all' ? `Año ${props.year}` : 'Todos los años'
)

// Top 12 editoriales por nº de artículos para la gráfica Oro vs Híbrido.
// El ranking solo incluye artículos con APC, así que el desglose posible
// es GOLD (revista OA) frente a HYBRID (artículo liberado en suscripción).
const topPublishersByVolume = computed(() =>
  [...publishers.value].sort((a, b) => b.articleCount - a.articleCount).slice(0, 12)
)
const publisherChartLabels = computed(() =>
  topPublishersByVolume.value.map(p =>
    p.publisher.length > 24 ? p.publisher.slice(0, 22) + '…' : p.publisher)
)
const publisherChartGold = computed(() => topPublishersByVolume.value.map(p => p.goldCount))
const publisherChartHybrid = computed(() => topPublishersByVolume.value.map(p => p.hybridCount))

// ── Treemap de editoriales ─────────────────────────────────────────────

function onTreemapClick(params: { name?: string; seriesType?: string }) {
  if (params.seriesType === 'treemap' && params.name) {
    selectPublisher(params.name)
  }
}

const publisherTreemapOption = computed(() => ({
  tooltip: {
    formatter: (p: any) => {
      const item = publishers.value.find(x => x.publisher === p.name)
      if (!item) return ''
      return `<div style="font-size:13px;line-height:1.6">
        <strong style="font-size:15px">${item.publisher}</strong><br/>
        Gasto total: <strong>${formatEur(Number(item.totalApc))}</strong><br/>
        Artículos: ${formatNum(item.articleCount)}<br/>
        Media por artículo: ${formatEur(Number(item.averageApc))}<br/>
        ${formatPct(item.percentage)} del gasto total<br/>
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
      formatter: (p: any) => {
        const item = publishers.value.find(x => x.publisher === p.name)
        if (!item) return p.name
        return `{val|${formatEur(Number(item.totalApc))}}\n{name|${item.publisher}}`
      },
      rich: {
        val: { fontWeight: 'bold', color: '#fff' },
        name: { color: 'rgba(255,255,255,0.92)' }
      },
      padding: [7, 9]
    },
    itemStyle: { borderColor: '#fff', borderWidth: 1, gapWidth: 1 },
    data: (() => {
      const total = publishers.value.reduce((s, x) => s + Number(x.totalApc), 0)
      return publishers.value.map((p, i) => {
        const share = total > 0 ? Number(p.totalApc) / total : 0
        const fs = treemapFontSize(share, 26)
        return {
          name: p.publisher,
          value: Number(p.totalApc),
          itemStyle: { color: palette[i % palette.length] },
          label: {
            fontSize: fs,
            rich: {
              val: { fontSize: fs, lineHeight: Math.round(fs * 1.4) },
              name: { fontSize: Math.max(9, Math.round(fs * 0.78)), lineHeight: Math.max(12, Math.round(fs * 1.15)) }
            }
          }
        }
      })
    })()
  }]
}))

// ── Treemap de artículos (tonos de la editorial seleccionada) ─────────

function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16)
  let r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff
  if (factor >= 0) {
    r = Math.round(r + (255 - r) * factor)
    g = Math.round(g + (255 - g) * factor)
    b = Math.round(b + (255 - b) * factor)
  } else {
    const f = 1 + factor
    r = Math.round(r * f)
    g = Math.round(g * f)
    b = Math.round(b * f)
  }
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

function onArticleClick(params: { name?: string; data?: any; seriesType?: string }) {
  if (params.seriesType === 'treemap' && params.data?.doi) {
    window.open(`https://doi.org/${params.data.doi}`, '_blank', 'noopener')
  }
}

const articleTreemapOption = computed(() => {
  const base = publisherColor(selectedPublisher.value || '')
  const n = articles.value.length
  return {
    tooltip: {
      formatter: (p: any) => {
        const item = articles.value.find(x => x.doi === p.name)
        if (!item) return ''
        const title = item.title && item.title.length > 80 ? item.title.slice(0, 80) + '…' : item.title || ''
        return `<div style="font-size:13px;line-height:1.6;max-width:340px">
          <strong>${item.doi || 'Sin DOI'}</strong><br/>
          APC: <strong>${formatEur(Number(item.apcEstimatedEur))}</strong><br/>
          ${item.journalName ? `${item.journalName}<br/>` : ''}
          ${title ? `<span style="color:#9ca3af">${title}</span><br/>` : ''}
          <span style="color:#9ca3af">Click para abrir el DOI</span>
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
        formatter: (p: any) => {
          const item = articles.value.find(x => x.doi === p.name)
          if (!item) return p.name
          return `{val|${formatEur(Number(item.apcEstimatedEur))}}\n{name|${item.doi}}`
        },
        rich: {
          val: { fontWeight: 'bold', color: '#fff' },
          name: { color: 'rgba(255,255,255,0.85)' }
        },
        padding: [5, 7]
      },
      itemStyle: { borderColor: '#fff', borderWidth: 1, gapWidth: 1 },
      data: (() => {
        const total = articles.value.reduce((s, x) => s + Number(x.apcEstimatedEur), 0)
        return articles.value.map((a, i) => {
          const share = total > 0 ? Number(a.apcEstimatedEur) / total : 0
          const fs = treemapFontSize(share, 20)
          return {
            name: a.doi || `sin-doi-${a.id}`,
            doi: a.doi,
            value: Number(a.apcEstimatedEur),
            itemStyle: {
              color: shade(base, n > 1 ? (i / (n - 1)) * 0.7 - 0.25 : 0)
            },
            label: {
              fontSize: fs,
              rich: {
                val: { fontSize: fs, lineHeight: Math.round(fs * 1.35) },
                name: { fontSize: Math.max(8, Math.round(fs * 0.72)), lineHeight: Math.max(10, Math.round(fs * 1.1)) }
              }
            }
          }
        })
      })()
    }]
  }
})

const articleTotal = computed(() => articles.value.reduce((s, a) => s + Number(a.apcEstimatedEur), 0))

function articlePct(a: PublisherArticleItem) {
  if (articleTotal.value <= 0) return 0
  return (Number(a.apcEstimatedEur) / articleTotal.value) * 100
}

watch(() => [props.institutionId, props.year], () => {
  if (props.institutionId) fetchPublishers()
})

onMounted(() => {
  if (props.institutionId) fetchPublishers()
})
</script>

<template>
  <div>
    <!-- Treemap de editoriales -->
    <div class="card shadow-sm mb-4">
      <div class="card-body">
        <div class="d-flex align-items-center justify-content-between mb-1 flex-wrap gap-2">
          <div>
            <h5 class="card-title fs-6 fw-semibold mb-1">
              <i class="bi bi-diagram-3 me-2" style="color:#1a4d2e"></i>Gasto en APC por editorial
            </h5>
            <p class="text-muted small mb-0">{{ publisherYearLabel }} · El tamaño de cada celda es el gasto total en APC. Click en una editorial para ver sus artículos.</p>
          </div>
          <div v-if="publishers.length > 0" class="d-flex align-items-center gap-2">
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
          <button class="btn btn-outline-danger btn-sm ms-2" @click="fetchPublishers">Reintentar</button>
        </div>

        <div v-else-if="publishers.length === 0" class="text-center py-5 text-muted">
          <i class="bi bi-box-seam" style="font-size:1.75rem"></i>
          <p class="small mt-2 mb-0">No hay artículos con coste APC estimado para este período.<br/>
            Ejecuta el cálculo de APC (<code>POST /api/institutions/:id/apc/calculate</code>) y selecciona otro año.</p>
        </div>

        <template v-else>
          <VChart :option="publisherTreemapOption" autoresize class="treemap-box" @click="onTreemapClick" />

          <div class="table-responsive mt-3">
            <table class="table table-sm table-hover align-middle mb-0 publisher-table">
              <thead class="table-light">
                <tr>
                  <th>Editorial ({{ publishers.length }} entradas)</th>
                  <th class="text-end">Suma</th>
                  <th class="text-center">Nº artículos</th>
                  <th class="text-end">Media</th>
                  <th class="text-end">Desviación</th>
                  <th class="text-end">%</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, i) in visiblePublishers" :key="p.publisher"
                  class="publisher-row"
                  :class="{ 'publisher-row-selected': selectedPublisher === p.publisher }"
                  @click="selectPublisher(p.publisher)">
                  <td>
                    <span class="publisher-swatch me-2" :style="{ background: palette[i % palette.length] }"></span>
                    <span class="fw-medium small">{{ p.publisher }}</span>
                  </td>
                  <td class="text-end small fw-semibold">{{ formatEur(Number(p.totalApc)) }}</td>
                  <td class="text-center small">{{ formatNum(p.articleCount) }}</td>
                  <td class="text-end small">{{ formatEur(Number(p.averageApc)) }}</td>
                  <td class="text-end small text-muted">{{ p.stdDev != null ? formatEur(Number(p.stdDev)) : 'N/A' }}</td>
                  <td class="text-end small">{{ formatPct(p.percentage) }}</td>
                </tr>
                <tr v-if="publishers.length > TABLE_LIMIT" class="show-more-row" @click="showAllPublishers = !showAllPublishers">
                  <td colspan="6" class="text-center py-2">
                    <span class="show-more-link">
                      <i class="bi me-1" :class="showAllPublishers ? 'bi-dash-square' : 'bi-plus-square'"></i>
                      {{ showAllPublishers ? 'Ocultar el resto' : `Ver las ${publishers.length - TABLE_LIMIT} editoriales restantes` }}
                    </span>
                  </td>
                </tr>
              </tbody>
              <tfoot class="table-light">
                <tr class="fw-bold small">
                  <td>Total</td>
                  <td class="text-end">{{ formatEur(totalApc) }}</td>
                  <td class="text-center">{{ formatNum(totalArticles) }}</td>
                  <td class="text-end">{{ formatEur(totalAverage) }}</td>
                  <td class="text-end text-muted">—</td>
                  <td class="text-end">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </template>
      </div>
    </div>

    <!-- Rutas OA por editorial -->
    <div v-if="publishers.length > 0" class="card shadow-sm mb-4">
      <div class="card-body">
        <h5 class="card-title fs-6 fw-semibold mb-1">Artículos con APC por Editorial: Oro frente a Híbrido</h5>
        <p class="text-muted small mb-3">Top {{ topPublishersByVolume.length }} editoriales por nº de artículos con APC estimado, descompuestos en GOLD (revista de acceso abierto) frente a HYBRID (artículo liberado en revista de suscripción)</p>
        <GoldHybridChart :categories="publisherChartLabels" :gold="publisherChartGold" :hybrid="publisherChartHybrid" :height-px="380" />
      </div>
    </div>

    <!-- Drill-down: artículos de la editorial seleccionada -->
    <div v-if="selectedPublisher" ref="articlesCard" class="card shadow-sm mb-4 article-card"
      :style="{ borderLeft: `3px solid ${publisherColor(selectedPublisher)}` }">
      <div class="card-body">
        <div class="d-flex align-items-center justify-content-between mb-1 flex-wrap gap-2">
          <div>
            <h5 class="card-title fs-6 fw-semibold mb-1">
              Artículos de {{ selectedPublisher }}
              <span class="badge bg-secondary ms-1 align-middle">{{ formatNum(articles.length) }}</span>
            </h5>
            <p class="text-muted small mb-0">Cada celda es un artículo (tamaño = APC pagado). Click para abrir el DOI.</p>
          </div>
          <div class="d-flex align-items-center gap-3">
            <div v-if="articles.length > 0" class="text-end">
              <small class="text-muted d-block">Gasto editorial</small>
              <span class="fw-bold">{{ formatEur(articleTotal) }}</span>
            </div>
            <button class="btn btn-sm btn-outline-secondary" @click="clearPublisher">
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
          No hay artículos con APC estimado para esta editorial en el período seleccionado.
        </div>

        <template v-else>
          <VChart :option="articleTreemapOption" autoresize class="treemap-box treemap-box-sm" @click="onArticleClick" />

          <div class="table-responsive mt-3">
            <table class="table table-sm table-hover align-middle mb-0 publisher-table">
              <thead class="table-light">
                <tr>
                  <th>DOI ({{ articles.length }} artículos)</th>
                  <th class="text-end d-none d-md-table-cell">APC €</th>
                  <th class="text-center d-none d-md-table-cell">% de {{ selectedPublisher }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(a, i) in visibleArticles" :key="a.id">
                  <td>
                    <span class="publisher-swatch me-2"
                      :style="{ background: shade(publisherColor(selectedPublisher), articles.length > 1 ? (i / (articles.length - 1)) * 0.7 - 0.25 : 0) }"></span>
                    <a v-if="a.doi" :href="`https://doi.org/${a.doi}`" target="_blank" rel="noopener" class="doi-link small">
                      {{ a.doi }}
                    </a>
                    <span v-else class="small text-muted">Sin DOI</span>
                    <div v-if="a.journalName" class="small text-muted ms-4 d-none d-md-block" style="max-width:520px">
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

.treemap-box-sm {
  height: 380px;
}

.publisher-table {
  font-size: 0.85rem;
}

.publisher-row {
  cursor: pointer;
}

.publisher-row-selected {
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

.publisher-swatch {
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
