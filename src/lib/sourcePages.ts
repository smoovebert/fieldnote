// Page parser for PDF sources. The PDF importer in App.tsx writes
// '--- Page N ---' markers between extracted-text pages; this module
// turns the resulting flat string back into a structured page array
// for the Code-mode reader. Pure function — runs at render time,
// memoized per source content by the caller.
//
// Non-PDF sources (TXT/MD/DOCX) carry no markers; we return a single
// synthetic page so the reader can use the same iteration shape for
// every source kind.

export type SourcePage = {
  pageNumber: number  // 1-based; matches the marker label
  body: string        // page text with leading/trailing whitespace trimmed
}

// Matches '--- Page N ---' on its own line. The importer always
// surrounds the marker with blank lines, but we tolerate either form.
const PAGE_MARKER = /^---\s*Page\s+(\d+)\s*---\s*$/m

export function isPdfSource(content: string): boolean {
  return PAGE_MARKER.test(content)
}

export function parseSourcePages(content: string): SourcePage[] {
  if (!content) return []

  // Split on the marker. The capture group lets us recover the page
  // number; .split() with a capture interleaves matched groups with
  // the surrounding text in the result array.
  const splitter = /^---\s*Page\s+(\d+)\s*---\s*$/m
  const parts = content.split(new RegExp(splitter.source, 'gm'))

  // No markers → single synthetic page (the whole content), unless
  // the content is empty whitespace.
  if (parts.length === 1) {
    const trimmed = content.trim()
    if (!trimmed) return []
    return [{ pageNumber: 1, body: trimmed }]
  }

  // With markers, parts looks like:
  //   [preamble, '<n1>', body1, '<n2>', body2, ...]
  // where preamble is whatever (if anything) preceded the first marker.
  // We discard a non-empty preamble silently — pdf imports never have
  // one in practice, and if they do it's not part of any page.
  const pages: SourcePage[] = []
  let i = 1
  while (i < parts.length) {
    const num = Number(parts[i])
    const body = (parts[i + 1] ?? '').trim()
    if (Number.isFinite(num) && num > 0 && body) {
      pages.push({ pageNumber: num, body })
    }
    i += 2
  }
  return pages
}
