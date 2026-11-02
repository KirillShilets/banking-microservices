/**
 * Visual designs for a card. Everything here is presentation-only: the backend
 * has no design field, so the choice is stored on the device together with the
 * order (see `card-order-store.ts`).
 *
 * Surfaces are plain CSS values so a custom palette can be rendered without
 * teaching Tailwind about user-picked colours.
 */
export type CardPattern = 'none' | 'grid' | 'dots' | 'waves'

export interface CardSurface {
  /** CSS `background` shorthand for the card body. */
  background: string
  /**
   * Uploaded artwork painted with `background-size: cover`, so it fills the
   * whole card face and is cropped symmetrically on both sides.
   */
  image?: string | null
  /** Primary text colour. */
  ink: string
  /** Secondary text colour for labels. */
  muted: string
  /** Chip and payment-system accent. */
  accent: string
  pattern: CardPattern
}

export interface CardDesign {
  id: string
  name: string
  description: string
  /** Design fee in roubles, `0` for the included line-up. */
  price: number
  surface: CardSurface
}

export const CUSTOM_DESIGN_ID = 'custom'

/** Custom artwork is produced by the design team, so it is a paid extra. */
export const CUSTOM_DESIGN_PRICE = 990

export const CARD_DESIGNS: readonly CardDesign[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Графит с лаймовым акцентом',
    price: 0,
    surface: {
      background: 'linear-gradient(140deg, #16233a 0%, #0d1727 52%, #060c14 100%)',
      ink: '#ffffff',
      muted: 'rgba(255, 255, 255, 0.62)',
      accent: '#d2f36b',
      pattern: 'grid',
    },
  },
  {
    id: 'lime',
    name: 'Lime Pop',
    description: 'Светлая карта с лаймовым градиентом',
    price: 0,
    surface: {
      background: 'linear-gradient(140deg, #f2ffcf 0%, #d2f36b 58%, #b6dd4d 100%)',
      ink: '#1a2410',
      muted: 'rgba(26, 36, 16, 0.58)',
      accent: '#1a2410',
      pattern: 'waves',
    },
  },
  {
    id: 'mint',
    name: 'Mint Glass',
    description: 'Мятная дымка и матовое стекло',
    price: 0,
    surface: {
      background: 'linear-gradient(140deg, #e0fbf0 0%, #b8ecd4 56%, #96dcc0 100%)',
      ink: '#123227',
      muted: 'rgba(18, 50, 39, 0.58)',
      accent: '#1e7a57',
      pattern: 'dots',
    },
  },
  {
    id: 'cobalt',
    name: 'Cobalt',
    description: 'Глубокий синий для валютных операций',
    price: 0,
    surface: {
      background: 'linear-gradient(140deg, #1b2ba8 0%, #3b5bfd 55%, #7f9dff 100%)',
      ink: '#ffffff',
      muted: 'rgba(255, 255, 255, 0.66)',
      accent: '#d2f36b',
      pattern: 'waves',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Тёплый градиент заката',
    price: 0,
    surface: {
      background: 'linear-gradient(140deg, #ffa877 0%, #e2683f 55%, #95362a 100%)',
      ink: '#fff8f4',
      muted: 'rgba(255, 248, 244, 0.68)',
      accent: '#ffe2ab',
      pattern: 'dots',
    },
  },
  {
    id: 'marble',
    name: 'Marble',
    description: 'Светлый мрамор с графитовым текстом',
    price: 0,
    surface: {
      background: 'linear-gradient(140deg, #fdfdf9 0%, #eef0e8 58%, #dde1d2 100%)',
      ink: '#0a121c',
      muted: 'rgba(10, 18, 28, 0.55)',
      accent: '#0a121c',
      pattern: 'grid',
    },
  },
] as const

export const CUSTOM_PALETTE: readonly {
  id: string
  label: string
  background: string
  ink: string
  muted: string
  accent: string
}[] = [
  {
    id: 'graphite',
    label: 'Графит',
    background: 'linear-gradient(140deg, #1c2836 0%, #0a121c 100%)',
    ink: '#ffffff',
    muted: 'rgba(255, 255, 255, 0.62)',
    accent: '#d2f36b',
  },
  {
    id: 'lime',
    label: 'Лайм',
    background: 'linear-gradient(140deg, #f4ffd8 0%, #d2f36b 100%)',
    ink: '#18230f',
    muted: 'rgba(24, 35, 15, 0.58)',
    accent: '#18230f',
  },
  {
    id: 'mint',
    label: 'Мята',
    background: 'linear-gradient(140deg, #e2fbf1 0%, #9fe3c4 100%)',
    ink: '#10352a',
    muted: 'rgba(16, 53, 42, 0.58)',
    accent: '#1e7a57',
  },
  {
    id: 'sky',
    label: 'Небо',
    background: 'linear-gradient(140deg, #d7e6ff 0%, #7aa9ff 100%)',
    ink: '#0d1c33',
    muted: 'rgba(13, 28, 51, 0.58)',
    accent: '#1d3f8f',
  },
  {
    id: 'sand',
    label: 'Песок',
    background: 'linear-gradient(140deg, #fdf2dc 0%, #f0cb95 100%)',
    ink: '#2e2411',
    muted: 'rgba(46, 36, 17, 0.58)',
    accent: '#8a5b12',
  },
  {
    id: 'rose',
    label: 'Роза',
    background: 'linear-gradient(140deg, #ffe2dc 0%, #f2a496 100%)',
    ink: '#3a1512',
    muted: 'rgba(58, 21, 18, 0.58)',
    accent: '#9c3a2a',
  },
  {
    id: 'lilac',
    label: 'Сирень',
    background: 'linear-gradient(140deg, #ece4ff 0%, #b7a1f0 100%)',
    ink: '#221442',
    muted: 'rgba(34, 20, 66, 0.58)',
    accent: '#4b2f9c',
  },
  {
    id: 'slate',
    label: 'Сланец',
    background: 'linear-gradient(140deg, #eef2f7 0%, #bcc7d5 100%)',
    ink: '#131c26',
    muted: 'rgba(19, 28, 38, 0.58)',
    accent: '#1f3244',
  },
] as const

export const CUSTOM_PATTERNS: readonly { id: CardPattern; label: string }[] = [
  { id: 'none', label: 'Без узора' },
  { id: 'grid', label: 'Сетка' },
  { id: 'dots', label: 'Точки' },
  { id: 'waves', label: 'Волны' },
] as const

export function findCardDesign(id: string): CardDesign {
  return CARD_DESIGNS.find((design) => design.id === id) ?? CARD_DESIGNS[0]
}

export function findPalette(id: string): (typeof CUSTOM_PALETTE)[number] {
  return CUSTOM_PALETTE.find((entry) => entry.id === id) ?? CUSTOM_PALETTE[0]
}

/** Resolves the surface the preview should paint for the current selection. */
export function buildSurface(
  designId: string,
  paletteId: string,
  pattern: CardPattern,
  artwork: string | null = null,
): CardSurface {
  if (designId !== CUSTOM_DESIGN_ID) {
    return findCardDesign(designId).surface
  }

  // Uploaded artwork wins over the palette: the photo covers the card and the
  // text switches to light-on-image with a dark scrim for contrast. The chosen
  // pattern is kept and painted on top of the photo.
  if (artwork) {
    return {
      background: '#0a121c',
      image: artwork,
      ink: '#ffffff',
      muted: 'rgba(255, 255, 255, 0.78)',
      accent: '#d2f36b',
      pattern,
    }
  }

  const palette = findPalette(paletteId)
  return {
    background: palette.background,
    image: null,
    ink: palette.ink,
    muted: palette.muted,
    accent: palette.accent,
    pattern,
  }
}

/** Human-readable design name, including the custom artwork case. */
export function designName(
  designId: string,
  paletteId: string,
  hasArtwork = false,
): string {
  if (designId !== CUSTOM_DESIGN_ID) {
    return findCardDesign(designId).name
  }
  if (hasArtwork) {
    return 'Свой дизайн · Фото'
  }
  return `Свой дизайн · ${findPalette(paletteId).label}`
}

/** Design fee in roubles: presets are included, custom artwork is paid. */
export function designPrice(designId: string): number {
  return designId === CUSTOM_DESIGN_ID ? CUSTOM_DESIGN_PRICE : 0
}
