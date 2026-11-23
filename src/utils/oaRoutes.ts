// Paleta de rutas de Acceso Abierto siguiendo los colores canónicos de
// OpenAIRE / Open Science Monitor (Green, Gold, Hybrid, Bronze) y su
// variante "Other Journals" en gris para CLOSED.

export const OA_COLORS: Record<string, string> = {
  DIAMOND: '#9c27b0',  // morado (OpenAIRE "in Diamond OA Journal")
  GOLD: '#f1c40f',     // dorado (OpenAIRE "Gold")
  HYBRID: '#f39c12',   // naranja (OpenAIRE "Hybrid")
  GREEN: '#447032',    // verde (OpenAIRE "Green")
  BRONZE: '#a0522d',   // marrón (OpenAIRE "Bronze")
  CLOSED: '#9e9e9e'    // gris (OpenAIRE "Other Journals")
}

// Rutas con fondo claro: necesitan texto oscuro para mantener el contraste
const LIGHT_ROUTES = new Set(['GOLD'])

export function oaTextColor(key: string | null | undefined): string {
  if (!key) return '#fff'
  return LIGHT_ROUTES.has(key) ? '#1f2937' : '#fff'
}

// Tono suave del color canónico de una ruta, para fondos de celda/columna.
// Derivado siempre de OA_COLORS: prohibido hardcodear variantes claras a mano.
export function oaSoftColor(route: string, alpha = 0.13): string {
  const hex = OA_COLORS[route]
  if (!hex) return 'transparent'
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function oaLabel(key: string | null): string {
  if (!key) return '—'
  const map: Record<string, string> = {
    GOLD: 'Oro', HYBRID: 'Híbrido', GREEN: 'Verde',
    BRONZE: 'Bronce', CLOSED: 'Cerrado', DIAMOND: 'Diamante'
  }
  return map[key] || key
}

export const OA_DESCRIPTIONS: Record<string, string> = {
  DIAMOND: 'Revista 100% abierta sin coste para el autor ni para el lector. Financiada por instituciones o subvenciones.',
  GOLD: 'Artículo publicado en una revista de acceso abierto. El autor o su institución paga un APC (Article Processing Charge).',
  GREEN: 'Versión del artículo depositada en un repositorio institucional o temático (autoarchivado). Puede tener embargo.',
  HYBRID: 'Artículo de acceso abierto en una revista de suscripción. Se paga un APC para liberar ese artículo concreto.',
  BRONZE: 'Artículo gratuito en la web del editor, pero sin licencia de acceso abierto explícita. Puede retirarse en cualquier momento.',
  CLOSED: 'Artículo bajo muro de pago. Solo accesible mediante suscripción individual o institucional.'
}

// Orden estable de las rutas para leyendas y segmentos de gráficas
export const OA_ROUTE_ORDER = ['GREEN', 'GOLD', 'HYBRID', 'DIAMOND', 'BRONZE', 'CLOSED'] as const
