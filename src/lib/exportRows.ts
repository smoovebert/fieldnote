import type { Attribute, AttributeValue, Case, Code, Excerpt, Memo, QueryResultSnapshot, Source } from './types'

type MatrixExportRow = {
  code: Code
  cells: Array<{
    column: { label: string }
    excerpts: Excerpt[]
  }>
}

type WordFrequencyExportRow = {
  word: string
  count: number
  excerptCount: number
}

type CoOccurrenceExportRow = {
  codes: Code[]
  count: number
  excerpts: Excerpt[]
}

function codeLookup(codes: Code[]) {
  return new Map(codes.map((code) => [code.id, code]))
}

function caseLookupBySource(cases: Case[]) {
  const bySource = new Map<string, Case>()
  cases.forEach((item) => {
    item.sourceIds.forEach((sourceId) => bySource.set(sourceId, item))
  })
  return bySource
}

function codeNames(codes: Code[], codeIds: string[]) {
  const byId = codeLookup(codes)
  return codeIds.map((id) => byId.get(id)).filter((code): code is Code => Boolean(code))
}

function pageNumber(excerpt: Pick<Excerpt, 'pageNumber'>) {
  return excerpt.pageNumber !== undefined ? String(excerpt.pageNumber) : ''
}

function activeFiltersText(activeFilters: string[]) {
  return activeFilters.join('; ')
}

export function codedExcerptsRows(input: {
  projectTitle: string
  excerpts: Excerpt[]
  sources: Source[]
  cases: Case[]
  codes: Code[]
}) {
  const sourcesById = new Map(input.sources.map((source) => [source.id, source]))
  const casesBySourceId = caseLookupBySource(input.cases)
  return [
    ['Project', 'Source', 'Page', 'Source folder', 'Case', 'Codes', 'Code descriptions', 'Excerpt', 'Note'],
    ...input.excerpts.map((excerpt) => {
      const source = sourcesById.get(excerpt.sourceId)
      const linkedCase = casesBySourceId.get(excerpt.sourceId)
      const excerptCodes = codeNames(input.codes, excerpt.codeIds)
      return [
        input.projectTitle,
        excerpt.sourceTitle,
        pageNumber(excerpt),
        source?.folder ?? '',
        linkedCase?.name ?? source?.caseName ?? '',
        excerptCodes.map((code) => code.name).join('; '),
        excerptCodes.map((code) => code.description).join('; '),
        excerpt.text,
        excerpt.note,
      ]
    }),
  ]
}

export function caseSheetRows(input: {
  projectTitle: string
  cases: Case[]
  sources: Source[]
  attributes: Attribute[]
  attributeValues: AttributeValue[]
}) {
  return [
    ['Project', 'Case', 'Sources', 'Notes', ...input.attributes.map((attribute) => attribute.name)],
    ...input.cases.map((item) => {
      const linkedSources = input.sources.filter((source) => item.sourceIds.includes(source.id))
      return [
        input.projectTitle,
        item.name,
        linkedSources.map((source) => source.title).join('; '),
        item.description,
        ...input.attributes.map((attribute) => input.attributeValues.find((value) => value.caseId === item.id && value.attributeId === attribute.id)?.value ?? ''),
      ]
    }),
  ]
}

export function caseExcerptRows(input: {
  projectTitle: string
  excerpts: Excerpt[]
  cases: Case[]
  codes: Code[]
  attributes: Attribute[]
  attributeValues: AttributeValue[]
}) {
  const casesBySourceId = caseLookupBySource(input.cases)
  return [
    ['Project', 'Case', 'Source', 'Page', 'Codes', 'Excerpt', 'Note', ...input.attributes.map((attribute) => attribute.name)],
    ...input.excerpts.map((excerpt) => {
      const linkedCase = casesBySourceId.get(excerpt.sourceId)
      const excerptCodes = codeNames(input.codes, excerpt.codeIds)
      return [
        input.projectTitle,
        linkedCase?.name ?? '',
        excerpt.sourceTitle,
        pageNumber(excerpt),
        excerptCodes.map((code) => code.name).join('; '),
        excerpt.text,
        excerpt.note,
        ...input.attributes.map((attribute) =>
          linkedCase ? input.attributeValues.find((value) => value.caseId === linkedCase.id && value.attributeId === attribute.id)?.value ?? '' : ''
        ),
      ]
    }),
  ]
}

export function analyzeExcerptRows(input: {
  projectTitle: string
  excerpts: Excerpt[]
  cases: Case[]
  codes: Code[]
  activeFilters: string[]
}) {
  const casesBySourceId = caseLookupBySource(input.cases)
  return [
    ['Project', 'Source', 'Page', 'Case', 'Codes', 'Excerpt', 'Note', 'Active filters'],
    ...input.excerpts.map((excerpt) => {
      const linkedCase = casesBySourceId.get(excerpt.sourceId)
      const excerptCodes = codeNames(input.codes, excerpt.codeIds)
      return [
        input.projectTitle,
        excerpt.sourceTitle,
        pageNumber(excerpt),
        linkedCase?.name ?? '',
        excerptCodes.map((code) => code.name).join('; '),
        excerpt.text,
        excerpt.note,
        activeFiltersText(input.activeFilters),
      ]
    }),
  ]
}

export function matrixRows(input: {
  projectTitle: string
  rows: MatrixExportRow[]
  columnType: string
  activeFilters: string[]
}) {
  return [
    ['Project', 'Row code', 'Column type', 'Column', 'Count', 'Excerpt sources', 'Excerpts', 'Active filters'],
    ...input.rows.flatMap((row) =>
      row.cells.map((cell) => [
        input.projectTitle,
        row.code.name,
        input.columnType,
        cell.column.label,
        String(cell.excerpts.length),
        cell.excerpts.map((excerpt) => excerpt.sourceTitle).join('; '),
        cell.excerpts.map((excerpt) => excerpt.text).join(' | '),
        activeFiltersText(input.activeFilters),
      ])
    ),
  ]
}

export function wordFrequencyRows(input: {
  projectTitle: string
  rows: WordFrequencyExportRow[]
  activeFilters: string[]
}) {
  return [
    ['Project', 'Word', 'Count', 'Excerpt count', 'Active filters'],
    ...input.rows.map((row) => [input.projectTitle, row.word, String(row.count), String(row.excerptCount), activeFiltersText(input.activeFilters)]),
  ]
}

export function coOccurrenceRows(input: {
  projectTitle: string
  rows: CoOccurrenceExportRow[]
  activeFilters: string[]
}) {
  return [
    ['Project', 'Code 1', 'Code 2', 'Count', 'Excerpt sources', 'Excerpts', 'Active filters'],
    ...input.rows.map((row) => [
      input.projectTitle,
      row.codes[0]?.name ?? '',
      row.codes[1]?.name ?? '',
      String(row.count),
      row.excerpts.map((excerpt) => excerpt.sourceTitle).join('; '),
      row.excerpts.map((excerpt) => excerpt.text).join(' | '),
      activeFiltersText(input.activeFilters),
    ]),
  ]
}

export function codebookRows(input: {
  projectTitle: string
  sortedCodes: Code[]
  excerpts: Excerpt[]
}) {
  const byId = codeLookup(input.sortedCodes)
  return [
    ['Project', 'Parent code', 'Code', 'Description', 'Excerpts', 'Example excerpt'],
    ...input.sortedCodes.map((code) => {
      const references = input.excerpts.filter((excerpt) => excerpt.codeIds.includes(code.id))
      return [
        input.projectTitle,
        code.parentCodeId ? byId.get(code.parentCodeId)?.name ?? '' : '',
        code.name,
        code.description,
        String(references.length),
        references[0]?.text ?? '',
      ]
    }),
  ]
}

export function memoRows(input: {
  projectTitle: string
  memos: Memo[]
  sources: Source[]
  codes: Code[]
}) {
  return [
    ['Project', 'Memo title', 'Linked type', 'Linked item', 'Memo body'],
    ...input.memos.map((memo) => {
      const linkedItem =
        memo.linkedType === 'source'
          ? input.sources.find((source) => source.id === memo.linkedId)?.title
          : memo.linkedType === 'code'
            ? input.codes.find((code) => code.id === memo.linkedId)?.name
            : input.projectTitle

      return [input.projectTitle, memo.title, memo.linkedType, linkedItem ?? '', memo.body]
    }),
  ]
}

export function snapshotRows(input: {
  projectTitle: string
  queryName: string
  snapshot: QueryResultSnapshot
  codes: Code[]
}) {
  const snap = input.snapshot
  if (snap.results.kind === 'coded_excerpt') {
    return [
      ['Project', 'Saved query', 'Snapshot label', 'Captured at', 'Source', 'Page', 'Codes', 'Excerpt', 'Note'],
      ...snap.results.excerpts.map((excerpt) => {
        const excerptCodes = codeNames(input.codes, excerpt.codeIds)
        return [
          input.projectTitle,
          input.queryName,
          snap.label,
          snap.capturedAt,
          excerpt.sourceTitle,
          pageNumber(excerpt),
          excerptCodes.map((code) => code.name).join('; '),
          excerpt.text,
          excerpt.note,
        ]
      }),
    ]
  }

  if (snap.results.kind === 'matrix' || snap.results.kind === 'crosstab') {
    const r = snap.results
    return [
      ['Code', ...r.colLabels],
      ...r.rows.map((row) => [row.codeName, ...row.counts.map(String)]),
    ]
  }

  if (snap.results.kind === 'frequency') {
    return [
      ['Word', 'Count', 'Excerpts'],
      ...snap.results.rows.map((r) => [r.word, String(r.count), String(r.excerptCount)]),
    ]
  }

  return [
    ['Code A', 'Code B', 'Count'],
    ...snap.results.pairs.map((p) => [p.codeAName, p.codeBName, String(p.count)]),
  ]
}
