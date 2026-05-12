import type { Attribute, AttributeValue, Case, Code, Excerpt, Source } from '../lib/types'
import { excerptMatchesAttributeFilters } from './excerptFilters'
import type { AttributeFilter } from './queryDefinition'

export const DEFAULT_STOP_WORDS = new Set([
  'about',
  'after',
  'again',
  'also',
  'because',
  'been',
  'being',
  'could',
  'did',
  'does',
  'doing',
  'for',
  'from',
  'had',
  'has',
  'have',
  'her',
  'him',
  'his',
  'how',
  'into',
  'just',
  'like',
  'not',
  'now',
  'our',
  'out',
  'she',
  'that',
  'the',
  'their',
  'them',
  'then',
  'there',
  'they',
  'this',
  'was',
  'were',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'with',
  'would',
  'you',
  'your',
])

export type MatrixColumn = {
  id: string
  label: string
  caseIds: string[]
}

export type MatrixColumnMode = 'case' | 'attribute'

export type MatrixResultRow = {
  code: Code
  cells: Array<{ column: MatrixColumn; excerpts: Excerpt[] }>
}

export type WordFrequencyRow = {
  word: string
  count: number
  excerptCount: number
}

export type CoOccurrenceRow = {
  key: string
  codes: Code[]
  count: number
  excerpts: Excerpt[]
}

export type CooccurrencePair = {
  codeAId: string
  codeAName: string
  codeBId: string
  codeBName: string
  count: number
  sampleExcerpt?: string
}

export type MatrixCellInput = {
  rowId: string
  rowLabel: string
  colId: string
  colLabel: string
  count: number
  sampleExcerpt?: string
}

function sourceLookup(sources: Source[]) {
  return new Map(sources.map((source) => [source.id, source]))
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

export function filterAnalyzeExcerpts(input: {
  excerpts: Excerpt[]
  codes: Code[]
  sources: Source[]
  cases: Case[]
  attributeValues: AttributeValue[]
  text: string
  codeId: string
  additionalCodeIds: string[]
  caseId: string
  attributes: AttributeFilter[]
}) {
  const term = input.text.trim().toLowerCase()
  const sourceById = sourceLookup(input.sources)
  const codeById = codeLookup(input.codes)
  const caseBySourceId = caseLookupBySource(input.cases)

  return input.excerpts.filter((excerpt) => {
    const excerptCodes = excerpt.codeIds.map((id) => codeById.get(id)).filter((code): code is Code => Boolean(code))
    const source = sourceById.get(excerpt.sourceId)
    const linkedCase = caseBySourceId.get(excerpt.sourceId)
    const haystack = [
      excerpt.text,
      excerpt.note,
      excerpt.sourceTitle,
      source?.folder ?? '',
      linkedCase?.name ?? '',
      linkedCase?.description ?? '',
      ...excerptCodes.map((code) => code.name),
      ...excerptCodes.map((code) => code.description),
    ]
      .join(' ')
      .toLowerCase()

    if (term && !haystack.includes(term)) return false
    if (input.codeId && !excerpt.codeIds.includes(input.codeId)) return false
    for (const extra of input.additionalCodeIds) {
      if (!excerpt.codeIds.includes(extra)) return false
    }
    if (input.caseId && linkedCase?.id !== input.caseId) return false
    if (!excerptMatchesAttributeFilters(input.attributes, linkedCase?.id, input.attributeValues)) return false
    return true
  })
}

export function matchingCasesForExcerpts(excerpts: Excerpt[], cases: Case[]) {
  const caseBySourceId = caseLookupBySource(cases)
  const matchingCases = excerpts.flatMap((excerpt) => {
    const linkedCase = caseBySourceId.get(excerpt.sourceId)
    return linkedCase ? [linkedCase] : []
  })
  return Array.from(new Map(matchingCases.map((item) => [item.id, item])).values())
}

export function buildMatrixColumns(input: {
  mode: MatrixColumnMode
  cases: Case[]
  activeAttribute: Attribute | undefined
  attributeValues: AttributeValue[]
}): MatrixColumn[] {
  if (input.mode === 'case') {
    return input.cases.map((item) => ({
      id: item.id,
      label: item.name,
      caseIds: [item.id],
    }))
  }

  if (!input.activeAttribute) return []

  const valueGroups = new Map<string, string[]>()
  input.attributeValues.forEach((attributeValue) => {
    if (attributeValue.attributeId !== input.activeAttribute!.id) return
    const value = attributeValue.value.trim()
    if (!value) return
    valueGroups.set(value, [...(valueGroups.get(value) ?? []), attributeValue.caseId])
  })

  return Array.from(valueGroups.entries()).map(([value, caseIds]) => ({
    id: `${input.activeAttribute!.id}:${value}`,
    label: value,
    caseIds,
  }))
}

export function buildMatrixResults(input: {
  rows: Code[]
  columns: MatrixColumn[]
  cases: Case[]
  excerpts: Excerpt[]
}): MatrixResultRow[] {
  const caseIdBySourceId = new Map<string, string>()
  input.cases.forEach((item) => item.sourceIds.forEach((sourceId) => caseIdBySourceId.set(sourceId, item.id)))

  return input.rows.map((code) => ({
    code,
    cells: input.columns.map((column) => {
      const columnCaseIds = new Set(column.caseIds)
      const matches = input.excerpts.filter((excerpt) => {
        const linkedCaseId = caseIdBySourceId.get(excerpt.sourceId)
        return excerpt.codeIds.includes(code.id) && Boolean(linkedCaseId && columnCaseIds.has(linkedCaseId))
      })

      return { column, excerpts: matches }
    }),
  }))
}

export function buildWordFrequencyRows(excerpts: Excerpt[], stopWords = DEFAULT_STOP_WORDS): WordFrequencyRow[] {
  const counts = new Map<string, { count: number; excerptIds: Set<string> }>()

  excerpts.forEach((excerpt) => {
    const words = excerpt.text.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? []
    words.forEach((rawWord) => {
      const word = rawWord.replace(/^'+|'+$/g, '')
      if (word.length < 3 || stopWords.has(word)) return
      const current = counts.get(word) ?? { count: 0, excerptIds: new Set<string>() }
      current.count += 1
      current.excerptIds.add(excerpt.id)
      counts.set(word, current)
    })
  })

  return Array.from(counts.entries())
    .map(([word, value]) => ({ word, count: value.count, excerptCount: value.excerptIds.size }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, 60)
}

export function buildCoOccurrenceRows(excerpts: Excerpt[], codes: Code[]): CoOccurrenceRow[] {
  const byId = codeLookup(codes)
  const pairMap = new Map<string, CoOccurrenceRow>()

  excerpts.forEach((excerpt) => {
    const excerptCodes = excerpt.codeIds
      .map((codeId) => byId.get(codeId))
      .filter((code): code is Code => Boolean(code))
      .sort((a, b) => a.name.localeCompare(b.name))

    excerptCodes.forEach((firstCode, firstIndex) => {
      excerptCodes.slice(firstIndex + 1).forEach((secondCode) => {
        const ids = [firstCode.id, secondCode.id].sort()
        const key = ids.join('__')
        const existing = pairMap.get(key) ?? { key, codes: [firstCode, secondCode], count: 0, excerpts: [] }
        existing.count += 1
        existing.excerpts = [...existing.excerpts, excerpt]
        pairMap.set(key, existing)
      })
    })
  })

  return Array.from(pairMap.values()).sort(
    (a, b) =>
      b.count - a.count ||
      a.codes.map((code) => code.name).join(' + ').localeCompare(b.codes.map((code) => code.name).join(' + ')),
  )
}

export function coOccurrenceRowsToPairs(rows: CoOccurrenceRow[]): CooccurrencePair[] {
  return rows.flatMap((row) => {
    const [a, b] = row.codes
    if (!a || !b) return []
    return [{
      codeAId: a.id,
      codeAName: a.name,
      codeBId: b.id,
      codeBName: b.name,
      count: row.count,
      sampleExcerpt: row.excerpts[0]?.text,
    }]
  })
}

export function matrixResultsToCells(rows: MatrixResultRow[]): MatrixCellInput[] {
  return rows.flatMap((row) =>
    row.cells.map((cell) => ({
      rowId: row.code.id,
      rowLabel: row.code.name,
      colId: cell.column.id,
      colLabel: cell.column.label,
      count: cell.excerpts.length,
      sampleExcerpt: cell.excerpts[0]?.text,
    })),
  )
}
