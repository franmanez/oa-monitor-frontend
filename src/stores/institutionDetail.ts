import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Institution, InstitutionSummary, ApcEstimate, OaBreakdown } from './types'

export const useInstitutionDetailStore = defineStore('institutionDetail', () => {
  const institution = ref<Institution | null>(null)
  const summary = ref<InstitutionSummary | null>(null)
  const apcEstimate = ref<ApcEstimate | null>(null)
  const oaBreakdown = ref<OaBreakdown | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedYear = ref<string>('')

  const availableYears = computed(() => {
    if (!summary.value?.yearlyBreakdown) return []
    return Object.keys(summary.value.yearlyBreakdown).sort().reverse()
  })

  const filteredSummary = computed(() => {
    if (!summary.value) return null
    if (!selectedYear.value || selectedYear.value === 'all') return summary.value
    const yearData = summary.value.yearlyBreakdown[selectedYear.value]
    if (!yearData) return null
    const total = Object.values(yearData).reduce((a, b) => a + b, 0)
    const closed = yearData.CLOSED || 0
    return {
      ...summary.value,
      totalPublications: total,
      oaStatusCounts: yearData,
      oaPercentage: total > 0 ? Math.round((total - closed) / total * 1000) / 10 : 0
    }
  })

  const filteredApc = computed(() => {
    if (!apcEstimate.value) return null
    if (!selectedYear.value || selectedYear.value === 'all') return apcEstimate.value
    const yearData = apcEstimate.value.breakdownByYear[selectedYear.value]
    if (!yearData) return null
    return {
      ...apcEstimate.value,
      totalEstimatedCost: yearData.totalCost,
      totalPublications: yearData.publicationsCount,
      publicationsWithPrice: yearData.publicationsWithPrice,
      coveredByAgreements: yearData.coveredByAgreements,
      directCost: yearData.totalCost - yearData.coveredByAgreements
    }
  })

  const filteredOaBreakdown = computed(() => {
    if (!oaBreakdown.value) return null
    if (!selectedYear.value || selectedYear.value === 'all') return oaBreakdown.value
    const yearCounts = oaBreakdown.value.yearlyStatusCounts[selectedYear.value]
    const yearPct = oaBreakdown.value.yearlyOaPercentage[selectedYear.value]
    if (!yearCounts) return null
    return {
      institutionId: oaBreakdown.value.institutionId,
      institutionName: oaBreakdown.value.institutionName,
      yearlyStatusCounts: { [selectedYear.value]: yearCounts },
      yearlyOaPercentage: { [selectedYear.value]: yearPct }
    }
  })

  async function fetchSummary(id: string) {
    const yearParam = selectedYear.value && selectedYear.value !== 'all' ? `?year=${selectedYear.value}` : ''
    const res = await fetch(`/api/institutions/${id}/summary${yearParam}`)
    summary.value = res.ok ? await res.json() : null
  }

  async function fetchAll(id: string) {
    loading.value = true
    error.value = null
    try {
      const [instRes, apcRes, oaRes] = await Promise.all([
        fetch(`/api/institutions/${id}`),
        fetch(`/api/institutions/${id}/apc-estimate`),
        fetch(`/api/institutions/${id}/oa-breakdown`)
      ])
      if (!instRes.ok) throw new Error('Institución no encontrada')
      institution.value = await instRes.json()
      apcEstimate.value = apcRes.ok ? await apcRes.json() : null
      oaBreakdown.value = oaRes.ok ? await oaRes.json() : null
      await fetchSummary(id)
      if (!selectedYear.value && availableYears.value.length > 0) {
        selectedYear.value = availableYears.value[0]
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido'
    } finally {
      loading.value = false
    }
  }

  function setYear(year: string) {
    selectedYear.value = year
    if (institution.value) fetchSummary(institution.value.id)
  }

  return {
    institution,
    summary,
    apcEstimate,
    oaBreakdown,
    loading,
    error,
    selectedYear,
    availableYears,
    filteredSummary,
    filteredApc,
    filteredOaBreakdown,
    fetchAll,
    setYear
  }
})
