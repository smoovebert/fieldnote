// src/analyze/WordFreqView.tsx
import { useRef, useState } from 'react'
import { ChartViewToggle } from './ChartViewToggle'
import { TopNControl } from './TopNControl'
import { ExportImageButton } from './ExportImageButton'
import { BarChart, type BarDatum } from './charts/BarChart'
import { WordCloud, type WordDatum } from './charts/WordCloud'
import { TOP_N_BOUNDS, type WordFreqView as ViewKind } from './analyzeViewState'

export type WordFreqRow = {
  word: string
  count: number
  excerptCount: number
}

type Props = {
  rows: WordFreqRow[]
  totalExcerpts: number
  view: ViewKind
  topN: number
  onViewChange: (next: ViewKind) => void
  onTopNChange: (next: number) => void
  onWordSelect?: (word: string) => void
  /** Existing CSV export action wired by App.tsx. */
  onExportCsv?: () => void
}

export function WordFreqView({
  rows, totalExcerpts, view, topN, onViewChange, onTopNChange, onWordSelect, onExportCsv,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [exportOverride, setExportOverride] = useState<(() => Promise<Blob | null>) | undefined>(undefined)

  const truncated = rows.slice(0, topN)
  const barData: BarDatum[] = truncated.map((r) => ({ label: r.word, value: r.count }))
  const cloudData: WordDatum[] = truncated.map((r) => ({ text: r.word, value: r.count }))
  const isEmpty = truncated.length === 0

  return (
    <div className="analyze-view word-freq-view">
      <div className="analyze-view-toolbar">
        <TopNControl
          label="Top"
          value={topN}
          min={TOP_N_BOUNDS.wordFreq.min}
          max={TOP_N_BOUNDS.wordFreq.max}
          onChange={onTopNChange}
        />
        <ChartViewToggle<ViewKind>
          value={view}
          ariaLabel="Word frequency view"
          options={[
            { value: 'bar',   label: 'Bar' },
            { value: 'cloud', label: 'Cloud' },
            { value: 'table', label: 'Table' },
          ]}
          onChange={(next) => {
            onViewChange(next)
            setExportOverride(undefined)
          }}
        />
        {view !== 'table' ? (
          <ExportImageButton
            containerRef={containerRef}
            analysis="wordFrequency"
            view={view}
            disabled={isEmpty}
            exportOverride={view === 'cloud' ? exportOverride : undefined}
          />
        ) : null}
        {onExportCsv ? <button type="button" onClick={onExportCsv}>⤓ CSV</button> : null}
      </div>

      <div className="analyze-view-surface" ref={containerRef}>
        {view === 'bar'  ? <BarChart data={barData} onSelect={onWordSelect}
                            tooltipFormatter={(d) => `${d.label} — ${d.value} (${pct(d.value, totalExcerpts)})`} /> : null}
        {view === 'cloud' ? <WordCloud words={cloudData} onSelect={onWordSelect} onExporterReady={setExportOverride} /> : null}
        {view === 'table' ? (
          <table className="analyze-table">
            <thead><tr><th>Term</th><th>Count</th><th>In excerpts</th></tr></thead>
            <tbody>
              {truncated.map((row) => (
                <tr key={row.word} onClick={() => onWordSelect?.(row.word)} style={{ cursor: 'pointer' }}>
                  <td>{row.word}</td>
                  <td>{row.count}</td>
                  <td>{row.excerptCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  )
}

function pct(n: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((n / total) * 100)}%`
}
