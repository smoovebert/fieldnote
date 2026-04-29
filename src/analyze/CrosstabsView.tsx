// src/analyze/CrosstabsView.tsx
import { useMemo } from 'react'
import { ChartViewToggle } from './ChartViewToggle'
import { TopNControlDual } from './TopNControl'
import { CROSSTAB_NONE, type CrosstabResult } from './crosstabs'
import {
  TOP_N_BOUNDS,
  type CrosstabPercentMode,
} from './analyzeViewState'

type AttributeOption = { id: string; name: string }

type Props = {
  attributes: AttributeOption[]
  attr1Id: string | null
  attr2Id: string | null
  percentMode: CrosstabPercentMode
  topNRows: number
  topNCols: number
  result: CrosstabResult | null   // null when not enough config to compute
  onAttr1Change: (id: string | null) => void
  onAttr2Change: (id: string | null) => void
  onPercentModeChange: (mode: CrosstabPercentMode) => void
  onTopNRowsChange: (n: number) => void
  onTopNColsChange: (n: number) => void
  onExportCsv?: () => void
  onCellSelect?: (rowCodeId: string, col1Value: string, col2Value: string) => void
}

function format(count: number, total: number, mode: CrosstabPercentMode): string {
  if (mode === 'count') return String(count)
  if (total === 0) return '0%'
  const pct = (count / total) * 100
  return `${pct.toFixed(pct >= 10 || pct === 0 ? 0 : 1)}%`
}

export function CrosstabsView({
  attributes,
  attr1Id, attr2Id, percentMode, topNRows, topNCols,
  result,
  onAttr1Change, onAttr2Change, onPercentModeChange,
  onTopNRowsChange, onTopNColsChange,
  onExportCsv,
  onCellSelect,
}: Props) {
  const isReady = result !== null && result.rows.length > 0 && result.cols.length > 0
  const totalsByRow = result?.rowTotals ?? new Map<string, number>()
  const totalsByCol = result?.colTotals ?? new Map<string, number>()
  const grand = result?.grandTotal ?? 0

  const colHeaderTotals = useMemo(() => {
    if (!result) return [] as number[]
    return result.cols.map((c) => result.colTotals.get(c.key) ?? 0)
  }, [result])

  const softCap =
    result &&
    (result.totalRowsBeforeTruncation > result.rows.length ||
     result.totalColsBeforeTruncation > result.cols.length)

  return (
    <div className="analyze-view crosstabs-view">
      <div className="analyze-view-toolbar">
        <label className="crosstab-attr-picker">
          <span>Attribute 1</span>
          <select
            value={attr1Id ?? ''}
            onChange={(e) => onAttr1Change(e.target.value || null)}
          >
            <option value="">— pick —</option>
            {attributes.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>
        <label className="crosstab-attr-picker">
          <span>Attribute 2</span>
          <select
            value={attr2Id ?? ''}
            onChange={(e) => onAttr2Change(e.target.value || null)}
          >
            <option value="">— pick —</option>
            {attributes.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>

        <ChartViewToggle<CrosstabPercentMode>
          value={percentMode}
          ariaLabel="Crosstab values"
          options={[
            { value: 'count', label: 'Count' },
            { value: 'row',   label: 'Row %' },
            { value: 'col',   label: 'Col %' },
          ]}
          onChange={onPercentModeChange}
        />

        <TopNControlDual
          rowsLabel="Rows"
          colsLabel="Cols"
          rows={topNRows}
          cols={topNCols}
          rowsMin={TOP_N_BOUNDS.crosstabRows.min}
          rowsMax={TOP_N_BOUNDS.crosstabRows.max}
          colsMin={TOP_N_BOUNDS.crosstabCols.min}
          colsMax={TOP_N_BOUNDS.crosstabCols.max}
          onRowsChange={onTopNRowsChange}
          onColsChange={onTopNColsChange}
        />

        {onExportCsv ? (
          <button type="button" onClick={onExportCsv} disabled={!isReady}>⤓ CSV</button>
        ) : null}
      </div>

      {softCap && result ? (
        <div className="soft-cap-banner">
          Showing top {result.rows.length} of {result.totalRowsBeforeTruncation} codes
          and top {result.cols.length} of {result.totalColsBeforeTruncation} attribute combinations.
          Adjust the caps or narrow filters to see more.
        </div>
      ) : null}

      <div className="analyze-view-surface">
        {!attr1Id || !attr2Id ? (
          <div className="analyze-empty">Pick two attributes to build a crosstab.</div>
        ) : !isReady ? (
          <div className="analyze-empty">No data for the chosen attributes within the active filters.</div>
        ) : (
          <table className="analyze-table crosstab-table">
            <thead>
              <tr>
                <th rowSpan={2} className="crosstab-row-header">Code</th>
                {result!.cols.map((c) => (
                  <th key={c.key}><div>{c.col1}</div><div>{c.col2}</div></th>
                ))}
                <th rowSpan={2} className="crosstab-total">Total</th>
              </tr>
              <tr>
                {result!.cols.map((c, colIdx) => (
                  <th key={`${c.key}-total`} className="crosstab-col-total">{colHeaderTotals[colIdx]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result!.rows.map((row, rowIdx) => {
                const rowTotal = totalsByRow.get(row.id) ?? 0
                const colCount = result!.cols.length
                return (
                  <tr key={row.id}>
                    <td>{row.label}</td>
                    {result!.cols.map((col, colIdx) => {
                      // cells is dense row-major (rows outer, cols inner) per buildCrosstab
                      const cell = result!.cells[rowIdx * colCount + colIdx]
                      const count = cell?.count ?? 0
                      const colTotal = totalsByCol.get(col.key) ?? 0
                      const denom = percentMode === 'row' ? rowTotal : percentMode === 'col' ? colTotal : 0
                      const text = format(count, denom, percentMode)
                      const isNoneCell = col.col1 === CROSSTAB_NONE || col.col2 === CROSSTAB_NONE
                      const drillable = !!onCellSelect && !isNoneCell
                      return (
                        <td
                          key={col.key}
                          onClick={drillable ? () => onCellSelect!(row.id, col.col1, col.col2) : undefined}
                          style={drillable ? { cursor: 'pointer' } : undefined}
                          title={isNoneCell ? 'Filtering on (none) is not supported yet.' : undefined}
                        >
                          {text}
                        </td>
                      )
                    })}
                    <td className="crosstab-total">{rowTotal}</td>
                  </tr>
                )
              })}
              <tr className="crosstab-total-row">
                <td className="crosstab-total">Total</td>
                {result!.cols.map((col) => (
                  <td key={`${col.key}-foot`} className="crosstab-total">
                    {totalsByCol.get(col.key) ?? 0}
                  </td>
                ))}
                <td className="crosstab-total">{grand}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
