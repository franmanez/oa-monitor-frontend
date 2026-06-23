<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>

<template>
  <div class="app-shell">
    <nav class="navbar navbar-expand-md sticky-top">
      <div class="container">
        <router-link to="/" class="navbar-brand">
          <span class="brand-icon">
            <i class="bi bi-journal-check"></i>
          </span>
          <span class="brand-text">
            <span class="brand-title">Monitor OA</span>
            <span class="brand-subtitle">Revistas Científicas</span>
          </span>
        </router-link>

        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navMenu"
          aria-controls="navMenu"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navMenu">
          <ul class="navbar-nav ms-auto">
            <li class="nav-item">
              <router-link to="/" class="nav-link" :class="{ active: isActive('/') && route.name !== 'institutions' }">
                <i class="bi bi-speedometer2 me-1"></i>Dashboard
              </router-link>
            </li>
            <li class="nav-item">
              <router-link to="/institutions" class="nav-link" :class="{ active: isActive('/institutions') }">
                <i class="bi bi-building me-1"></i>Universidades
              </router-link>
            </li>
            <li class="nav-item">
              <router-link to="/ranking" class="nav-link" :class="{ active: isActive('/ranking') }">
                <i class="bi bi-trophy me-1"></i>Ranking
              </router-link>
            </li>
          </ul>
        </div>
      </div>
    </nav>

    <main class="main-content">
      <div class="container">
        <router-view />
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  background-color: var(--color-bg);
}

.navbar {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--color-border);
  padding: 0.6rem 0;
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.brand-icon {
  width: 38px;
  height: 38px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.brand-title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.1rem;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
}

.brand-subtitle {
  font-size: 0.65rem;
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.nav-link {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  padding: 0.5rem 0.85rem;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.nav-link:hover {
  color: var(--color-text-primary);
  background: var(--color-surface-muted);
}

.nav-link.active,
.nav-link.router-link-exact-active {
  color: var(--color-primary);
  background: var(--color-primary-soft);
}

.navbar-toggler {
  border: none;
  padding: 0.4rem;
}

.navbar-toggler:focus {
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.main-content {
  padding: var(--space-xl) 0 var(--space-3xl);
}
</style>
