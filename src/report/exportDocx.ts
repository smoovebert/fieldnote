import type { ReportModel } from './buildReport'
import { downloadBlob } from '../analyze/exportImage'

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'report'
}

export async function exportReportDocx(
  model: ReportModel,
  projectTitle: string,
): Promise<void> {
  const docx = await import('docx')
  const { Document, Packer, Paragraph, HeadingLevel, TextRun } = docx

  const para = (text: string, opts: { bold?: boolean; size?: number; color?: string } = {}) =>
    new Paragraph({
      children: [
        new TextRun({
          text,
          bold: opts.bold ?? false,
          size: opts.size ?? 22, // half-points; 22 = 11pt
          color: opts.color ?? '202020',
        }),
      ],
      spacing: { after: 120 },
    })

  const heading = (text: string, level: 1 | 2 | 3) =>
    new Paragraph({
      text,
      heading:
        level === 1
          ? HeadingLevel.HEADING_1
          : level === 2
            ? HeadingLevel.HEADING_2
            : HeadingLevel.HEADING_3,
      spacing: { before: 240, after: 120 },
    })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sections: any[] = []

  // Cover
  sections.push(heading(model.cover.title, 1))
  sections.push(
    para(
      `${model.cover.dateIso} · ${model.cover.counts.sources} sources · ${model.cover.counts.codes} codes · ${model.cover.counts.references} coded references · ${model.cover.counts.cases} cases`,
      { color: '707070', size: 20 },
    ),
  )

  // Project memo
  if (model.projectMemo) {
    sections.push(heading('Project memo', 2))
    sections.push(para(model.projectMemo))
  }

  // Codebook
  if (model.codebook.length > 0) {
    sections.push(heading('Codebook', 2))
    for (const entry of model.codebook) {
      const indent = entry.depth === 1 ? '   → ' : ''
      sections.push(para(`${indent}${entry.name}  (${entry.refCount} refs)`, { bold: true }))
      if (entry.description) sections.push(para(`${indent}${entry.description}`, { color: '606060' }))
    }
  }

  // Sample excerpts
  if (model.sampleExcerpts.length > 0) {
    sections.push(heading('Sample excerpts', 2))
    for (const entry of model.sampleExcerpts) {
      sections.push(heading(entry.code.name, 3))
      if (entry.codeMemo) sections.push(para(entry.codeMemo, { color: '606060' }))
      for (const sample of entry.samples) {
        sections.push(para(`"${sample.text}"`))
        const cite = sample.note ? `— ${sample.sourceTitle} — ${sample.note}` : `— ${sample.sourceTitle}`
        sections.push(para(cite, { color: '707070', size: 20 }))
      }
    }
  }

  // Cases
  if (model.cases.length > 0) {
    sections.push(heading('Cases', 2))
    for (const c of model.cases) {
      sections.push(heading(c.name, 3))
      if (c.description) sections.push(para(c.description))
      for (const a of c.attributes) sections.push(para(`${a.name}: ${a.value}`, { color: '606060' }))
      if (c.sources.length > 0) {
        sections.push(para(`Sources: ${c.sources.map((s) => s.title).join(', ')}`, { color: '606060' }))
      }
    }
  }

  // Source memos
  if (model.sourceMemos.length > 0) {
    sections.push(heading('Source memos', 2))
    for (const sm of model.sourceMemos) {
      sections.push(heading(sm.sourceTitle, 3))
      sections.push(para(sm.body))
    }
  }

  // Analysis snapshots — every kind, dispatched from the result envelope.
  if (model.snapshotMemos.length > 0) {
    sections.push(heading('Analysis snapshots', 2))
    for (const sm of model.snapshotMemos) {
      sections.push(heading(sm.title, 3))
      const metaParts = [`Captured ${new Date(sm.capturedAtIso).toLocaleString()}`, ...sm.activeFilters]
      sections.push(para(metaParts.join(' · '), { color: '606060' }))
      if (sm.note) sections.push(para(sm.note))
      if (sm.results.kind === 'coded_excerpt') {
        for (const sample of sm.results.excerpts) {
          sections.push(para(`"${sample.text}"`))
          sections.push(para(`— ${sample.sourceTitle}`, { color: '606060' }))
        }
      } else if (sm.results.kind === 'matrix' || sm.results.kind === 'crosstab') {
        sections.push(para(['Code', ...sm.results.colLabels].join(' | '), { color: '606060' }))
        for (const row of sm.results.rows) {
          sections.push(para([row.codeName, ...row.counts.map(String)].join(' | ')))
        }
      } else if (sm.results.kind === 'frequency') {
        for (const r of sm.results.rows) {
          sections.push(para(`${r.word}: ${r.count} (${r.excerptCount} excerpts)`))
        }
      } else if (sm.results.kind === 'cooccurrence') {
        for (const p of sm.results.pairs) {
          sections.push(para(`${p.codeAName} + ${p.codeBName}: ${p.count}`))
        }
      }
    }
  }

  const docFile = new Document({ sections: [{ children: sections }] })
  const blob = await Packer.toBlob(docFile)
  downloadBlob(blob, `fieldnote-${slugify(projectTitle)}-${model.cover.dateIso}.docx`)
}
