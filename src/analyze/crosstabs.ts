// Pure helpers for the Crosstabs analyze surface.
// Inputs are intentionally duck-typed — the caller (App.tsx) passes its
// existing Excerpt/Code/Case/AttributeValue arrays directly.

export const CROSSTAB_NONE = '(none)'
/**
 * Separator used internally when concatenating row/col strings into Map keys.
 * Uses a control character (Unit Separator, U+001F) that cannot appear in
 * normal user input — text inputs strip it and even paste from word
 * processors won't contain it. Avoids the collision class that a printable
 * separator (e.g. "∥") was vulnerable to.
 */
export const CROSSTAB_COL_KEY_SEPARATOR = ''

export type CrosstabExcerpt   = { id: string; codeIds: string[]; sourceId: string }
export type CrosstabCode      = { id: string; name: string }
export type CrosstabCase      = { id: string; sourceIds: string[] }
export type CrosstabAttrValue = { caseId: string; attributeId: string; value: string }

export type CrosstabBuilderInput = {
  excerpts: CrosstabExcerpt[]      // already filtered upstream
  codes: CrosstabCode[]
  cases: CrosstabCase[]
  attributeValues: CrosstabAttrValue[]
  attr1Id: string
  attr2Id: string
  topNRows: number
  topNCols: number
}

export type CrosstabRow  = { id: string; label: string }
export type CrosstabCol  = { col1: string; col2: string; key: string }
export type CrosstabCell = {
  rowId: string
  rowLabel: string
  col1Value: string
  col2Value: string
  count: number
}

export type CrosstabResult = {
  rows: CrosstabRow[]
  cols: CrosstabCol[]
  cells: CrosstabCell[]                      // dense
  rowTotals: Map<string, number>             // by rowId, over visible cells
  colTotals: Map<string, number>             // by composite key, over visible cells
  grandTotal: number                         // sum of visible cells (matches the corner cell of the table)
  totalRowsBeforeTruncation: number          // count of distinct row IDs that had at least one bucket
  totalColsBeforeTruncation: number          // count of distinct column keys that had at least one bucket
}

export function colKey(col1: string, col2: string): string {
  return `${col1}${CROSSTAB_COL_KEY_SEPARATOR}${col2}`
}

export function buildCrosstab(input: CrosstabBuilderInput): CrosstabResult {
  const {
    excerpts, codes, cases, attributeValues,
    attr1Id, attr2Id, topNRows, topNCols,
  } = input

  // sourceId → caseId (first case wins; sources usually link to one case)
  const caseBySource = new Map<string, string>()
  for (const c of cases) {
    for (const sid of c.sourceIds) {
      if (!caseBySource.has(sid)) caseBySource.set(sid, c.id)
    }
  }

  // (caseId, attributeId) → value
  const valueByCaseAttr = new Map<string, string>()
  for (const v of attributeValues) {
    if (v.value && v.value.trim()) {
      valueByCaseAttr.set(`${v.caseId}::${v.attributeId}`, v.value)
    }
  }

  const codeNameById = new Map(codes.map((c) => [c.id, c.name]))

  // Raw cell counts, before any truncation.
  type Bucket = { rowId: string; col1: string; col2: string; count: number }
  const buckets = new Map<string, Bucket>()

  for (const exc of excerpts) {
    const caseId = caseBySource.get(exc.sourceId)
    if (!caseId) continue // source without a case — excluded per spec

    const v1 = valueByCaseAttr.get(`${caseId}::${attr1Id}`) ?? CROSSTAB_NONE
    const v2 = valueByCaseAttr.get(`${caseId}::${attr2Id}`) ?? CROSSTAB_NONE

    for (const codeId of exc.codeIds) {
      if (!codeNameById.has(codeId)) continue
      const k = `${codeId}${CROSSTAB_COL_KEY_SEPARATOR}${colKey(v1, v2)}`
      const b = buckets.get(k)
      if (b) b.count++
      else buckets.set(k, { rowId: codeId, col1: v1, col2: v2, count: 1 })
    }
  }

  // Aggregate row totals and column totals across all buckets.
  const rowTotalsAll = new Map<string, number>()
  const colTotalsAll = new Map<string, number>()
  const colMeta      = new Map<string, { col1: string; col2: string }>()

  for (const b of buckets.values()) {
    rowTotalsAll.set(b.rowId, (rowTotalsAll.get(b.rowId) ?? 0) + b.count)
    const ck = colKey(b.col1, b.col2)
    colTotalsAll.set(ck, (colTotalsAll.get(ck) ?? 0) + b.count)
    colMeta.set(ck, { col1: b.col1, col2: b.col2 })
  }

  const totalRowsBeforeTruncation = rowTotalsAll.size
  const totalColsBeforeTruncation = colTotalsAll.size

  // Pick top rows/cols by total desc, ties broken by label/key for determinism.
  const sortedRowIds = [...rowTotalsAll.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, Math.max(0, topNRows))
    .map(([id]) => id)

  const sortedColKeys = [...colTotalsAll.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, Math.max(0, topNCols))
    .map(([k]) => k)

  const rows: CrosstabRow[] = sortedRowIds.map((id) => ({
    id, label: codeNameById.get(id) ?? id,
  }))
  const cols: CrosstabCol[] = sortedColKeys.map((k) => {
    const meta = colMeta.get(k)!
    return { col1: meta.col1, col2: meta.col2, key: k }
  })

  // Dense cells — fill zeros for (row, col) without a bucket.
  const bucketByCell = new Map<string, number>()
  for (const b of buckets.values()) {
    bucketByCell.set(`${b.rowId}${CROSSTAB_COL_KEY_SEPARATOR}${colKey(b.col1, b.col2)}`, b.count)
  }

  const cells: CrosstabCell[] = []
  for (const row of rows) {
    for (const col of cols) {
      const count = bucketByCell.get(`${row.id}${CROSSTAB_COL_KEY_SEPARATOR}${col.key}`) ?? 0
      cells.push({
        rowId: row.id,
        rowLabel: row.label,
        col1Value: col.col1,
        col2Value: col.col2,
        count,
      })
    }
  }

  // Recompute row/col totals + grand total limited to the *visible* set so the
  // table math closes. The corner cell of the rendered table shows grandTotal,
  // and it must equal the sum of either the visible row totals or the visible
  // column totals.
  const rowTotals = new Map<string, number>()
  const colTotals = new Map<string, number>()
  let grandTotal = 0
  for (const cell of cells) {
    rowTotals.set(cell.rowId, (rowTotals.get(cell.rowId) ?? 0) + cell.count)
    const ck = colKey(cell.col1Value, cell.col2Value)
    colTotals.set(ck, (colTotals.get(ck) ?? 0) + cell.count)
    grandTotal += cell.count
  }

  return {
    rows, cols, cells, rowTotals, colTotals, grandTotal,
    totalRowsBeforeTruncation, totalColsBeforeTruncation,
  }
}

export function crosstabCsvRows(
  result: CrosstabResult,
  attr1Name: string,
  attr2Name: string,
): string[][] {
  const header = ['Code', attr1Name, attr2Name, 'Count']
  const body: string[][] = []
  for (const cell of result.cells) {
    if (cell.count === 0) continue
    body.push([cell.rowLabel, cell.col1Value, cell.col2Value, String(cell.count)])
  }
  return [header, ...body]
}
