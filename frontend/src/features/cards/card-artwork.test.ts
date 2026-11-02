import { describe, expect, it } from 'vitest'
import {
  ARTWORK_MAX_BYTES,
  artworkError,
  artworkWarning,
  clampCrop,
  coverRect,
  cropRect,
  formatBytes,
} from './card-artwork'

describe('card artwork rules', () => {
  it('accepts big PNG and JPEG files up to the limit', () => {
    expect(artworkError({ type: 'image/png', size: 900_000 })).toBeNull()
    expect(artworkError({ type: 'image/jpeg', size: ARTWORK_MAX_BYTES })).toBeNull()
  })

  it('rejects unsupported types and oversized files', () => {
    expect(artworkError({ type: 'image/gif', size: 1024 })).toContain('PNG')
    expect(artworkError({ type: 'image/jpeg', size: ARTWORK_MAX_BYTES + 1 })).toContain('больше')
  })

  it('warns only about small images', () => {
    expect(artworkWarning({ width: 400, height: 250 })).toContain('Маленькое')
    expect(artworkWarning({ width: 2000, height: 2000 })).toBeNull()
  })

  it('formats sizes for hints', () => {
    expect(formatBytes(512)).toBe('512 Б')
    expect(formatBytes(2048)).toBe('2 КБ')
    expect(formatBytes(15 * 1024 * 1024)).toBe('15,0 МБ')
  })
})

describe('card artwork crop geometry', () => {
  it('crops the sides of a wide image and the top of a tall one', () => {
    // 2000×500 is wider than the card: full height, narrower width.
    expect(coverRect(2000, 500)).toEqual({ w: 500 * 1.586, h: 500 })
    // 500×2000 is taller: full width, narrower height.
    expect(coverRect(500, 2000)).toEqual({ w: 500, h: 500 / 1.586 })
  })

  it('keeps the default crop centred and inside the image', () => {
    const rect = cropRect(2000, 500, { zoom: 1, x: 1000, y: 250 })
    expect(rect.x).toBeCloseTo(1000 - (500 * 1.586) / 2, 5)
    expect(rect.y).toBeCloseTo(0, 5)
    expect(rect.w / rect.h).toBeCloseTo(1.586, 3)
  })

  it('zoom shrinks the visible fragment', () => {
    const wide = cropRect(2000, 500, { zoom: 2, x: 1000, y: 250 })
    expect(wide.w).toBeCloseTo((500 * 1.586) / 2, 5)
  })

  it('clamps panning to the image bounds', () => {
    const clamped = clampCrop(2000, 500, { zoom: 2, x: 0, y: 0 })
    expect(clamped.x).toBeCloseTo((500 * 1.586) / 4, 5)
    expect(clamped.y).toBeCloseTo(500 / 4, 5)
  })
})
