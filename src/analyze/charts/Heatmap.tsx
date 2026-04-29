import { Fragment, useMemo, useState } from 'react'

export type HeatmapCell = { value: number; sample?: string }

type Props = {
  rowLabels: string[]
  colLabels: string[]
  cells: HeatmapCell[][]
  onCellClick?: (rowIndex: number, colIndex: number) => void
  emptyMessage?: string
}

export function Heatmap({ rowLabels, colLabels, cells, onCellClick, emptyMessage }: Props) {
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null)

  const max = useMemo(() => {
    let m = 0
    for (const row of cells) for (const cell of row) if (cell.value > m) m = cell.value
    return m
  }, [cells])

  if (rowLabels.length === 0 || colLabels.length === 0) {
    return <div className="chart-empty-state">{emptyMessage ?? 'No data — adjust filters.'}</div>
  }

  return (
    <div className="heatmap-wrap">
      <div
        className="heatmap-grid"
        style={{ gridTemplateColumns: `120px repeat(${colLabels.length}, minmax(28px, 1fr))` }}
      >
        <div className="heatmap-corner" />
        {colLabels.map((label) => (
          <div key={label} className="heatmap-col-header" title={label}>{label}</div>
        ))}
        {rowLabels.map((rowLabel, r) => (
          <Fragment key={`row-${r}`}>
            <div className="heatmap-row-header" title={rowLabel}>{rowLabel}</div>
            {colLabels.map((_, c) => {
              const cell = cells[r]?.[c] ?? { value: 0 }
              const intensity = max > 0 ? cell.value / max : 0
              const bg = intensityToBlue(intensity)
              return (
                <button
                  key={`cell-${r}-${c}`}
                  type="button"
                  className="heatmap-cell"
                  style={{ background: bg, color: intensity > 0.55 ? '#fff' : '#222' }}
                  onClick={() => onCellClick?.(r, c)}
                  onMouseEnter={() => setHover({ r, c })}
                  onMouseLeave={() => setHover(null)}
                >
                  {cell.value > 0 ? cell.value : ''}
                </button>
              )
            })}
          </Fragment>
        ))}
      </div>
      {hover ? (
        <div className="heatmap-tooltip" role="status">
          <strong>{rowLabels[hover.r]}</strong> × <strong>{colLabels[hover.c]}</strong>
          <span> — {cells[hover.r]?.[hover.c]?.value ?? 0}</span>
          {cells[hover.r]?.[hover.c]?.sample
            ? <em className="heatmap-sample">"{cells[hover.r]?.[hover.c]?.sample}"</em>
            : null}
        </div>
      ) : null}
    </div>
  )
}

/** Single-hue ColorBrewer-style "Blues" gradient. Colorblind-safe. */
function intensityToBlue(t: number): string {
  const start = [247, 251, 255]
  const end   = [8, 48, 107]
  const r = Math.round(start[0] + (end[0] - start[0]) * t)
  const g = Math.round(start[1] + (end[1] - start[1]) * t)
  const b = Math.round(start[2] + (end[2] - start[2]) * t)
  return `rgb(${r}, ${g}, ${b})`
}
