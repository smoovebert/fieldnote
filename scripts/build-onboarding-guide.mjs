import fs from 'node:fs/promises'
import path from 'node:path'
import { jsPDF } from 'jspdf'
import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from 'docx'

const ROOT = process.cwd()
const OUT_PDF = path.join(ROOT, 'output/pdf/fieldnote-onboarding-guide.pdf')
const OUT_DOCX = path.join(ROOT, 'output/doc/fieldnote-onboarding-guide.docx')
const OUT_MD = path.join(ROOT, 'docs/onboarding-guide.md')

const fontPath = '/System/Library/Fonts/SFNS.ttf'
const screenshots = {
  workspaceTall: path.join(ROOT, 'output/playwright/fieldnote-nvivo-inspired.png'),
  workspaceWide: path.join(ROOT, 'output/playwright/fieldnote-desktop.png'),
  auth: path.join(ROOT, 'output/playwright/fieldnote-flow-pass.png'),
}

const brand = {
  navy: [22, 53, 88],
  teal: [13, 92, 99],
  blue: [63, 81, 181],
  brown: [120, 71, 34],
  ink: [25, 31, 42],
  muted: [101, 112, 128],
  line: [214, 221, 230],
  paper: [248, 249, 250],
  white: [255, 255, 255],
}

const docxTheme = {
  titleFont: 'Arial',
  bodyFont: 'Arial',
  ink: '191F2A',
  muted: '657080',
  navy: '173F6E',
  teal: '0D5C63',
  paper: 'F8F9FA',
  line: 'D6DDE6',
}

const modes = [
  ['Overview', 'Pick a project, check safety, open settings.'],
  ['Organize', 'Import interviews and documents.'],
  ['Code', 'Highlight passages and apply one or more codes.'],
  ['Refine', 'Clean the codebook and review references.'],
  ['Classify', 'Create cases and attributes for comparison.'],
  ['Analyze', 'Ask questions of coded material.'],
  ['Report', 'Export evidence and readable reports.'],
]

const pages = [
  {
    title: 'Fieldnote Onboarding Guide',
    kicker: 'Quick start for qualitative researchers',
    body: [
      'Fieldnote is a workspace for interview and document analysis. It helps you import sources, code evidence, refine themes, compare participants, and export report-ready material.',
      'This guide is the short path: what to do first, what each mode is for, and how to avoid losing work.',
    ],
    visual: 'workflow',
  },
  {
    title: 'The First 10 Minutes',
    kicker: 'Start with the sample, then make a real project',
    bullets: [
      'Open the Sample project first. It is safe practice data.',
      'Create a blank project when you are ready for real material.',
      'Import one or two transcripts before importing everything.',
      'Make a few codes while reading. You can clean them up later.',
      'Download a backup before large deletes, merges, or imports.',
    ],
    callout: 'Good first goal: import one interview, code three useful passages, then export a tiny report.',
    visual: 'firstSession',
  },
  {
    title: 'Organize And Code',
    kicker: 'Bring in sources, then stay close to the text',
    bullets: [
      'Use Organize to import TXT, Markdown, CSV, DOCX, and PDF files.',
      'Use folders for practical grouping: Interviews, Follow-ups, Fieldnotes, Documents.',
      'Use Code mode for close reading. Select text, choose active codes, then code the selection.',
      'One passage can have multiple codes. That is normal qualitative work.',
      'PDFs appear as page cards; new PDF excerpts keep page citations such as "Interview 03, p. 5".',
      'Use source memos for first impressions and context about a particular source.',
    ],
    visual: 'workspace',
  },
  {
    title: 'Refine And Classify',
    kicker: 'Turn first-pass coding into an analyzable project',
    bullets: [
      'Use Refine after your first coding pass.',
      'Rename vague codes, add descriptions, and review each code reference.',
      'Drag codes to nest related themes under broader parent codes.',
      'Use Classify to create cases such as participants, sites, or groups.',
      'Add attributes such as Role, Cohort, Site, or First-generation status.',
    ],
    callout: 'Classify makes comparison possible. Without cases and attributes, Analyze can still find evidence, but it cannot compare groups very well.',
    visual: 'refineClassify',
  },
  {
    title: 'Analyze Is A Question Workspace',
    kicker: 'Every number should lead back to evidence',
    bullets: [
      'Evidence: find excerpts by text, code, case, and attributes.',
      'Compare: look at code counts across cases or attribute groups.',
      'Language: inspect word frequency inside the current filtered excerpts.',
      'Relationships: see which codes appear together on the same excerpts.',
      'Save useful questions and pin snapshots when you want an audit trail.',
    ],
    callout: 'Best habit: when a table cell has a number, click it and inspect the excerpts behind it.',
    visual: 'analyze',
  },
  {
    title: 'Report And Export',
    kicker: 'Move from analysis to shareable evidence',
    bullets: [
      'Use Report mode to preview project memo, codebook, coded excerpts, cases, and source memos.',
      'Export Word or PDF when you need a readable report.',
      'Export CSV or XLSX when you need tables, raw excerpts, codebooks, case sheets, or memo data.',
      'PDF-coded excerpts include page citations in readable reports and a Page column in spreadsheet exports.',
      'Use Analyze exports for current question results, matrices, crosstabs, word frequency, and co-occurrence.',
    ],
    visual: 'report',
  },
  {
    title: 'Safety And Recovery',
    kicker: 'Protect the work before doing big changes',
    bullets: [
      'Fieldnote autosaves to Supabase while you work.',
      'A local browser recovery snapshot helps protect recent unsynced work.',
      'A .fieldnote.json backup is the safest portable recovery file.',
      'Download a backup before deletes, merges, large imports, or major codebook cleanup.',
      'If save status looks wrong, do not close the tab until you have checked the connection or downloaded a backup.',
    ],
    visual: 'safety',
  },
  {
    title: 'AI Assist',
    kicker: 'Optional suggestions, never silent changes',
    bullets: [
      'AI can suggest codes, draft code descriptions, summarize sources, and draft project memos from snapshots.',
      'AI drafts appear in a preview surface. Review before inserting.',
      'Hosted Gemini is convenient but has quota and consent limits.',
      'For sensitive or IRB-protected work, use your own provider key.',
      'Your saved provider key is encrypted and used server-side only.',
    ],
    callout: 'Rule of thumb: AI can help draft language, but the researcher decides what becomes project data.',
    visual: 'ai',
  },
]

function rgb(doc, color) {
  doc.setTextColor(...color)
}

function fill(doc, color) {
  doc.setFillColor(...color)
}

function stroke(doc, color) {
  doc.setDrawColor(...color)
}

function wrap(doc, text, width) {
  return doc.splitTextToSize(text, width)
}

function line(doc, text, x, y, opts = {}) {
  doc.setFont(opts.bold ? 'helvetica' : 'FieldnoteUI', opts.bold ? 'bold' : 'normal')
  doc.setFontSize(opts.size ?? 10)
  rgb(doc, opts.color ?? brand.ink)
  doc.text(text, x, y)
}

function para(doc, text, x, y, width, opts = {}) {
  doc.setFont(opts.bold ? 'helvetica' : 'FieldnoteUI', opts.bold ? 'bold' : 'normal')
  doc.setFontSize(opts.size ?? 10)
  rgb(doc, opts.color ?? brand.ink)
  const lines = wrap(doc, text, width)
  doc.text(lines, x, y)
  return y + lines.length * (opts.leading ?? 14)
}

function pill(doc, text, x, y, w, color) {
  fill(doc, color)
  doc.roundedRect(x, y, w, 24, 4, 4, 'F')
  line(doc, text, x + 9, y + 16, { size: 9, bold: true, color: brand.white })
}

function drawFrame(doc, x, y, w, h) {
  fill(doc, brand.paper)
  stroke(doc, brand.line)
  doc.roundedRect(x, y, w, h, 6, 6, 'FD')
}

function drawWorkflow(doc, x, y) {
  const colors = [brand.navy, brand.teal, brand.blue, brand.brown, brand.navy, brand.teal, brand.blue]
  modes.forEach(([name], i) => {
    const px = x
    const py = y + i * 30
    pill(doc, name, px, py, 150, colors[i])
    if (i < modes.length - 1) {
      line(doc, 'v', px + 170, py + 16, { size: 9, bold: true, color: brand.muted })
    }
  })
}

function drawWorkspace(doc, x, y) {
  drawFrame(doc, x, y, 330, 160)
  fill(doc, brand.navy)
  doc.rect(x, y, 70, 160, 'F')
  fill(doc, brand.white)
  doc.rect(x + 70, y, 260, 28, 'F')
  stroke(doc, brand.line)
  doc.line(x + 70, y + 28, x + 330, y + 28)
  line(doc, 'Modes', x + 18, y + 26, { size: 8, bold: true, color: brand.white })
  line(doc, 'Source viewer', x + 92, y + 58, { size: 10, bold: true })
  line(doc, 'Codebook / memo / inspector', x + 218, y + 58, { size: 10, bold: true })
  stroke(doc, brand.line)
  doc.line(x + 205, y + 28, x + 205, y + 160)
  fill(doc, [235, 247, 247])
  doc.roundedRect(x + 92, y + 78, 92, 18, 3, 3, 'F')
  doc.roundedRect(x + 92, y + 106, 112, 18, 3, 3, 'F')
  fill(doc, [242, 239, 235])
  doc.roundedRect(x + 226, y + 82, 72, 18, 3, 3, 'F')
  doc.roundedRect(x + 226, y + 110, 52, 18, 3, 3, 'F')
}

function drawQuestionMap(doc, x, y) {
  const cards = [
    ['Evidence', 'Find excerpts'],
    ['Compare', 'Codes by group'],
    ['Language', 'Word frequency'],
    ['Relationships', 'Co-occurrence'],
  ]
  cards.forEach(([a, b], i) => {
    const px = x + (i % 2) * 168
    const py = y + Math.floor(i / 2) * 68
    drawFrame(doc, px, py, 146, 48)
    line(doc, a, px + 12, py + 18, { size: 11, bold: true, color: i % 2 ? brand.blue : brand.teal })
    line(doc, b, px + 12, py + 34, { size: 9, color: brand.muted })
  })
}

function drawSafety(doc, x, y) {
  const items = [
    ['Autosave', 'Supabase cloud save'],
    ['Local recovery', 'Browser snapshot'],
    ['Backup file', '.fieldnote.json'],
  ]
  items.forEach(([a, b], i) => {
    drawFrame(doc, x + i * 108, y + i * 20, 160, 50)
    line(doc, a, x + i * 108 + 14, y + i * 20 + 21, { size: 11, bold: true, color: brand.teal })
    line(doc, b, x + i * 108 + 14, y + i * 20 + 37, { size: 8, color: brand.muted })
  })
}

function drawReport(doc, x, y) {
  drawFrame(doc, x, y, 330, 150)
  line(doc, 'Report preview', x + 18, y + 26, { size: 12, bold: true })
  ;['Project memo', 'Codebook', 'Coded excerpts', 'Cases', 'Source memos'].forEach((t, i) => {
    stroke(doc, brand.line)
    doc.line(x + 18, y + 44 + i * 16, x + 190, y + 44 + i * 16)
    line(doc, t, x + 18, y + 55 + i * 16, { size: 8, color: brand.muted })
  })
  pill(doc, 'PDF', x + 225, y + 52, 64, brand.teal)
  pill(doc, 'Word', x + 225, y + 86, 64, brand.blue)
}

function drawVisual(doc, kind, x, y) {
  if (kind === 'workflow' || kind === 'firstSession') drawWorkflow(doc, x, y)
  else if (kind === 'workspace' || kind === 'refineClassify') drawWorkspace(doc, x, y)
  else if (kind === 'analyze') drawQuestionMap(doc, x, y)
  else if (kind === 'safety') drawSafety(doc, x, y)
  else if (kind === 'report') drawReport(doc, x, y)
  else {
    drawFrame(doc, x, y, 330, 150)
    pill(doc, 'Suggest', x + 24, y + 42, 74, brand.teal)
    pill(doc, 'Preview', x + 128, y + 42, 74, brand.blue)
    pill(doc, 'Approve', x + 232, y + 42, 74, brand.brown)
    line(doc, 'AI proposes. Researcher decides.', x + 52, y + 112, { size: 12, bold: true, color: brand.ink })
  }
}

async function imageData(pathname) {
  const raw = await fs.readFile(pathname)
  return `data:image/png;base64,${raw.toString('base64')}`
}

function imageFit(doc, dataUrl, x, y, maxW, maxH) {
  const props = doc.getImageProperties(dataUrl)
  const scale = Math.min(maxW / props.width, maxH / props.height)
  const w = props.width * scale
  const h = props.height * scale
  stroke(doc, brand.line)
  doc.roundedRect(x - 1, y - 1, w + 2, h + 2, 7, 7, 'S')
  doc.addImage(dataUrl, 'PNG', x, y, w, h)
  return { w, h }
}

function addPageChrome(doc, index) {
  fill(doc, brand.navy)
  doc.rect(0, 0, 46, 792, 'F')
  line(doc, 'FIELDNOTE', 58, 36, { size: 9, bold: true, color: brand.teal })
  line(doc, String(index + 1).padStart(2, '0'), 514, 750, { size: 9, color: brand.muted })
}

async function buildPdf() {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const sf = await fs.readFile(fontPath)
  doc.addFileToVFS('SFNS.ttf', sf.toString('base64'))
  doc.addFont('SFNS.ttf', 'FieldnoteUI', 'normal')
  const workspaceTall = await imageData(screenshots.workspaceTall)
  const workspaceWide = await imageData(screenshots.workspaceWide)
  const auth = await imageData(screenshots.auth)
  pages.forEach((page, index) => {
    if (index > 0) doc.addPage()
    addPageChrome(doc, index)
    let y = 82
    line(doc, page.kicker.toUpperCase(), 78, y, { size: 9, bold: true, color: brand.teal })
    y += 30
    y = para(doc, page.title, 78, y, 390, { size: index === 0 ? 30 : 25, bold: true, leading: 32 })
    y += 8
    if (page.body) {
      page.body.forEach((text) => {
        y = para(doc, text, 78, y, 410, { size: 11, leading: 16, color: brand.ink })
        y += 8
      })
    }
    if (page.bullets) {
      page.bullets.forEach((text) => {
        fill(doc, brand.teal)
        doc.circle(84, y - 4, 2.5, 'F')
        y = para(doc, text, 96, y, 400, { size: 10.5, leading: 15 })
        y += 6
      })
    }
    if (page.callout) {
      y += 8
      fill(doc, [238, 247, 247])
      stroke(doc, [180, 218, 218])
      doc.roundedRect(78, y, 418, 58, 5, 5, 'FD')
      para(doc, page.callout, 94, y + 22, 386, { size: 10, leading: 14, bold: true, color: brand.teal })
      y += 78
    }
    const visualY = Math.max(y + 18, index === 0 ? 456 : 500)
    if (index === 0) imageFit(doc, workspaceTall, 78, visualY, 410, 250)
    else if (page.visual === 'workspace') imageFit(doc, workspaceWide, 78, visualY, 410, 240)
    else if (page.visual === 'refineClassify') imageFit(doc, workspaceTall, 78, visualY, 410, 250)
    else if (page.visual === 'firstSession') imageFit(doc, auth, 78, visualY, 410, 230)
    else drawVisual(doc, page.visual, 78, visualY)
  })
  await fs.mkdir(path.dirname(OUT_PDF), { recursive: true })
  await fs.writeFile(OUT_PDF, Buffer.from(doc.output('arraybuffer')))
}

function mdEscape(text) {
  return text.replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function docxText(text, options = {}) {
  return new TextRun({
    text,
    font: options.font ?? docxTheme.bodyFont,
    color: options.color ?? docxTheme.ink,
    bold: options.bold,
    italics: options.italics,
  })
}

async function buildMarkdown() {
  let md = '# Fieldnote Onboarding Guide\n\n'
  md += 'A quick-start guide for qualitative researchers using Fieldnote.\n\n'
  for (const page of pages.slice(1)) {
    md += `## ${page.title}\n\n`
    md += `_${page.kicker}_\n\n`
    if (page.visual === 'workspace') md += `![Fieldnote workspace](../output/playwright/fieldnote-desktop.png)\n\n`
    if (page.visual === 'refineClassify') md += `![Fieldnote coded workspace](../output/playwright/fieldnote-nvivo-inspired.png)\n\n`
    if (page.visual === 'firstSession') md += `![Fieldnote sign-in](../output/playwright/fieldnote-flow-pass.png)\n\n`
    if (page.body) page.body.forEach((text) => { md += `${mdEscape(text)}\n\n` })
    if (page.bullets) page.bullets.forEach((text) => { md += `- ${mdEscape(text)}\n` })
    if (page.bullets) md += '\n'
    if (page.callout) md += `> ${mdEscape(page.callout)}\n\n`
  }
  await fs.writeFile(OUT_MD, `${md.trimEnd()}\n`)
}

async function buildDocx() {
  const workspaceTall = await fs.readFile(screenshots.workspaceTall)
  const workspaceWide = await fs.readFile(screenshots.workspaceWide)
  const auth = await fs.readFile(screenshots.auth)
  function docxImageFor(visual) {
    if (visual === 'workspace') return { data: workspaceWide, width: 560, height: 455 }
    if (visual === 'refineClassify') return { data: workspaceTall, width: 520, height: 519 }
    if (visual === 'firstSession') return { data: auth, width: 520, height: 293 }
    return null
  }
  const children = [
    new Paragraph({
      children: [docxText('Fieldnote Onboarding Guide', { font: docxTheme.titleFont, bold: true, color: docxTheme.ink })],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [docxText('Quick start for qualitative researchers', { italics: true, color: docxTheme.muted })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
    }),
  ]

  for (const [sectionIndex, page] of pages.slice(1).entries()) {
    children.push(new Paragraph({
      children: [docxText(page.title, { font: docxTheme.titleFont, bold: true, color: docxTheme.navy })],
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: sectionIndex > 0,
    }))
    children.push(new Paragraph({
      children: [docxText(page.kicker, { italics: true, color: docxTheme.muted })],
      spacing: { after: 160 },
    }))
    const image = docxImageFor(page.visual)
    if (image) {
      children.push(new Paragraph({
        children: [new ImageRun({
          type: 'png',
          data: image.data,
          transformation: { width: image.width, height: image.height },
        })],
        spacing: { after: 240 },
      }))
    }
    if (page.body) {
      page.body.forEach((text) => children.push(new Paragraph({ children: [docxText(text)], spacing: { after: 160 } })))
    }
    if (page.bullets) {
      page.bullets.forEach((text) => {
        children.push(new Paragraph({ children: [docxText(text)], bullet: { level: 0 }, spacing: { after: 80 } }))
      })
    }
    if (page.callout) {
      children.push(new Paragraph({
        children: [docxText(page.callout, { bold: true, color: docxTheme.teal })],
        shading: { fill: 'EEF7F7' },
        spacing: { before: 160, after: 240 },
      }))
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: docxTheme.bodyFont, size: 22, color: docxTheme.ink },
          paragraph: { spacing: { line: 300 } },
        },
      },
      paragraphStyles: [
        {
          id: 'Title',
          name: 'Title',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            font: docxTheme.titleFont,
            bold: true,
            size: 48,
            color: docxTheme.ink,
          },
          paragraph: {
            spacing: { before: 240, after: 120 },
          },
        },
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            font: docxTheme.titleFont,
            bold: true,
            size: 32,
            color: docxTheme.navy,
          },
          paragraph: {
            spacing: { before: 320, after: 120 },
          },
        },
      ],
    },
    sections: [{ properties: {}, children }],
  })
  await fs.mkdir(path.dirname(OUT_DOCX), { recursive: true })
  await fs.writeFile(OUT_DOCX, await Packer.toBuffer(doc))
}

await fs.mkdir(path.dirname(OUT_MD), { recursive: true })
await buildMarkdown()
await buildPdf()
await buildDocx()
console.log(JSON.stringify({ pdf: OUT_PDF, docx: OUT_DOCX, markdown: OUT_MD }, null, 2))
