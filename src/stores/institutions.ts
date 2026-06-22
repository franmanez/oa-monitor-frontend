import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Institution, InstitutionPageResponse } from './types'

export const useInstitutionsStore = defineStore('institutions', () => {
  const institutions = ref<Institution[]>([])
  const totalElements = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch('/api/institutions?page=0&size=100')
      if (!res.ok) throw new Error('Error al cargar instituciones')
      const data: InstitutionPageResponse = await res.json()
      institutions.value = data.content
      totalElements.value = data.totalElements
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido'
    } finally {
      loading.value = false
    }
  }

  return {
    institutions,
    totalElements,
    loading,
    error,
    fetchAll
  }
})
