import * as htmlToImage from 'html-to-image'
import type { RefObject } from 'react'

export type AnalysisName = 'wordFrequency' | 'cooccurrence' | 'matrix'

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function buildExportFilename(analysis: string, view: string, when: Date = new Date()): string {
  return `fieldnote-${analysis}-${view}-${isoDate(when)}.png`
}

export async function exportPng(ref: RefObject<HTMLElement | null>): Promise<Blob | null> {
  if (!ref.current) return null
  try {
    const dataUrl = await htmlToImage.toPng(ref.current, { pixelRatio: 2, cacheBust: true })
    const res = await fetch(dataUrl)
    return await res.blob()
  } catch (err) {
    console.warn('[exportImage] PNG export failed', err)
    return null
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function exportCanvasPng(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), 'image/png')
    } catch (err) {
      console.warn('[exportImage] canvas export failed', err)
      resolve(null)
    }
  })
}
