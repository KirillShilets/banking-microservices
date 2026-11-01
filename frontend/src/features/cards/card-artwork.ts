/**
 * Rules and geometry for uploaded card artwork.
 *
 * The card face is 1.586:1 (85.6 × 53.98 mm). A photo is shown with
 * `cover` semantics, but the customer picks the visible fragment first, so the
 * crop math lives here and is shared by the preview and the canvas render.
 */
export const CARD_ASPECT = 1.586

/** Rendered size of the artwork that is stored with the order. */
export const ARTWORK_OUTPUT = { width: 1006, height: 628 } as const
/** Small preview kept in localStorage for the sidebar card switcher. */
export const ARTWORK_THUMB = { width: 320, height: 202 } as const

export const ARTWORK_MIN_WIDTH = 640
export const ARTWORK_MIN_HEIGHT = 404
export const ARTWORK_MAX_BYTES = 15 * 1024 * 1024

export const ARTWORK_ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

export interface ArtworkMeta {
  name: string
  type: string
  width: number
  height: number
  /** File size in bytes. */
  size: number
}

export interface ArtworkCrop {
  /** 1 = the largest fragment the card can show without empty edges. */
  zoom: number
  /** Crop centre in source pixels. */
  x: number
  y: number
}

/** Hard failures: the file cannot be used at all. */
export function artworkError(meta: Pick<ArtworkMeta, 'type' | 'size'>): string | null {
  if (!ARTWORK_ACCEPTED_TYPES.includes(meta.type as (typeof ARTWORK_ACCEPTED_TYPES)[number])) {
    return 'Поддерживаются PNG, JPG и WEBP'
  }
  if (meta.size > ARTWORK_MAX_BYTES) {
    return `Файл больше ${formatBytes(ARTWORK_MAX_BYTES)} — уменьшите изображение`
  }
  return null
}

/** Soft warnings: the file works, but the card may look blurry. */
export function artworkWarning(meta: Pick<ArtworkMeta, 'width' | 'height'>): string | null {
  if (meta.width < ARTWORK_MIN_WIDTH || meta.height < ARTWORK_MIN_HEIGHT) {
    return `Маленькое изображение (${meta.width}×${meta.height}) — на пластике может быть размытым`
  }
  return null
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} МБ`
}

/** Largest source rectangle the card can show without empty edges. */
export function coverRect(width: number, height: number): { w: number; h: number } {
  const imageAspect = width / height
  if (imageAspect > CARD_ASPECT) {
    // Wider than the card: full height, crop the sides.
    return { w: height * CARD_ASPECT, h: height }
  }
  return { w: width, h: width / CARD_ASPECT }
}

/** Default crop: the largest centred fragment. */
export function defaultCrop(width: number, height: number): ArtworkCrop {
  return { zoom: 1, x: width / 2, y: height / 2 }
}

/**
 * Source rectangle for the current crop, clamped to the image bounds so the
 * preview never shows empty edges.
 */
export function cropRect(
  width: number,
  height: number,
  crop: ArtworkCrop,
): { x: number; y: number; w: number; h: number } {
  const base = coverRect(width, height)
  const zoom = Math.min(Math.max(crop.zoom, 1), 4)
  const w = base.w / zoom
  const h = base.h / zoom
  const halfW = w / 2
  const halfH = h / 2
  const x = Math.min(Math.max(crop.x, halfW), width - halfW) - halfW
  const y = Math.min(Math.max(crop.y, halfH), height - halfH) - halfH
  return { x, y, w, h }
}

/** Keeps the crop centre inside the image after a drag or zoom change. */
export function clampCrop(width: number, height: number, crop: ArtworkCrop): ArtworkCrop {
  const base = coverRect(width, height)
  const zoom = Math.min(Math.max(crop.zoom, 1), 4)
  const halfW = base.w / zoom / 2
  const halfH = base.h / zoom / 2
  return {
    zoom,
    x: Math.min(Math.max(crop.x, halfW), width - halfW),
    y: Math.min(Math.max(crop.y, halfH), height - halfH),
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Не удалось прочитать изображение'))
    image.src = src
  })
}

function drawTo(
  image: HTMLImageElement,
  rect: { x: number; y: number; w: number; h: number },
  size: { width: number; height: number },
  quality?: number,
): string {
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas недоступен')

  context.drawImage(image, rect.x, rect.y, rect.w, rect.h, 0, 0, size.width, size.height)
  return quality
    ? canvas.toDataURL('image/jpeg', quality)
    : canvas.toDataURL('image/png')
}

/**
 * Renders the chosen fragment to the card resolution plus a small preview that
 * is cheap enough to keep in localStorage.
 */
export async function renderArtwork(
  source: string,
  meta: Pick<ArtworkMeta, 'width' | 'height'>,
  crop: ArtworkCrop,
): Promise<{ card: string; thumb: string }> {
  const image = await loadImage(source)
  const rect = cropRect(meta.width, meta.height, crop)
  return {
    card: drawTo(image, rect, ARTWORK_OUTPUT, 0.92),
    thumb: drawTo(image, rect, ARTWORK_THUMB, 0.72),
  }
}
