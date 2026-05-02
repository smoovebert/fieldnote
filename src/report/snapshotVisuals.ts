// Shared math + color helpers for embedded snapshot visuals in the
// Report (HTML preview, PDF, DOCX). Same intensity scale across all
// three renderers so a print-out reads the same as the on-screen
// preview.

export function maxCount(rows: Array<{ counts: number[] }>): number {
  let max = 0
  for (const row of rows) for (const c of row.counts) if (c > max) max = c
  return max
}

// Heatmap intensity in [0..1]. Square root keeps small values visible.
export function intensity(count: number, max: number): number {
  if (max <= 0 || count <= 0) return 0
  return Math.sqrt(count / max)
}

// CSS rgba teal at intensity opacity, suitable for inline style on a
// preview cell.
export function cellBgCss(count: number, max: number): string {
  const i = intensity(count, max)
  if (i === 0) return 'transparent'
  return `rgba(15, 118, 110, ${(0.06 + i * 0.5).toFixed(3)})`
}

// jspdf's setFillColor takes 0-255 rgb. Returns the teal channel
// triplet at the given intensity, lightened against white.
export function cellRgbForPdf(count: number, max: number): [number, number, number] {
  const i = intensity(count, max)
  const t = 0.06 + i * 0.5 // matches the CSS opacity scale
  // base teal #0F766E on white background
  const r = Math.round(255 - (255 - 15) * t)
  const g = Math.round(255 - (255 - 118) * t)
  const b = Math.round(255 - (255 - 110) * t)
  return [r, g, b]
}

// DOCX shading uses 6-digit hex strings. Same teal-on-white blend.
export function cellHexForDocx(count: number, max: number): string {
  const [r, g, b] = cellRgbForPdf(count, max)
  return [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase()
}

// Block-character bar for text-only contexts (PDF rows that already
// flow as text, DOCX paragraphs). Returns a string of fill chars
// proportional to value/max, capped at maxChars wide.
export function textBar(value: number, max: number, maxChars = 20): string {
  if (max <= 0 || value <= 0) return ''
  const fill = Math.max(1, Math.round((value / max) * maxChars))
  return '█'.repeat(fill)
}
