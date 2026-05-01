import { describe, it, expect, vi } from 'vitest'
import type { RefObject } from 'react'
import { buildExportFilename, downloadBlob, exportPng } from '../exportImage'

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

describe('downloadBlob', () => {
  it('keeps the blob URL alive past the synthetic click', () => {
    vi.useFakeTimers()
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadBlob(new Blob(['pdf-ish'], { type: 'application/pdf' }), 'fieldnote.pdf')

    expect(createObjectURL).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    expect(revokeObjectURL).not.toHaveBeenCalled()

    vi.advanceTimersByTime(30_000)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test')

    click.mockRestore()
    createObjectURL.mockRestore()
    revokeObjectURL.mockRestore()
    vi.useRealTimers()
  })
})
