import { describe, expect, it } from 'vitest'

import { buildCodedExcerptSnapshot, buildCrosstabSnapshot, buildFrequencySnapshot } from '../snapshotBuilders'
import type { Excerpt } from '../../lib/types'

const excerpt: Excerpt = {
  id: 'e1',
  codeIds: ['access'],
  sourceId: 's1',
  sourceTitle: 'Interview 1',
  text: 'hard to apply',
  note: 'important',
  pageNumber: 4,
}

describe('snapshot builders', () => {
  it('captures coded excerpts without drifting fields later', () => {
    expect(buildCodedExcerptSnapshot([excerpt])).toEqual({
      kind: 'coded_excerpt',
      excerpts: [{
        id: 'e1',
        sourceId: 's1',
        sourceTitle: 'Interview 1',
        codeIds: ['access'],
        text: 'hard to apply',
        note: 'important',
        pageNumber: 4,
      }],
    })
  })

  it('limits frequency snapshots to top N rows', () => {
    expect(buildFrequencySnapshot([
      { word: 'access', count: 3, excerptCount: 2 },
      { word: 'forms', count: 2, excerptCount: 1 },
    ], 1)).toEqual({
      kind: 'frequency',
      topN: 1,
      rows: [{ word: 'access', count: 3, excerptCount: 2 }],
    })
  })

  it('turns dense crosstab cells into snapshot table rows', () => {
    expect(buildCrosstabSnapshot({
      attributes: [
        { id: 'role', name: 'Role', valueType: 'text' },
        { id: 'cohort', name: 'Cohort', valueType: 'text' },
      ],
      view: { attr1Id: 'role', attr2Id: 'cohort', percentMode: 'count', topNRows: 10, topNCols: 10 },
      result: {
        rows: [{ id: 'access', label: 'Access' }],
        cols: [{ col1: 'Student', col2: '2024', key: 'Student\u001f2024' }],
        cells: [{ rowId: 'access', rowLabel: 'Access', col1Value: 'Student', col2Value: '2024', count: 5 }],
        rowTotals: new Map(),
        colTotals: new Map(),
        grandTotal: 5,
        totalRowsBeforeTruncation: 1,
        totalColsBeforeTruncation: 1,
      },
    })).toEqual({
      kind: 'crosstab',
      attr1Name: 'Role',
      attr2Name: 'Cohort',
      percentMode: 'count',
      colLabels: ['Student × 2024'],
      rows: [{ codeName: 'Access', counts: [5] }],
    })
  })
})
