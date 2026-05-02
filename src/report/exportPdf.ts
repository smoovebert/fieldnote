import type { ReportModel } from './buildReport'
import { downloadBlob } from '../analyze/exportImage'
import { cellRgbForPdf, maxCount, textBar } from './snapshotVisuals'

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'report'
}

export async function exportReportPdf(
  model: ReportModel,
  projectTitle: string,
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 54 // 0.75in
  const contentWidth = pageWidth - margin * 2
  let y = margin

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage()
      y = margin
    }
  }

  const writeWrapped = (
    text: string,
    options: { size: number; bold?: boolean; color?: number; gap?: number },
  ) => {
    doc.setFontSize(options.size)
    doc.setFont('helvetica', options.bold ? 'bold' : 'normal')
    if (options.color !== undefined) doc.setTextColor(options.color)
    else doc.setTextColor(20)
    const lines = doc.splitTextToSize(text, contentWidth) as string[]
    const lineHeight = options.size * 1.4
    for (const line of lines) {
      ensureSpace(lineHeight)
      doc.text(line, margin, y)
      y += lineHeight
    }
    y += options.gap ?? 0
  }

  const sectionBreak = () => {
    doc.addPage()
    y = margin
  }

  // Cover
  writeWrapped('RESEARCH REPORT', { size: 11, bold: true, color: 120, gap: 12 })
  writeWrapped(model.cover.title, { size: 28, bold: true, gap: 8 })
  writeWrapped(
    `${model.cover.dateIso} · ${model.cover.counts.sources} sources · ${model.cover.counts.codes} codes · ${model.cover.counts.references} coded references · ${model.cover.counts.cases} cases`,
    { size: 10, color: 120, gap: 0 },
  )

  // Project memo
  if (model.projectMemo) {
    sectionBreak()
    writeWrapped('PROJECT MEMO', { size: 14, bold: true, gap: 16 })
    writeWrapped(model.projectMemo, { size: 11, gap: 0 })
  }

  // Codebook
  if (model.codebook.length > 0) {
    sectionBreak()
    writeWrapped('CODEBOOK', { size: 14, bold: true, gap: 16 })
    for (const entry of model.codebook) {
      const indent = entry.depth === 1 ? '   → ' : ''
      writeWrapped(`${indent}${entry.name}  (${entry.refCount} refs)`, {
        size: 11,
        bold: true,
        gap: 2,
      })
      if (entry.description) {
        writeWrapped(`${indent}${entry.description}`, { size: 10, color: 100, gap: 6 })
      } else {
        y += 4
      }
    }
  }

  // Sample excerpts
  if (model.sampleExcerpts.length > 0) {
    sectionBreak()
    writeWrapped('SAMPLE EXCERPTS', { size: 14, bold: true, gap: 16 })
    for (const entry of model.sampleExcerpts) {
      writeWrapped(entry.code.name, { size: 13, bold: true, gap: 6 })
      if (entry.codeMemo) {
        writeWrapped(entry.codeMemo, { size: 10, color: 100, gap: 6 })
      }
      for (const sample of entry.samples) {
        writeWrapped(`"${sample.text}"`, { size: 11, gap: 2 })
        const cite = sample.note ? `— ${sample.sourceTitle} — ${sample.note}` : `— ${sample.sourceTitle}`
        writeWrapped(cite, { size: 9, color: 120, gap: 8 })
      }
      y += 6
    }
  }

  // Cases
  if (model.cases.length > 0) {
    sectionBreak()
    writeWrapped('CASES', { size: 14, bold: true, gap: 16 })
    for (const c of model.cases) {
      writeWrapped(c.name, { size: 13, bold: true, gap: 4 })
      if (c.description) writeWrapped(c.description, { size: 11, gap: 6 })
      for (const a of c.attributes) {
        writeWrapped(`${a.name}: ${a.value}`, { size: 10, color: 100, gap: 2 })
      }
      if (c.sources.length > 0) {
        writeWrapped(`Sources: ${c.sources.map((s) => s.title).join(', ')}`, {
          size: 10,
          color: 100,
          gap: 12,
        })
      } else {
        y += 12
      }
    }
  }

  // Source memos
  if (model.sourceMemos.length > 0) {
    sectionBreak()
    writeWrapped('SOURCE MEMOS', { size: 14, bold: true, gap: 16 })
    for (const sm of model.sourceMemos) {
      writeWrapped(sm.sourceTitle, { size: 12, bold: true, gap: 4 })
      writeWrapped(sm.body, { size: 11, gap: 12 })
    }
  }

  // Analysis snapshots — every kind, dispatched from the result envelope.
  if (model.snapshotMemos.length > 0) {
    sectionBreak()
    writeWrapped('ANALYSIS SNAPSHOTS', { size: 14, bold: true, gap: 16 })
    for (const sm of model.snapshotMemos) {
      writeWrapped(sm.title, { size: 12, bold: true, gap: 4 })
      const metaLine = [`Captured ${new Date(sm.capturedAtIso).toLocaleString()}`, ...sm.activeFilters].join(' · ')
      writeWrapped(metaLine, { size: 9, color: 120, gap: 6 })
      if (sm.note) writeWrapped(sm.note, { size: 11, gap: 8 })
      if (sm.results.kind === 'coded_excerpt') {
        for (const sample of sm.results.excerpts) {
          writeWrapped(`"${sample.text}"`, { size: 11, gap: 2 })
          writeWrapped(`— ${sample.sourceTitle}`, { size: 9, color: 120, gap: 8 })
        }
      } else if (sm.results.kind === 'matrix' || sm.results.kind === 'crosstab') {
        // Shaded heatmap grid: cell intensity scales with count.
        // Truncate columns to keep the grid within the page width;
        // the full data is still available in CSV/XLSX export.
        const cols = sm.results.colLabels.slice(0, 6)
        const rowLabelW = 120
        const cellW = Math.max(40, Math.min(80, (contentWidth - rowLabelW) / Math.max(1, cols.length)))
        const cellH = 18
        const gridH = cellH * (sm.results.rows.length + 1)
        ensureSpace(gridH + 8)
        // Header row.
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(60)
        cols.forEach((label, i) => {
          const x = margin + rowLabelW + i * cellW
          doc.text(doc.splitTextToSize(label, cellW - 4)[0] ?? label, x + 4, y + 12)
        })
        y += cellH
        const max = maxCount(sm.results.rows)
        doc.setFont('helvetica', 'normal'); doc.setTextColor(20)
        for (const row of sm.results.rows) {
          ensureSpace(cellH)
          doc.text(doc.splitTextToSize(row.codeName, rowLabelW - 4)[0] ?? row.codeName, margin, y + 12)
          for (let i = 0; i < cols.length; i++) {
            const count = row.counts[i] ?? 0
            const [r, g, b] = cellRgbForPdf(count, max)
            const x = margin + rowLabelW + i * cellW
            doc.setFillColor(r, g, b)
            doc.rect(x, y, cellW, cellH, 'F')
            doc.setDrawColor(220); doc.rect(x, y, cellW, cellH, 'S')
            doc.text(String(count), x + cellW / 2, y + 12, { align: 'center' })
          }
          y += cellH
        }
        if (sm.results.colLabels.length > cols.length) {
          writeWrapped(`(${sm.results.colLabels.length - cols.length} more column${sm.results.colLabels.length - cols.length === 1 ? '' : 's'} in CSV export)`, { size: 9, color: 130, gap: 8 })
        } else {
          y += 8
        }
      } else if (sm.results.kind === 'frequency') {
        // Bar list: text label + █-block bar + count.
        const max = sm.results.rows.reduce((m, r) => Math.max(m, r.count), 0)
        for (const r of sm.results.rows) {
          writeWrapped(`${r.word.padEnd(18, ' ')} ${textBar(r.count, max)} ${r.count}`, { size: 10, gap: 2 })
        }
        writeWrapped('', { size: 11, gap: 8 })
      } else if (sm.results.kind === 'cooccurrence') {
        const max = sm.results.pairs.reduce((m, p) => Math.max(m, p.count), 0)
        for (const p of sm.results.pairs) {
          writeWrapped(`${p.codeAName} + ${p.codeBName}: ${textBar(p.count, max)} ${p.count}`, { size: 10, gap: 2 })
        }
        writeWrapped('', { size: 11, gap: 8 })
      }
    }
  }

  const blob = doc.output('blob')
  downloadBlob(blob, `fieldnote-${slugify(projectTitle)}-${model.cover.dateIso}.pdf`)
}
