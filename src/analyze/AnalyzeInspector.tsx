// Analyze-mode right rail. Surfaces the live result counts, the active
// filter chips, snapshot management for the active saved query, and a
// context-aware "Export <thing> CSV" button.

import type { MouseEvent } from 'react'
import { Download, Search, Trash2 } from 'lucide-react'
import type { Case, Excerpt, SavedQuery } from '../lib/types'
import type { AnalyzePanel } from './analyzeViewState'

type Snapshot = {
  id: string
  queryId: string
  capturedAt: string
  label?: string | null
  results: { excerpts: Excerpt[] }
}

type Props = {
  analyzePanel: AnalyzePanel
  analyzeResults: Excerpt[]
  analyzeMatchingCases: Case[]
  activeQueryFilters: string[]
  activeSavedQuery: SavedQuery | null
  querySnapshots: Snapshot[]
  exportFormat: string
  onDeleteSavedQuery: (id: string) => void
  onDownloadSnapshotCsv: (snapshotId: string) => void
  onDeleteSnapshot: (snapshotId: string) => void
  // exportActiveAnalysisCsv reads the click target to detect modifiers
  // (e.g. shift-click for a different format), so the event is forwarded
  // through unchanged rather than being swallowed by an arrow wrapper.
  onExportActiveAnalysisCsv: (event: MouseEvent<HTMLButtonElement>) => void
}

function exportLabelFor(panel: AnalyzePanel): string {
  switch (panel) {
    case 'matrix':       return 'Export matrix CSV'
    case 'frequency':    return 'Export word CSV'
    case 'cooccurrence': return 'Export pairs CSV'
    case 'crosstab':     return 'Export crosstabs CSV'
    default:             return 'Export query CSV'
  }
}

export function AnalyzeInspector(props: Props) {
  const codeCount = new Set(props.analyzeResults.flatMap((excerpt) => excerpt.codeIds)).size
  const snapshotsForActive = props.activeSavedQuery
    ? props.querySnapshots.filter((s) => s.queryId === props.activeSavedQuery!.id)
    : []

  return (
    <section className="panel">
      <div className="panel-heading">
        <Search size={18} aria-hidden="true" />
        <h2>Query Summary</h2>
      </div>
      <dl className="properties-list">
        <div>
          <dt>Results</dt>
          <dd>{props.analyzeResults.length}</dd>
        </div>
        <div>
          <dt>Cases</dt>
          <dd>{props.analyzeMatchingCases.length}</dd>
        </div>
        <div>
          <dt>Codes</dt>
          <dd>{codeCount}</dd>
        </div>
      </dl>
      <div className="query-filter-list">
        <strong>Active filters</strong>
        {props.activeQueryFilters.length ? (
          props.activeQueryFilters.map((filter) => <span key={filter}>{filter}</span>)
        ) : (
          <span>None. Showing all coded excerpts.</span>
        )}
      </div>
      {props.activeSavedQuery && (
        <button
          type="button"
          className="danger-button"
          onClick={() => props.onDeleteSavedQuery(props.activeSavedQuery!.id)}
        >
          <Trash2 size={17} aria-hidden="true" />
          Delete saved query
        </button>
      )}
      {props.activeSavedQuery && (
        <section className="snapshots-panel">
          <header className="snapshots-heading">
            <h3>Pinned snapshots</h3>
            <span>{snapshotsForActive.length}</span>
          </header>
          {snapshotsForActive.length === 0 && (
            <p className="snapshots-empty">No snapshots yet. Pin a result to capture this query's excerpts at a point in time.</p>
          )}
          <ul className="snapshots-list">
            {snapshotsForActive.map((snap) => (
              <li key={snap.id}>
                <div className="snapshots-row-meta">
                  <strong>{new Date(snap.capturedAt).toLocaleString()}</strong>
                  <span>{snap.results.excerpts.length} excerpt{snap.results.excerpts.length === 1 ? '' : 's'}</span>
                  {snap.label && <em>{snap.label}</em>}
                </div>
                <div className="snapshots-row-actions">
                  <button
                    type="button"
                    onClick={() => props.onDownloadSnapshotCsv(snap.id)}
                    title={`Download as ${props.exportFormat.toUpperCase()}`}
                  >
                    <Download size={13} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => props.onDeleteSnapshot(snap.id)}
                    title="Delete snapshot"
                  >
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <button type="button" className="secondary-button" onClick={props.onExportActiveAnalysisCsv}>
        <Download size={17} aria-hidden="true" />
        {exportLabelFor(props.analyzePanel)}
      </button>
    </section>
  )
}
