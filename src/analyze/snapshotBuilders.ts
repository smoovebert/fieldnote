import type { AnalyzeViewState } from './analyzeViewState'
import { CROSSTAB_COL_KEY_SEPARATOR, type CrosstabResult } from './crosstabs'
import type { Attribute, Code, Excerpt, SnapshotResults } from '../lib/types'

type MatrixColumnSnapshotInput = {
  label: string
}

type MatrixResultSnapshotInput = {
  code: Code
  cells: Array<{
    column: MatrixColumnSnapshotInput
    excerpts: Excerpt[]
  }>
}

type WordFrequencySnapshotInput = {
  word: string
  count: number
  excerptCount: number
}

type CooccurrenceSnapshotInput = {
  codeAName: string
  codeBName: string
  count: number
}

export function buildCodedExcerptSnapshot(excerpts: Excerpt[]): SnapshotResults {
  return {
    kind: 'coded_excerpt',
    excerpts: excerpts.map((excerpt) => ({
      id: excerpt.id,
      sourceId: excerpt.sourceId,
      sourceTitle: excerpt.sourceTitle,
      codeIds: excerpt.codeIds,
      text: excerpt.text,
      note: excerpt.note,
      ...(excerpt.pageNumber !== undefined ? { pageNumber: excerpt.pageNumber } : {}),
    })),
  }
}

export function buildMatrixSnapshot(input: {
  columnMode: 'case' | 'attribute'
  attributeName: string | null
  columns: MatrixColumnSnapshotInput[]
  rows: MatrixResultSnapshotInput[]
}): SnapshotResults {
  return {
    kind: 'matrix',
    columnMode: input.columnMode,
    attributeName: input.columnMode === 'attribute' ? input.attributeName : null,
    colLabels: input.columns.map((c) => c.label),
    rows: input.rows.map((row) => ({
      codeName: row.code.name,
      counts: row.cells.map((cell) => cell.excerpts.length),
    })),
  }
}

export function buildFrequencySnapshot(rows: WordFrequencySnapshotInput[], topN: number): SnapshotResults {
  return {
    kind: 'frequency',
    topN,
    rows: rows.slice(0, topN).map((row) => ({
      word: row.word,
      count: row.count,
      excerptCount: row.excerptCount,
    })),
  }
}

export function buildCooccurrenceSnapshot(pairs: CooccurrenceSnapshotInput[], topN: number): SnapshotResults {
  return {
    kind: 'cooccurrence',
    topN,
    pairs: pairs.slice(0, topN).map((pair) => ({
      codeAName: pair.codeAName,
      codeBName: pair.codeBName,
      count: pair.count,
    })),
  }
}

export function buildCrosstabSnapshot(input: {
  result: CrosstabResult | null
  attributes: Attribute[]
  view: AnalyzeViewState['crosstab']
}): SnapshotResults | null {
  const { result, attributes, view } = input
  if (!result) return null

  const attr1Name = attributes.find((a) => a.id === view.attr1Id)?.name ?? 'Attribute 1'
  const attr2Name = attributes.find((a) => a.id === view.attr2Id)?.name ?? 'Attribute 2'
  const cellsByRow = new Map<string, Map<string, number>>()

  for (const cell of result.cells) {
    let rowMap = cellsByRow.get(cell.rowId)
    if (!rowMap) {
      rowMap = new Map<string, number>()
      cellsByRow.set(cell.rowId, rowMap)
    }
    rowMap.set(`${cell.col1Value}${CROSSTAB_COL_KEY_SEPARATOR}${cell.col2Value}`, cell.count)
  }

  return {
    kind: 'crosstab',
    attr1Name,
    attr2Name,
    percentMode: view.percentMode,
    colLabels: result.cols.map((col) => `${col.col1} × ${col.col2}`),
    rows: result.rows.map((row) => {
      const rowMap = cellsByRow.get(row.id) ?? new Map<string, number>()
      return {
        codeName: row.label,
        counts: result.cols.map((col) => rowMap.get(`${col.col1}${CROSSTAB_COL_KEY_SEPARATOR}${col.col2}`) ?? 0),
      }
    }),
  }
}
