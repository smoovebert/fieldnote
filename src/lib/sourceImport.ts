import type { Source } from './types'

/**
 * Render a small slice of HTML to plain text that preserves block structure.
 * Headings get a bare line, bullets become "• item", tables become tab-
 * separated rows, and inline marks flatten cleanly.
 */
async function structuredTextFromHtml(html: string): Promise<string> {
  const DOMPurify = (await import('dompurify')).default
  const safe = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
  const root = document.createElement('div')
  const parsed = new DOMParser().parseFromString(`<div>${safe}</div>`, 'text/html')
  const inner = parsed.body.firstChild
  if (inner) root.appendChild(inner)

  root.querySelectorAll('ul > li').forEach((li) => {
    li.insertBefore(document.createTextNode('• '), li.firstChild)
  })
  root.querySelectorAll('ol > li').forEach((li, index) => {
    li.insertBefore(document.createTextNode(`${index + 1}. `), li.firstChild)
  })

  document.body.appendChild(root)
  root.style.position = 'fixed'
  root.style.left = '-99999px'
  root.style.top = '0'
  root.style.whiteSpace = 'pre-wrap'
  const text = root.innerText
  document.body.removeChild(root)
  return text.replace(/\n{3,}/g, '\n\n').trim()
}

export async function readSourceFile(file: File): Promise<Pick<Source, 'content' | 'kind'>> {
  const lowered = file.name.toLowerCase()
  if (lowered.endsWith('.docx')) {
    const mammoth = await import('mammoth/mammoth.browser')
    const html = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() })
    const content = await structuredTextFromHtml(html.value)
    return { content, kind: 'Transcript' }
  }

  if (lowered.endsWith('.pdf')) {
    const pdfjs = await import('pdfjs-dist')
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
    const data = new Uint8Array(await file.arrayBuffer())
    const doc = await pdfjs.getDocument({ data }).promise
    const pages: string[] = []
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum)
      const content = await page.getTextContent()
      const text = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      pages.push(`--- Page ${pageNum} ---\n\n${text}`)
    }
    return { content: pages.join('\n\n'), kind: 'Document' }
  }

  return {
    content: await file.text(),
    kind: lowered.endsWith('.csv') ? 'Document' : 'Transcript',
  }
}
