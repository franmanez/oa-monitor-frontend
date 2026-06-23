import { ref, computed, shallowRef, watch } from 'vue'

export interface NationalStats {
  totalPublications: number
  totalInstitutions: number
  overallOaPercentage: number
  totalOpenAccess: number
  totalClosed: number
  oaStatusCounts: Record<string, number>
}

export interface RankingItem {
  institutionId: string
  institutionName: string
  totalPublications: number
  oaPercentage: number
  openAccessCount: number
  closedCount: number
}

export interface InstitutionScatterItem {
  institutionId: string
  institutionName: string
  totalPublications: number
  oaPercentage: number
  totalApcCost: number
  hasApcData: boolean
}

export function useDashboardStats() {
  const stats = ref<NationalStats | null>(null)
  const statsLoading = shallowRef(false)
  const statsError = ref<string | null>(null)

  const availableYears = ref<number[]>([])
  const selectedYear = ref<number | null>(null)

  const ranking = ref<RankingItem[]>([])
  const rankingLoading = shallowRef(false)

  const scatterData = ref<InstitutionScatterItem[]>([])
  const scatterLoading = shallowRef(false)

  const top5 = computed(() => ranking.value.slice(0, 5))
  const bottom5 = computed(() => {
    const sorted = [...ranking.value].sort((a, b) => b.oaPercentage - a.oaPercentage)
    return sorted.slice(-5).reverse()
  })

  async function fetchStats() {
    statsLoading.value = true
    statsError.value = null
    try {
      const res = await fetch('/api/institutions/stats/national')
      if (!res.ok) throw new Error('Error al cargar estadísticas nacionales')
      stats.value = await res.json()
    } catch (e) {
      statsError.value = e instanceof Error ? e.message : 'Error desconocido'
    } finally {
      statsLoading.value = false
    }
  }

  async function fetchYears() {
    try {
      const res = await fetch('/api/institutions/ranking/years')
      if (res.ok) {
        availableYears.value = await res.json()
        if (availableYears.value.length > 0 && selectedYear.value === null) {
          selectedYear.value = availableYears.value[availableYears.value.length - 1]
        }
      }
    } catch {
      // silently ignore
    }
  }

  async function fetchRanking() {
    if (!selectedYear.value) return
    rankingLoading.value = true
    try {
      const res = await fetch(`/api/institutions/ranking?year=${selectedYear.value}`)
      if (res.ok) {
        ranking.value = await res.json()
      }
    } catch {
      ranking.value = []
    } finally {
      rankingLoading.value = false
    }
  }

  async function fetchScatter() {
    if (!selectedYear.value) return
    scatterLoading.value = true
    try {
      const res = await fetch(`/api/institutions/stats/scatter?year=${selectedYear.value}`)
      if (res.ok) {
        scatterData.value = await res.json()
      }
    } catch {
      scatterData.value = []
    } finally {
      scatterLoading.value = false
    }
  }

  function setYear(year: number) {
    selectedYear.value = year
  }

  watch(selectedYear, () => {
    fetchRanking()
    fetchScatter()
  })

  return {
    stats,
    statsLoading,
    statsError,
    availableYears,
    selectedYear,
    ranking,
    rankingLoading,
    scatterData,
    scatterLoading,
    top5,
    bottom5,
    fetchStats,
    fetchYears,
    fetchRanking,
    fetchScatter,
    setYear
  }
}
