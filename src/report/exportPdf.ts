import type { ReportModel } from './buildReport'
import { downloadBlob } from '../analyze/exportImage'

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

  const blob = doc.output('blob')
  downloadBlob(blob, `fieldnote-${slugify(projectTitle)}-${model.cover.dateIso}.pdf`)
}
