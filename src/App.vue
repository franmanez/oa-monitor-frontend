<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useTheme } from '@/composables/useTheme'

const route = useRoute()
const { isDark, toggle: toggleDarkMode } = useTheme()

const sidebarOpen = ref(false)
const isDesktop = ref(true)
let mediaQuery: MediaQueryList | null = null

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function closeSidebarIfMobile() {
  if (!isDesktop.value) sidebarOpen.value = false
}

function onMediaChange(e: MediaQueryListEvent) {
  isDesktop.value = e.matches
  sidebarOpen.value = false
}

onMounted(() => {
  mediaQuery = window.matchMedia('(min-width: 1280px)')
  isDesktop.value = mediaQuery.matches
  mediaQuery.addEventListener('change', onMediaChange)
})

onBeforeUnmount(() => {
  mediaQuery?.removeEventListener('change', onMediaChange)
})

const navItems = [
  { path: '/', icon: 'bi-house', label: 'Inicio' },
  { path: '/institutions', icon: 'bi-building', label: 'Universidades' },
  { path: '/ranking', icon: 'bi-trophy', label: 'Ranking' },
  { path: '/admin', icon: 'bi-gear', label: 'Administración' },
  { path: '/informacion', icon: 'bi-info-circle', label: 'Información' },
]
</script>

<template>
  <div class="app-shell" :class="{ 'sidebar-toggle': sidebarOpen }">
    <!-- Sidebar -->
    <aside class="app-sidebar">
      <div class="sidebar-header">
        <router-link to="/" class="sidebar-logo" @click="closeSidebarIfMobile">
          <div class="logo-icon">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 4 A16 16 0 1 1 7.5 31" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
              <circle cx="20" cy="20" r="5.5" fill="currentColor"/>
              <line x1="20" y1="6" x2="20" y2="10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
              <line x1="34" y1="20" x2="30" y2="20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
              <line x1="20" y1="34" x2="20" y2="30" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
              <line x1="6" y1="20" x2="10" y2="20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
          </div>
          <span class="logo-text">OpenScope</span>
        </router-link>
        <button class="sidebar-close-btn" @click="toggleSidebar" title="Cerrar menú">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-group-label">MENU</div>
        <ul class="nav-list">
          <li v-for="item in navItems" :key="item.path">
            <router-link
              :to="item.path"
              class="nav-item"
              :class="{ 'nav-item-active': isActive(item.path) }"
              :title="item.label"
              @click="closeSidebarIfMobile"
            >
              <i :class="item.icon"></i>
              <span>{{ item.label }}</span>
            </router-link>
          </li>
        </ul>
      </nav>
    </aside>

    <!-- Overlay (solo fuera de desktop) -->
    <div v-if="sidebarOpen" class="sidebar-overlay" @click="toggleSidebar"></div>

    <!-- Main area -->
    <div class="app-main-area">
      <!-- Header -->
      <header class="app-header">
        <div class="header-left">
          <button
            class="header-menu-btn"
            :class="{ 'is-active': sidebarOpen }"
            @click="toggleSidebar"
            :title="sidebarOpen ? 'Plegar menú' : 'Desplegar menú'"
          >
            <i class="bi" :class="sidebarOpen && !isDesktop ? 'bi-x-lg' : 'bi-list'"></i>
          </button>

          <router-link to="/" class="header-logo" @click="closeSidebarIfMobile">
            <div class="logo-icon logo-icon-sm">
              <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 4 A16 16 0 1 1 7.5 31" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
                <circle cx="20" cy="20" r="5.5" fill="currentColor"/>
              </svg>
            </div>
            <span class="header-logo-text">OpenScope</span>
          </router-link>

          <div class="header-search">
            <i class="bi bi-search search-icon"></i>
            <input
              type="text"
              placeholder="Buscar universidades, revistas..."
              class="search-input"
            />
          </div>
        </div>

        <div class="header-right">
          <button
            class="header-icon-btn dark-mode-btn"
            @click="toggleDarkMode"
            :title="isDark ? 'Modo claro' : 'Modo oscuro'"
          >
            <i class="bi bi-moon-fill" v-if="!isDark"></i>
            <i class="bi bi-sun-fill" v-else></i>
          </button>
          <button class="header-icon-btn header-bell-btn" title="Notificaciones">
            <i class="bi bi-bell"></i>
          </button>
          <div class="header-user">
            <div class="user-avatar">
              <i class="bi bi-person-fill"></i>
            </div>
            <span class="user-name">Admin</span>
          </div>
        </div>
      </header>

      <!-- Content -->
      <main class="app-content">
        <div class="content-inner">
          <router-view />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background-color: var(--color-bg);
}

@supports (height: 100dvh) {
  .app-shell {
    height: 100dvh;
  }
}

/* ===== Sidebar ===== */
.app-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 270px;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  transform: translateX(-100%);
  transition: transform var(--transition-slow), width var(--transition-slow);
}

.app-shell.sidebar-toggle .app-sidebar {
  transform: translateX(0);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 1.25rem;
  flex-shrink: 0;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  min-width: 0;
}

.logo-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  background: var(--color-primary);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.logo-icon svg {
  width: 24px;
  height: 24px;
}

.logo-text {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--color-text-primary);
  white-space: nowrap;
}

.sidebar-close-btn {
  display: none;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0.25rem;
}

.sidebar-nav {
  flex: 1;
  padding: 0 1rem;
  overflow-y: auto;
}

.nav-group-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.25rem;
  white-space: nowrap;
}

.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.nav-item i {
  font-size: 1.1rem;
  width: 20px;
  flex-shrink: 0;
  text-align: center;
}

.nav-item:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.nav-item-active,
.nav-item.router-link-exact-active {
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-weight: 600;
}

/* ===== Overlay ===== */
.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(16, 24, 40, 0.5);
  z-index: 999;
}

.app-shell.sidebar-toggle .sidebar-overlay {
  display: block;
}

/* ===== Main area ===== */
.app-main-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ===== Header ===== */
.app-header {
  position: relative;
  z-index: 100;
  flex-shrink: 0;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 0 1rem;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.header-menu-btn {
  flex-shrink: 0;
  display: flex;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-text-secondary);
  font-size: 1.25rem;
  transition: all var(--transition-fast);
}

.header-menu-btn:hover,
.header-menu-btn.is-active {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.header-logo {
  display: none;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  flex-shrink: 0;
}

.logo-icon-sm {
  width: 34px;
  height: 34px;
}

.logo-icon-sm svg {
  width: 20px;
  height: 20px;
}

.header-logo-text {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1rem;
  color: var(--color-text-primary);
}

.header-search {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  max-width: 340px;
  min-width: 0;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  color: var(--color-text-muted);
  font-size: 0.9rem;
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 42px;
  padding: 0 0.75rem 0 2.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg);
  font-size: 0.875rem;
  color: var(--color-text-primary);
  outline: none;
  transition: border-color var(--transition-fast);
}

.search-input::placeholder {
  color: var(--color-text-muted);
}

.search-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(70, 95, 255, 0.12);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.header-icon-btn {
  width: 42px;
  height: 42px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-text-secondary);
  font-size: 1rem;
  transition: all var(--transition-fast);
  position: relative;
}

.header-icon-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.dark-mode-btn i {
  transition: transform var(--transition-base);
}

.dark-mode-btn:hover i {
  transform: rotate(15deg);
}

.dark-mode-btn .bi-moon-fill {
  color: var(--color-text-muted);
}

.dark-mode-btn .bi-sun-fill {
  color: #f59e0b;
}

.header-user {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.header-user:hover {
  background: var(--color-surface-hover);
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-primary-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  font-size: 1rem;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

/* ===== Content ===== */
.app-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1.5rem 1rem;
}

.content-inner {
  max-width: 1520px;
  margin: 0 auto;
}

/* ===== Desktop (xl ≥1280): sidebar estático, plegable a iconos ===== */
@media (min-width: 1280px) {
  .app-sidebar {
    transform: translateX(0);
  }

  .app-shell.sidebar-toggle .app-sidebar {
    width: 90px;
  }

  .app-main-area {
    margin-left: 270px;
    transition: margin-left var(--transition-slow);
  }

  .app-shell.sidebar-toggle .app-main-area {
    margin-left: 90px;
  }

  .app-shell.sidebar-toggle .sidebar-header {
    justify-content: center;
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }

  .app-shell.sidebar-toggle .logo-text,
  .app-shell.sidebar-toggle .nav-group-label,
  .app-shell.sidebar-toggle .nav-item span {
    display: none;
  }

  .app-shell.sidebar-toggle .nav-item {
    justify-content: center;
    padding-left: 0;
    padding-right: 0;
  }

  .app-shell.sidebar-toggle .sidebar-overlay {
    display: none;
  }
}

/* ===== Tablet / móvil ===== */
@media (max-width: 1279.98px) {
  .header-logo {
    display: flex;
  }

  .sidebar-close-btn {
    display: block;
  }
}

@media (max-width: 767.98px) {
  .header-bell-btn {
    display: none;
  }

  .user-name {
    display: none;
  }

  .app-content {
    padding: 1rem;
  }

  .app-header {
    padding: 0 0.75rem;
  }
}

@media (max-width: 575.98px) {
  .header-search {
    display: none;
  }
}
</style>
