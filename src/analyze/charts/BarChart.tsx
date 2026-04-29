import {
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

export type BarDatum = { label: string; value: number; secondary?: number }

type Props = {
  data: BarDatum[]
  onSelect?: (label: string) => void
  /** Optional secondary tooltip text builder (e.g. percentage). */
  tooltipFormatter?: (d: BarDatum) => string
}

export function BarChart({ data, onSelect, tooltipFormatter }: Props) {
  if (data.length === 0) {
    return <div className="chart-empty-state">No terms yet — adjust filters.</div>
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 22)}>
      <RBarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 80 }}>
        <XAxis type="number" />
        <YAxis dataKey="label" type="category" width={80} />
        <Tooltip
          formatter={(value, _name, ctx) => {
            const d = ctx.payload as BarDatum
            return tooltipFormatter ? tooltipFormatter(d) : `${value}`
          }}
        />
        <Bar dataKey="value" cursor={onSelect ? 'pointer' : 'default'}>
          {data.map((d) => (
            <Cell key={d.label} onClick={() => onSelect?.(d.label)} fill="#5b8def" />
          ))}
        </Bar>
      </RBarChart>
    </ResponsiveContainer>
  )
}
