// src/analyze/MatrixView.tsx
import { useMemo, useRef } from 'react'
import { ChartViewToggle } from './ChartViewToggle'
import { TopNControlDual } from './TopNControl'
import { ExportImageButton } from './ExportImageButton'
import { Heatmap, type HeatmapCell } from './charts/Heatmap'
import { GroupedBars, type GroupedDatum } from './charts/GroupedBars'
import { TOP_N_BOUNDS, type MatrixView as ViewKind } from './analyzeViewState'

export type MatrixCellInput = {
  rowId: string
  rowLabel: string
  colId: string
  colLabel: string
  count: number
  sampleExcerpt?: string
}

type Props = {
  rowLabels: string[]
  colLabels: string[]
  cells: MatrixCellInput[]
  view: ViewKind
  topNRows: number
  topNCols: number
  onViewChange: (next: ViewKind) => void
  onTopNRowsChange: (next: number) => void
  onTopNColsChange: (next: number) => void
  onCellSelect?: (rowId: string, colId: string) => void
  onExportCsv?: () => void
  classifyEmptyMessage?: string
}

export function MatrixView({
  rowLabels, colLabels, cells, view, topNRows, topNCols,
  onViewChange, onTopNRowsChange, onTopNColsChange,
  onCellSelect, onExportCsv, classifyEmptyMessage,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const { rows, cols, heatmapCells, groupedData } = useMemo(() => {
    const truncRows = rowLabels.slice(0, topNRows)
    const truncCols = colLabels.slice(0, topNCols)
    const rowIndex = new Map(truncRows.map((label, i) => [label, i]))
    const colIndex = new Map(truncCols.map((label, i) => [label, i]))

    const heat: HeatmapCell[][] = truncRows.map(() => truncCols.map(() => ({ value: 0 })))
    const groupedById = new Map<string, GroupedDatum>()
    for (const row of truncRows) groupedById.set(row, { rowLabel: row })

    for (const c of cells) {
      const r = rowIndex.get(c.rowLabel)
      const k = colIndex.get(c.colLabel)
      if (r === undefined || k === undefined) continue
      heat[r][k] = { value: c.count, sample: c.sampleExcerpt }
      const g = groupedById.get(c.rowLabel)
      if (g) g[c.colLabel] = c.count
    }
    return { rows: truncRows, cols: truncCols, heatmapCells: heat, groupedData: [...groupedById.values()] }
  }, [cells, rowLabels, colLabels, topNRows, topNCols])

  const cellByLabels = useMemo(() => {
    const m = new Map<string, MatrixCellInput>()
    for (const c of cells) m.set(`${c.rowLabel}__${c.colLabel}`, c)
    return m
  }, [cells])

  const isEmpty = rows.length === 0 || cols.length === 0

  return (
    <div className="analyze-view matrix-view">
      <div className="analyze-view-toolbar">
        <TopNControlDual
          rowsLabel="Rows"
          colsLabel="Cols"
          rows={topNRows}
          cols={topNCols}
          rowsMin={TOP_N_BOUNDS.matrixRows.min}
          rowsMax={TOP_N_BOUNDS.matrixRows.max}
          colsMin={TOP_N_BOUNDS.matrixCols.min}
          colsMax={TOP_N_BOUNDS.matrixCols.max}
          onRowsChange={onTopNRowsChange}
          onColsChange={onTopNColsChange}
        />
        <ChartViewToggle<ViewKind>
          value={view}
          ariaLabel="Matrix view"
          options={[
            { value: 'heatmap', label: 'Heatmap' },
            { value: 'bars',    label: 'Bars' },
            { value: 'table',   label: 'Table' },
          ]}
          onChange={onViewChange}
        />
        {view !== 'table' ? (
          <ExportImageButton
            containerRef={containerRef}
            analysis="matrix"
            view={view}
            disabled={isEmpty}
          />
        ) : null}
        {onExportCsv ? <button type="button" onClick={onExportCsv}>⤓ CSV</button> : null}
      </div>

      <div className="analyze-view-surface" ref={containerRef}>
        {view === 'heatmap' ? (
          <Heatmap
            rowLabels={rows}
            colLabels={cols}
            cells={heatmapCells}
            onCellClick={(r, c) => {
              const m = cellByLabels.get(`${rows[r]}__${cols[c]}`)
              if (m) onCellSelect?.(m.rowId, m.colId)
            }}
            emptyMessage={classifyEmptyMessage ?? 'Matrix needs cases or attribute values — go to Classify mode.'}
          />
        ) : null}
        {view === 'bars' ? (
          <GroupedBars
            data={groupedData}
            seriesKeys={cols}
            onBarClick={(rowLabel, colLabel) => {
              const m = cellByLabels.get(`${rowLabel}__${colLabel}`)
              if (m) onCellSelect?.(m.rowId, m.colId)
            }}
          />
        ) : null}
        {view === 'table' ? (
          <table className="analyze-table">
            <thead>
              <tr><th>Code</th>{cols.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((rowLabel, r) => (
                <tr key={rowLabel}>
                  <td>{rowLabel}</td>
                  {cols.map((colLabel, c) => (
                    <td
                      key={colLabel}
                      onClick={() => {
                        const m = cellByLabels.get(`${rowLabel}__${colLabel}`)
                        if (m) onCellSelect?.(m.rowId, m.colId)
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {heatmapCells[r]?.[c]?.value ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  )
}
