import { describe, it, expect, vi } from 'vitest'
import type { RefObject } from 'react'
import { buildExportFilename, exportPng } from '../exportImage'

vi.mock('html-to-image', () => ({
  toPng: vi.fn().mockRejectedValue(new Error('canvas tainted')),
}))

describe('buildExportFilename', () => {
  it('builds expected shape', () => {
    const date = new Date('2026-04-29T12:00:00Z')
    expect(buildExportFilename('cooccurrence', 'heatmap', date))
      .toBe('fieldnote-cooccurrence-heatmap-2026-04-29.png')
  })
  it('handles all analysis names', () => {
    const date = new Date('2026-04-29T00:00:00Z')
    expect(buildExportFilename('wordFrequency', 'bar', date)).toBe('fieldnote-wordFrequency-bar-2026-04-29.png')
    expect(buildExportFilename('matrix', 'heatmap', date)).toBe('fieldnote-matrix-heatmap-2026-04-29.png')
  })
})

describe('exportPng error path', () => {
  it('returns null when html-to-image throws', async () => {
    const fakeRef = { current: document.createElement('div') }
    const blob = await exportPng(fakeRef as unknown as RefObject<HTMLElement | null>)
    expect(blob).toBeNull()
  })
  it('returns null when ref is null', async () => {
    const blob = await exportPng({ current: null })
    expect(blob).toBeNull()
  })
})
