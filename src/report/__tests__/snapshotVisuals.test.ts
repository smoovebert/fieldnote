import { describe, expect, it } from 'vitest'
import { cellHexForDocx, cellRgbForPdf, intensity, maxCount, textBar } from '../snapshotVisuals'

describe('snapshotVisuals', () => {
  it('maxCount returns the largest value across all rows and columns', () => {
    expect(maxCount([{ counts: [1, 2, 3] }, { counts: [4, 0, 2] }])).toBe(4)
    expect(maxCount([])).toBe(0)
  })

  it('intensity is 0 for zero count or zero max, sqrt-scaled otherwise', () => {
    expect(intensity(0, 10)).toBe(0)
    expect(intensity(5, 0)).toBe(0)
    expect(intensity(10, 10)).toBeCloseTo(1)
    // sqrt(0.25) = 0.5
    expect(intensity(2.5, 10)).toBeCloseTo(0.5)
  })

  it('cellRgbForPdf is darker at higher counts on every channel', () => {
    const zero = cellRgbForPdf(0, 10)
    const top = cellRgbForPdf(10, 10)
    // Top cell darker than zero on every channel — intensity scale is monotonic.
    expect(top[0]).toBeLessThan(zero[0])
    expect(top[1]).toBeLessThan(zero[1])
    expect(top[2]).toBeLessThan(zero[2])
  })

  it('cellHexForDocx returns 6 uppercase hex chars', () => {
    expect(cellHexForDocx(5, 10)).toMatch(/^[0-9A-F]{6}$/)
  })

  it('textBar scales fill chars proportionally and never exceeds maxChars', () => {
    expect(textBar(0, 10)).toBe('')
    expect(textBar(10, 10, 5)).toBe('█████')
    expect(textBar(5, 10, 10)).toBe('█████')
    // Tiny non-zero values still render at least one block so they're visible.
    expect(textBar(1, 1000, 20).length).toBe(1)
  })
})
