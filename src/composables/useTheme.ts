import { ref } from 'vue'

const isDark = ref(false)

function applyTheme(dark: boolean) {
  isDark.value = dark
  const el = document.documentElement
  el.classList.toggle('dark', dark)
  el.setAttribute('data-bs-theme', dark ? 'dark' : 'light')
  try {
    localStorage.setItem('darkMode', String(dark))
  } catch {
    /* localStorage no disponible */
  }
}

export function useTheme() {
  if (!document.documentElement.hasAttribute('data-bs-theme')) {
    applyTheme(localStorage.getItem('darkMode') === 'true')
  } else {
    isDark.value = document.documentElement.classList.contains('dark')
  }

  function toggle() {
    applyTheme(!isDark.value)
  }

  return { isDark, toggle }
}
