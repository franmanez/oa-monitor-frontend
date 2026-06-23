<script setup lang="ts">
const props = defineProps<{
  search: string
  viewMode: 'cards' | 'table'
  totalElements: number
  filteredCount: number
}>()

const emit = defineEmits<{
  'update:search': [value: string]
  'update:viewMode': [value: 'cards' | 'table']
}>()

function onSearchInput(e: Event) {
  emit('update:search', (e.target as HTMLInputElement).value)
}

function setViewMode(mode: 'cards' | 'table') {
  emit('update:viewMode', mode)
}
</script>

<template>
  <div class="institutions-toolbar">
    <div class="toolbar-stats">
      <span class="toolbar-count">
        <span class="count-num">{{ totalElements }}</span>
        <span class="count-label">universidades</span>
      </span>
      <span v-if="filteredCount !== totalElements" class="toolbar-filtered">
        {{ filteredCount }} coincidencias
      </span>
    </div>

    <div class="toolbar-controls">
      <div class="search-wrap">
        <i class="bi bi-search search-icon"></i>
        <input
          type="text"
          class="search-input"
          placeholder="Buscar universidad..."
          :value="search"
          @input="onSearchInput"
        />
        <button v-if="search" class="search-clear" @click="emit('update:search', '')">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <div class="view-toggle">
        <button
          class="toggle-btn"
          :class="{ active: viewMode === 'cards' }"
          @click="setViewMode('cards')"
          title="Vista tarjetas"
        >
          <i class="bi bi-grid-3x2-gap-fill"></i>
        </button>
        <button
          class="toggle-btn"
          :class="{ active: viewMode === 'table' }"
          @click="setViewMode('table')"
          title="Vista tabla"
        >
          <i class="bi bi-list-ul"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.institutions-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
  flex-wrap: wrap;
}

.toolbar-stats {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
}

.toolbar-count {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.count-num {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
}

.count-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.toolbar-filtered {
  font-size: 0.78rem;
  color: var(--color-primary);
  font-weight: 600;
  background: var(--color-primary-soft);
  padding: 2px 10px;
  border-radius: var(--radius-full);
}

.toolbar-controls {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: var(--color-text-muted);
  font-size: 0.9rem;
  pointer-events: none;
}

.search-input {
  width: 260px;
  height: 38px;
  padding: 0 36px 0 36px;
  font-size: 0.85rem;
  font-family: var(--font-body);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.search-input::placeholder {
  color: var(--color-text-muted);
}

.search-clear {
  position: absolute;
  right: 8px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.65rem;
  cursor: pointer;
  padding: 4px;
}

.search-clear:hover {
  color: var(--color-text-primary);
}

.view-toggle {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.toggle-btn {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 0.95rem;
  transition: all var(--transition-fast);
}

.toggle-btn.active {
  background: var(--color-primary);
  color: white;
}

.toggle-btn:not(.active):hover {
  background: var(--color-surface-muted);
  color: var(--color-text-primary);
}
</style>
