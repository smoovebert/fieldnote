// src/analyze/charts/GroupedBars.tsx
import {
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export type GroupedDatum = { rowLabel: string } & Record<string, string | number>

type Props = {
  data: GroupedDatum[]
  /** Each series is one column in the matrix. */
  seriesKeys: string[]
  /** Tableau 10 categorical colors (cycled). */
  palette?: string[]
  onBarClick?: (rowLabel: string, seriesKey: string) => void
}

const TABLEAU_10 = [
  '#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f',
  '#edc948','#b07aa1','#ff9da7','#9c755f','#bab0ac',
]

export function GroupedBars({ data, seriesKeys, palette = TABLEAU_10, onBarClick }: Props) {
  if (data.length === 0 || seriesKeys.length === 0) {
    return <div className="chart-empty-state">No matrix data — adjust filters.</div>
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(280, data.length * 36)}>
      <RBarChart data={data} margin={{ top: 8, right: 16, bottom: 24, left: 16 }}>
        <XAxis dataKey="rowLabel" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />
        {seriesKeys.map((key, i) => (
          <Bar
            key={key}
            dataKey={key}
            fill={palette[i % palette.length]}
            onClick={(d: unknown) => {
              const row = (d as { rowLabel?: string } | null | undefined)?.rowLabel
              if (row) onBarClick?.(row, key)
            }}
            cursor={onBarClick ? 'pointer' : 'default'}
          />
        ))}
      </RBarChart>
    </ResponsiveContainer>
  )
}
