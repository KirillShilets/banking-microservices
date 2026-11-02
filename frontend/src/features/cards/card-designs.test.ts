import { describe, expect, it } from 'vitest'
import {
  CARD_DESIGNS,
  CUSTOM_DESIGN_ID,
  CUSTOM_DESIGN_PRICE,
  CUSTOM_PALETTE,
  buildSurface,
  designName,
  designPrice,
  findCardDesign,
  findPalette,
} from './card-designs'

describe('card design catalogue', () => {
  it('ships six free presets and eight palette colours', () => {
    expect(CARD_DESIGNS).toHaveLength(6)
    expect(CUSTOM_PALETTE).toHaveLength(8)
    expect(CARD_DESIGNS.every((design) => design.price === 0)).toBe(true)
  })

  it('falls back to the first preset for unknown ids', () => {
    expect(findCardDesign('does-not-exist').id).toBe(CARD_DESIGNS[0].id)
    expect(findPalette('does-not-exist').id).toBe(CUSTOM_PALETTE[0].id)
  })
})

describe('buildSurface', () => {
  it('returns the preset surface untouched', () => {
    const surface = buildSurface('cobalt', 'graphite', 'grid')

    expect(surface).toEqual(findCardDesign('cobalt').surface)
    expect(surface.image).toBeUndefined()
  })

  it('paints the custom palette with the chosen pattern', () => {
    const palette = findPalette('mint')
    const surface = buildSurface(CUSTOM_DESIGN_ID, 'mint', 'dots', null)

    expect(surface.background).toBe(palette.background)
    expect(surface.ink).toBe(palette.ink)
    expect(surface.muted).toBe(palette.muted)
    expect(surface.accent).toBe(palette.accent)
    expect(surface.pattern).toBe('dots')
    expect(surface.image).toBeNull()
  })

  it('prefers uploaded artwork and keeps the pattern on top of it', () => {
    const surface = buildSurface(CUSTOM_DESIGN_ID, 'rose', 'waves', 'data:image/png;base64,AAA')

    expect(surface.image).toBe('data:image/png;base64,AAA')
    expect(surface.pattern).toBe('waves')
    expect(surface.ink).toBe('#ffffff')
    expect(surface.background).toBe('#0a121c')
  })

  it('ignores artwork for presets', () => {
    const surface = buildSurface('marble', 'rose', 'waves', 'data:image/png;base64,AAA')

    expect(surface).toEqual(findCardDesign('marble').surface)
  })
})

describe('designName', () => {
  it('names a preset', () => {
    expect(designName('sunset', 'graphite')).toBe('Sunset')
  })

  it('names a custom palette and a custom photo', () => {
    expect(designName(CUSTOM_DESIGN_ID, 'lilac')).toBe('Свой дизайн · Сирень')
    expect(designName(CUSTOM_DESIGN_ID, 'lilac', true)).toBe('Свой дизайн · Фото')
  })
})

describe('designPrice', () => {
  it('charges only for custom artwork', () => {
    expect(designPrice('midnight')).toBe(0)
    expect(designPrice(CUSTOM_DESIGN_ID)).toBe(CUSTOM_DESIGN_PRICE)
  })
})
