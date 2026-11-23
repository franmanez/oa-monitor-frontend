<script setup lang="ts">
import { OA_COLORS, oaTextColor } from '@/utils/oaRoutes'

const features = [
  {
    icon: 'bi-database',
    title: 'OpenAlex',
    desc: 'API académica abierta con más de 250M de publicaciones. Trae los artículos de cada universidad por ROR y año, con revista, DOI y estado OA.',
    color: 'var(--color-primary)'
  },
  {
    icon: 'bi-diagram-3',
    title: 'Repositorio institucional',
    desc: 'Cosechamos el repositorio propio de la universidad por OAI-PMH. Detecta artículos depositados en casa que OpenAlex no ve y los marca como GREEN.',
    color: 'var(--color-accent)'
  },
  {
    icon: 'bi-currency-euro',
    title: 'Precios APC reales',
    desc: 'Dataset OpenAPC con más de 269.000 APCs pagadas en Europa. Cruce por ISSN y año (mediana) para estimar qué cuesta publicar en abierto.',
    color: 'var(--color-success)'
  }
]

const oaStatuses = [
  { key: 'DIAMOND', label: 'Diamante', color: OA_COLORS.DIAMOND, desc: 'Revista 100% abierta sin coste para el autor ni para el lector. Financiada por instituciones o subvenciones.' },
  { key: 'GOLD', label: 'Oro', color: OA_COLORS.GOLD, desc: 'Artículo publicado en una revista de acceso abierto. El autor o su institución paga un APC (Article Processing Charge).' },
  { key: 'GREEN', label: 'Verde', color: OA_COLORS.GREEN, desc: 'Versión del artículo depositada en un repositorio institucional o temático (autoarchivado). Puede tener embargo.' },
  { key: 'HYBRID', label: 'Híbrido', color: OA_COLORS.HYBRID, desc: 'Artículo de acceso abierto en una revista de suscripción. Se paga un APC para liberar ese artículo concreto.' },
  { key: 'BRONZE', label: 'Bronce', color: OA_COLORS.BRONZE, desc: 'Artículo gratuito en la web del editor, pero sin licencia de acceso abierto explícita. Puede retirarse en cualquier momento.' },
  { key: 'CLOSED', label: 'Cerrado', color: OA_COLORS.CLOSED, desc: 'Artículo bajo muro de pago. Solo accesible mediante suscripción individual o institucional.' }
]

const steps = [
  { num: '01', title: 'Catálogo desde OpenAlex', desc: 'Por cada universidad y año consultamos OpenAlex filtrando solo artículos. Entran DOI, revista, título y el estado OA que declara el índice.' },
  { num: '02', title: 'Cruce con el repositorio', desc: 'Recorremos el repositorio de la universidad por OAI-PMH y fusionamos por DOI: lo que está depositado en casa se fuerza a GREEN y no se duplica.' },
  { num: '03', title: 'Precio APC de cada revista', desc: 'Cruzamos el ISSN con los precios pagados en OpenAPC (mediana por revista y año) para estimar el coste de los artículos GOLD e HYBRID.' },
  { num: '04', title: 'Informe y comparativa', desc: 'Resumen OA y coste estimado por universidad, ranking nacional por año, revistas que más gastan y exportación completa en CSV.' }
]
</script>

<template>
  <div class="landing fade-in-up">
    <!-- Hero -->
    <section class="hero">
      <div class="hero-badge">
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 4 A16 16 0 1 1 7.5 31" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
          <circle cx="20" cy="20" r="5.5" fill="currentColor"/>
          <line x1="20" y1="6" x2="20" y2="10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="34" y1="20" x2="30" y2="20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="20" y1="34" x2="20" y2="30" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="6" y1="20" x2="10" y2="20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
        <span>OpenScope — Acceso Abierto en Revistas</span>
      </div>
      <h1 class="hero-title">
        Monitor de Acceso Abierto en artículos de revistas de <span class="text-gradient">universidades españolas</span>
      </h1>
      <p class="hero-desc">
        Herramienta automatizada que audita el estado de Acceso Abierto de los artículos
        de revista de las universidades españolas, combinando OpenAlex con los
        repositorios institucionales y precios reales de APC.
      </p>
      <div class="hero-actions">
        <router-link to="/institutions" class="btn-primary-lg">
          <i class="bi bi-building"></i>
          Explorar universidades
        </router-link>
        <router-link to="/ranking" class="btn-outline-lg">
          <i class="bi bi-trophy"></i>
          Ver ranking
        </router-link>
      </div>
    </section>

    <!-- Sources -->
    <section class="section">
      <div class="section-header">
        <span class="section-tag">Fuentes de datos</span>
        <h2 class="section-title">De dónde vienen los datos</h2>
      </div>
      <div class="features-grid">
        <div v-for="f in features" :key="f.title" class="feature-card">
          <div class="feature-icon" :style="{ background: f.color + '15', color: f.color }">
            <i :class="'bi ' + f.icon"></i>
          </div>
          <h3 class="feature-title">{{ f.title }}</h3>
          <p class="feature-desc">{{ f.desc }}</p>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="section">
      <div class="section-header">
        <span class="section-tag">Cómo funciona</span>
        <h2 class="section-title">De la fuente al informe</h2>
        <p class="section-desc">
          Así se audita una universidad: cuatro pasos que convierten datos abiertos
          en una foto comparable de su Acceso Abierto.
        </p>
      </div>
      <div class="steps-grid">
        <div v-for="s in steps" :key="s.num" class="step-card">
          <span class="step-num">{{ s.num }}</span>
          <h3 class="step-title">{{ s.title }}</h3>
          <p class="step-desc">{{ s.desc }}</p>
        </div>
      </div>
      <p class="pipeline-example">
        <i class="bi bi-signpost-split"></i>
        Ejemplo real (UPC, 2025): 2.817 artículos de OpenAlex + 342 del repositorio
        → <strong>3.146 artículos únicos</strong>, fusionados por DOI.
      </p>
    </section>

    <!-- OA statuses -->
    <section class="section">
      <div class="section-header">
        <span class="section-tag">Estados OA</span>
        <h2 class="section-title">Rutas de Acceso Abierto</h2>
        <p class="section-desc">
          Cada artículo se clasifica según su estado de Acceso Abierto siguiendo
          la tipología estándar de la comunidad.
        </p>
      </div>
      <div class="statuses-grid">
        <div v-for="s in oaStatuses" :key="s.key" class="status-card">
          <div class="status-header" :style="{ background: s.color, color: oaTextColor(s.key) }">
            <span class="status-label" :style="{ color: oaTextColor(s.key) }">{{ s.label }}</span>
            <span class="status-key" :style="oaTextColor(s.key) === '#fff' ? {} : { color: 'rgba(31,41,55,0.75)', background: 'rgba(31,41,55,0.1)' }">{{ s.key }}</span>
          </div>
          <p class="status-desc">{{ s.desc }}</p>
        </div>
      </div>
    </section>

  </div>
</template>

<style scoped>
.landing {
  max-width: 100%;
}

/* ===== Hero ===== */
.hero {
  text-align: center;
  padding: var(--space-3xl) var(--space-xl);
  margin-bottom: var(--space-3xl);
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-size: 0.9375rem;
  font-weight: 600;
  padding: 0.375rem 0.875rem;
  border-radius: var(--radius-full);
  margin-bottom: var(--space-xl);
}

.hero-badge svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.hero-title {
  font-family: var(--font-display);
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.15;
  color: var(--color-text-primary);
  max-width: 720px;
  margin: 0 auto var(--space-md);
}

.text-gradient {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-desc {
  font-size: 1.125rem;
  line-height: 1.65;
  color: var(--color-text-secondary);
  max-width: 600px;
  margin: 0 auto var(--space-xl);
}

.hero-actions {
  display: flex;
  gap: var(--space-md);
  justify-content: center;
  flex-wrap: wrap;
}

.btn-primary-lg {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  background: var(--color-primary);
  color: #fff;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 600;
  text-decoration: none;
  transition: background var(--transition-fast), box-shadow var(--transition-fast);
}

.btn-primary-lg:hover {
  background: var(--color-primary-hover);
  box-shadow: var(--shadow-md);
}

.btn-outline-lg {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 600;
  text-decoration: none;
  border: 1px solid var(--color-border);
  transition: all var(--transition-fast);
}

.btn-outline-lg:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-text-muted);
}

/* ===== Sections ===== */
.section {
  margin-bottom: var(--space-3xl);
}

.section-header {
  text-align: center;
  margin-bottom: var(--space-xl);
}

.section-tag {
  display: inline-block;
  font-size: 0.8125rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-primary);
  background: var(--color-primary-soft);
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
  margin-bottom: var(--space-sm);
}

.section-title {
  font-family: var(--font-display);
  font-size: 1.625rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-text-primary);
  margin: 0 0 var(--space-sm);
}

.section-desc {
  font-size: 1rem;
  color: var(--color-text-secondary);
  max-width: 560px;
  margin: 0 auto;
  line-height: 1.6;
}

/* ===== Features ===== */
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
}

@media (max-width: 768px) {
  .features-grid {
    grid-template-columns: 1fr;
  }
}

.feature-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  transition: box-shadow var(--transition-base);
}

.feature-card:hover {
  box-shadow: var(--shadow-card-hover);
}

.feature-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  margin-bottom: var(--space-md);
}

.feature-title {
  font-size: 1.0625rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 var(--space-xs);
}

.feature-desc {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
  margin: 0;
}

/* ===== Steps ===== */
.steps-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
}

@media (max-width: 992px) {
  .steps-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 576px) {
  .steps-grid {
    grid-template-columns: 1fr;
  }
}

.step-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  position: relative;
  transition: box-shadow var(--transition-base);
}

.step-card:hover {
  box-shadow: var(--shadow-card-hover);
}

.step-num {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 800;
  color: var(--color-primary);
  opacity: 0.2;
  line-height: 1;
}

.step-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: var(--space-sm) 0 var(--space-xs);
}

.step-desc {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
  margin: 0;
}

.pipeline-example {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-md) var(--space-lg);
  margin: var(--space-md) auto 0;
  max-width: 720px;
  text-align: center;
}

.pipeline-example i {
  color: var(--color-primary);
  margin-right: var(--space-xs);
}

.pipeline-example strong {
  color: var(--color-text-primary);
}

/* ===== OA Statuses ===== */
.statuses-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
}

@media (max-width: 768px) {
  .statuses-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .statuses-grid {
    grid-template-columns: 1fr;
  }
}

.status-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: box-shadow var(--transition-base);
}

.status-card:hover {
  box-shadow: var(--shadow-card-hover);
}

.status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: 0.625rem var(--space-lg);
}

.status-label {
  font-size: 1.0625rem;
  font-weight: 700;
  color: #fff;
}

.status-key {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.2);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-full);
}

.status-desc {
  font-size: 0.9375rem;
  line-height: 1.55;
  color: var(--color-text-secondary);
  margin: 0;
  padding: var(--space-md) var(--space-lg) var(--space-lg);
}
</style>
