// src/analyze/CooccurrenceView.tsx
import { useMemo, useRef, useState } from 'react'
import { ChartViewToggle } from './ChartViewToggle'
import { TopNControl } from './TopNControl'
import { ExportImageButton } from './ExportImageButton'
import { Heatmap, type HeatmapCell } from './charts/Heatmap'
import { NetworkGraph, type NetworkLink, type NetworkNode } from './charts/NetworkGraph'
import { TOP_N_BOUNDS, type CooccurView as ViewKind } from './analyzeViewState'

export type CooccurPair = {
  codeAId: string; codeAName: string
  codeBId: string; codeBName: string
  count: number
  sampleExcerpt?: string
}

type Props = {
  pairs: CooccurPair[]
  view: ViewKind
  topN: number
  onViewChange: (next: ViewKind) => void
  onTopNChange: (next: number) => void
  onPairSelect?: (codeAId: string, codeBId: string) => void
  onCodeSelect?: (codeId: string) => void
  onExportCsv?: () => void
}

const NETWORK_SOFT_CAP = 20

export function CooccurrenceView({
  pairs, view, topN, onViewChange, onTopNChange, onPairSelect, onCodeSelect, onExportCsv,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [exportOverride, setExportOverride] = useState<(() => Promise<Blob | null>) | undefined>(undefined)

  const { ranked, heatmapCells, networkData } = useMemo(() => {
    const totals = new Map<string, { id: string; name: string; weight: number }>()
    for (const p of pairs) {
      const a = totals.get(p.codeAId) ?? { id: p.codeAId, name: p.codeAName, weight: 0 }
      a.weight += p.count
      totals.set(p.codeAId, a)
      const b = totals.get(p.codeBId) ?? { id: p.codeBId, name: p.codeBName, weight: 0 }
      b.weight += p.count
      totals.set(p.codeBId, b)
    }
    const ranked = [...totals.values()].sort((x, y) => y.weight - x.weight).slice(0, topN)
    const indexById = new Map(ranked.map((c, i) => [c.id, i]))

    const cells: HeatmapCell[][] = ranked.map(() => ranked.map(() => ({ value: 0 })))
    for (const p of pairs) {
      const i = indexById.get(p.codeAId)
      const j = indexById.get(p.codeBId)
      if (i === undefined || j === undefined) continue
      cells[i][j] = { value: p.count, sample: p.sampleExcerpt }
      cells[j][i] = { value: p.count, sample: p.sampleExcerpt }
    }

    const nodes: NetworkNode[] = ranked.map((c) => ({ id: c.id, label: c.name, weight: c.weight }))
    const links: NetworkLink[] = pairs
      .filter((p) => indexById.has(p.codeAId) && indexById.has(p.codeBId))
      .map((p) => ({ source: p.codeAId, target: p.codeBId, weight: p.count }))

    return { ranked, heatmapCells: cells, networkData: { nodes, links } }
  }, [pairs, topN])

  const totalCodeCount = new Set([...pairs.map((p) => p.codeAId), ...pairs.map((p) => p.codeBId)]).size
  const showSoftCap = view === 'network' && totalCodeCount > NETWORK_SOFT_CAP

  return (
    <div className="analyze-view cooccur-view">
      <div className="analyze-view-toolbar">
        <TopNControl
          label="Top codes"
          value={topN}
          min={TOP_N_BOUNDS.cooccur.min}
          max={TOP_N_BOUNDS.cooccur.max}
          onChange={onTopNChange}
        />
        <ChartViewToggle<ViewKind>
          value={view}
          ariaLabel="Co-occurrence view"
          options={[
            { value: 'heatmap', label: 'Heatmap' },
            { value: 'network', label: 'Network' },
            { value: 'table',   label: 'Table' },
          ]}
          onChange={(next) => { onViewChange(next); setExportOverride(undefined) }}
        />
        {view !== 'table' ? (
          <ExportImageButton
            containerRef={containerRef}
            analysis="cooccurrence"
            view={view}
            disabled={ranked.length === 0}
            exportOverride={view === 'network' ? exportOverride : undefined}
          />
        ) : null}
        {onExportCsv ? <button type="button" onClick={onExportCsv}>⤓ CSV</button> : null}
      </div>

      {showSoftCap ? (
        <div className="soft-cap-banner" role="status">
          Showing top {Math.min(topN, NETWORK_SOFT_CAP)} of {totalCodeCount} codes. Network view becomes hard to read past {NETWORK_SOFT_CAP} — switch to Heatmap to see all data, or use filters to narrow.
          <button type="button" onClick={() => onViewChange('heatmap')}>Switch to Heatmap</button>
        </div>
      ) : null}

      <div className="analyze-view-surface" ref={containerRef}>
        {view === 'heatmap' ? (
          <Heatmap
            rowLabels={ranked.map((c) => c.name)}
            colLabels={ranked.map((c) => c.name)}
            cells={heatmapCells}
            onCellClick={(r, c) => onPairSelect?.(ranked[r].id, ranked[c].id)}
            emptyMessage="No co-occurring codes yet — adjust filters."
          />
        ) : null}
        {view === 'network' ? (
          <NetworkGraph
            nodes={networkData.nodes.slice(0, NETWORK_SOFT_CAP)}
            links={networkData.links.filter((l) =>
              networkData.nodes.slice(0, NETWORK_SOFT_CAP).some((n) => n.id === l.source) &&
              networkData.nodes.slice(0, NETWORK_SOFT_CAP).some((n) => n.id === l.target),
            )}
            width={640}
            height={420}
            onSelect={onCodeSelect}
            onExporterReady={setExportOverride}
          />
        ) : null}
        {view === 'table' ? (
          <table className="analyze-table">
            <thead><tr><th>Code A</th><th>Code B</th><th>Count</th></tr></thead>
            <tbody>
              {pairs.slice(0, topN * topN).map((p) => (
                <tr key={`${p.codeAId}-${p.codeBId}`}
                    onClick={() => onPairSelect?.(p.codeAId, p.codeBId)}
                    style={{ cursor: 'pointer' }}>
                  <td>{p.codeAName}</td>
                  <td>{p.codeBName}</td>
                  <td>{p.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  )
}
