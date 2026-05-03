// Single source of truth for "how do I cite this excerpt." Used by the
// inspector, header search, Refine references, Report (preview / PDF /
// Word), and CSV/XLSX export.
//
// AI prompt builders (suggest_codes, draft_description,
// summarize_source, draft_memo) intentionally do NOT use this — page
// metadata isn't useful to the model and would just inflate token use.

export type CitableExcerpt = { sourceTitle: string; pageNumber?: number }

export function formatExcerptCitation(excerpt: CitableExcerpt): string {
  const title = excerpt.sourceTitle.trim() || 'Untitled source'
  return excerpt.pageNumber !== undefined && excerpt.pageNumber > 0
    ? `${title}, p. ${excerpt.pageNumber}`
    : title
}
