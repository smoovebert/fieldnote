import { describe, expect, it } from 'vitest'
import {
  buildCrosstab,
  crosstabCsvRows,
  CROSSTAB_NONE,
  CROSSTAB_COL_KEY_SEPARATOR,
} from '../crosstabs'

type T = {
  excerpts: { id: string; codeIds: string[]; sourceId: string }[]
  codes: { id: string; name: string }[]
  cases: { id: string; sourceIds: string[] }[]
  attributeValues: { caseId: string; attributeId: string; value: string }[]
}

const fixture: T = {
  excerpts: [
    { id: 'e1', codeIds: ['c1'],         sourceId: 's1' }, // case A → urban + female
    { id: 'e2', codeIds: ['c1', 'c2'],   sourceId: 's2' }, // case B → urban + male
    { id: 'e3', codeIds: ['c2'],         sourceId: 's3' }, // case C → no urban (none) + female
    { id: 'e4', codeIds: ['c1'],         sourceId: 's4' }, // case D → no values at all
    { id: 'e5', codeIds: ['c1'],         sourceId: 's5' }, // no case at all → excluded
  ],
  codes: [
    { id: 'c1', name: 'Trust' },
    { id: 'c2', name: 'Risk' },
  ],
  cases: [
    { id: 'A', sourceIds: ['s1'] },
    { id: 'B', sourceIds: ['s2'] },
    { id: 'C', sourceIds: ['s3'] },
    { id: 'D', sourceIds: ['s4'] },
  ],
  attributeValues: [
    { caseId: 'A', attributeId: 'region', value: 'urban'  },
    { caseId: 'A', attributeId: 'gender', value: 'female' },
    { caseId: 'B', attributeId: 'region', value: 'urban'  },
    { caseId: 'B', attributeId: 'gender', value: 'male'   },
    { caseId: 'C', attributeId: 'gender', value: 'female' },
    // C has no region, D has nothing
  ],
}

function build(opts: Partial<{ topNRows: number; topNCols: number }> = {}) {
  return buildCrosstab({
    ...fixture,
    attr1Id: 'region',
    attr2Id: 'gender',
    topNRows: opts.topNRows ?? 30,
    topNCols: opts.topNCols ?? 40,
  })
}

describe('buildCrosstab', () => {
  it('returns empty result for empty inputs', () => {
    const result = buildCrosstab({
      excerpts: [], codes: [], cases: [], attributeValues: [],
      attr1Id: 'a', attr2Id: 'b', topNRows: 30, topNCols: 40,
    })
    expect(result.rows).toEqual([])
    expect(result.cols).toEqual([])
    expect(result.cells).toEqual([])
    expect(result.grandTotal).toBe(0)
  })

  it('counts a single coded reference once per matching code', () => {
    const result = build()
    // e2 has codes c1 + c2, both contribute to the (urban, male) column
    const c1Male = result.cells.find(
      (c) => c.rowId === 'c1' && c.col1Value === 'urban' && c.col2Value === 'male',
    )
    const c2Male = result.cells.find(
      (c) => c.rowId === 'c2' && c.col1Value === 'urban' && c.col2Value === 'male',
    )
    expect(c1Male?.count).toBe(1)
    expect(c2Male?.count).toBe(1)
  })

  it('buckets a missing attribute value as (none)', () => {
    const result = build()
    // case C: gender=female, region missing → e3 (code c2) → (none, female)
    const cell = result.cells.find(
      (c) => c.rowId === 'c2' && c.col1Value === CROSSTAB_NONE && c.col2Value === 'female',
    )
    expect(cell?.count).toBe(1)
  })

  it('buckets both-missing as (none, none)', () => {
    const result = build()
    // case D: no values → e4 (code c1) → (none, none)
    const cell = result.cells.find(
      (c) => c.rowId === 'c1' && c.col1Value === CROSSTAB_NONE && c.col2Value === CROSSTAB_NONE,
    )
    expect(cell?.count).toBe(1)
  })

  it('excludes excerpts whose source has no case', () => {
    const result = build()
    expect(result.grandTotal).toBe(5) // e1(c1)+e2(c1)+e2(c2)+e3(c2)+e4(c1) = 5; e5 excluded
  })

  it('renders dense cells (every row × col), zero-filled', () => {
    const result = build()
    // 2 codes × however many cols = 2*cols cells
    expect(result.cells).toHaveLength(result.rows.length * result.cols.length)
  })

  it('computes row, column, and grand totals', () => {
    const result = build()
    const c1Total = result.rowTotals.get('c1')
    const c2Total = result.rowTotals.get('c2')
    expect(c1Total).toBe(3) // e1, e2, e4
    expect(c2Total).toBe(2) // e2, e3

    // (urban, male) col total = 2 (e2 contributes c1 and c2)
    const colKey = `urban${CROSSTAB_COL_KEY_SEPARATOR}male`
    expect(result.colTotals.get(colKey)).toBe(2)

    expect(result.grandTotal).toBe(5)
  })

  it('truncates rows by total count desc when over topNRows', () => {
    // synthesize: 3 codes, only 2 should remain when topNRows=2
    const result = buildCrosstab({
      ...fixture,
      codes: [
        { id: 'c1', name: 'Trust' },   // 3 refs
        { id: 'c2', name: 'Risk' },    // 2 refs
        { id: 'c3', name: 'Quiet' },   // 0 refs
      ],
      attr1Id: 'region', attr2Id: 'gender', topNRows: 2, topNCols: 40,
    })
    expect(result.rows.map((r) => r.id)).toEqual(['c1', 'c2'])
    expect(result.totalRowsBeforeTruncation).toBe(2) // c3 has 0 refs and is dropped before truncation
  })

  it('truncates columns by total count desc when over topNCols', () => {
    const result = build({ topNCols: 1 })
    expect(result.cols).toHaveLength(1)
    // urban/male has the highest column total (2), so it wins
    expect(result.cols[0].col1).toBe('urban')
    expect(result.cols[0].col2).toBe('male')
    expect(result.totalColsBeforeTruncation).toBeGreaterThan(1)
  })
})

describe('crosstabCsvRows', () => {
  it('emits one row per non-zero cell with the requested header', () => {
    const result = build()
    const rows = crosstabCsvRows(result, 'Region', 'Gender')
    expect(rows[0]).toEqual(['Code', 'Region', 'Gender', 'Count'])
    // every body row count > 0
    for (const row of rows.slice(1)) {
      expect(Number(row[3])).toBeGreaterThan(0)
    }
    // the grand total is the sum of all cell counts in the CSV body
    const sum = rows.slice(1).reduce((acc, r) => acc + Number(r[3]), 0)
    expect(sum).toBe(result.grandTotal)
  })

  it('writes (none) literally', () => {
    const result = build()
    const rows = crosstabCsvRows(result, 'Region', 'Gender')
    const hasNone = rows.some((r) => r.includes(CROSSTAB_NONE))
    expect(hasNone).toBe(true)
  })
})
