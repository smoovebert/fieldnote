import { clampTopN } from './analyzeViewState'

type SingleProps = {
  label: string
  value: number
  min: number
  max: number
  onChange: (next: number) => void
}

export function TopNControl({ label, value, min, max, onChange }: SingleProps) {
  return (
    <label className="topn-control">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={5}
        onChange={(e) => onChange(clampTopN(Number(e.target.value), min, max))}
      />
    </label>
  )
}

type DualProps = {
  rowsLabel: string
  colsLabel: string
  rows: number
  cols: number
  rowsMin: number; rowsMax: number
  colsMin: number; colsMax: number
  onRowsChange: (next: number) => void
  onColsChange: (next: number) => void
}

export function TopNControlDual(props: DualProps) {
  return (
    <span className="topn-control-dual">
      <TopNControl
        label={props.rowsLabel}
        value={props.rows}
        min={props.rowsMin}
        max={props.rowsMax}
        onChange={props.onRowsChange}
      />
      <TopNControl
        label={props.colsLabel}
        value={props.cols}
        min={props.colsMin}
        max={props.colsMax}
        onChange={props.onColsChange}
      />
    </span>
  )
}
