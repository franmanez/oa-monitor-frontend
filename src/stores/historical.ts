import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { HistoricalData, HistoricalYear } from './types'

export const useHistoricalStore = defineStore('historical', () => {
  const data = ref<HistoricalData | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedYears = ref<number[]>([])

  const availableYears = computed(() => {
    if (!data.value?.yearlyData) return []
    return data.value.yearlyData.map(y => y.year).sort((a, b) => b - a)
  })

  const filteredData = computed(() => {
    if (!data.value || !data.value.yearlyData) return []
    if (selectedYears.value.length === 0) {
      return [...data.value.yearlyData].sort((a, b) => a.year - b.year)
    }
    return data.value.yearlyData
      .filter(y => selectedYears.value.includes(y.year))
      .sort((a, b) => a.year - b.year)
  })

  const institutionName = computed(() => data.value?.institutionName || '')

  async function fetchHistorical(id: string) {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`/api/institutions/${id}/historical`)
      if (res.ok) {
        const result = await res.json()
        data.value = result
        // Por defecto seleccionar todos los años
        selectedYears.value = result.yearlyData.map((y: any) => y.year)
      } else {
        throw new Error('No se pudieron cargar los datos históricos')
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido'
    } finally {
      loading.value = false
    }
  }

  function toggleYear(year: number) {
    const idx = selectedYears.value.indexOf(year)
    if (idx >= 0) {
      selectedYears.value.splice(idx, 1)
    } else {
      selectedYears.value.push(year)
      selectedYears.value.sort((a, b) => a - b)
    }
  }

  function selectAllYears() {
    if (data.value) {
      selectedYears.value = data.value.yearlyData.map(y => y.year)
    }
  }

  function clearSelection() {
    selectedYears.value = []
  }

  function $reset() {
    data.value = null
    loading.value = false
    error.value = null
    selectedYears.value = []
  }

  return {
    data,
    loading,
    error,
    selectedYears,
    availableYears,
    filteredData,
    institutionName,
    fetchHistorical,
    toggleYear,
    selectAllYears,
    clearSelection,
    $reset
  }
})
