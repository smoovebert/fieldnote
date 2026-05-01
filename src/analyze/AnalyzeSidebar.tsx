// Analyze-mode left rail. Reframed around research question types
// rather than chart types — Evidence (retrieve coded excerpts),
// Compare (codes against cases/attributes), Language (terms in
// filtered excerpts), Relationships (codes that appear together).
// Outputs (saved queries / snapshots / exports) live in the right
// rail because they're actions on the current result, not separate
// destinations.

import { BookOpenText, FileText, Grid3x3, ListTree, Rows3, Search } from 'lucide-react'
import type { SavedQuery } from '../lib/types'
import type { AnalyzePanel } from './analyzeViewState'

type Props = {
  analyzePanel: AnalyzePanel
  savedQueries: SavedQuery[]
  activeSavedQueryId: string
  onUseCurrentQuery: () => void
  onOpenSavedQuery: (query: SavedQuery) => void
  onOpenMatrix: () => void
  onOpenFrequency: () => void
  onOpenCoOccurrence: () => void
  onOpenCrosstab: () => void
}

function GroupHeader({ title }: { title: string }) {
  return <div className="analyze-sidebar-group">{title}</div>
}

export function AnalyzeSidebar(props: Props) {
  const isCurrentQueryActive = !props.activeSavedQueryId && props.analyzePanel === 'query'
  return (
    <>
      <GroupHeader title="Evidence" />
      <button
        type="button"
        className={isCurrentQueryActive ? 'list-item active' : 'list-item'}
        onClick={props.onUseCurrentQuery}
      >
        <Search size={17} aria-hidden="true" />
        <div>
          <strong>Find excerpts</strong>
          <span>Filter coded excerpts</span>
        </div>
      </button>
      {props.savedQueries.map((query) => {
        const isActive = query.id === props.activeSavedQueryId && props.analyzePanel === 'query'
        return (
          <button
            key={query.id}
            type="button"
            className={isActive ? 'list-item active' : 'list-item'}
            onClick={() => props.onOpenSavedQuery(query)}
          >
            <FileText size={17} aria-hidden="true" />
            <div>
              <strong>{query.name}</strong>
              <span>Saved query</span>
            </div>
          </button>
        )
      })}

      <GroupHeader title="Compare" />
      <button
        type="button"
        className={props.analyzePanel === 'matrix' ? 'list-item active' : 'list-item'}
        onClick={props.onOpenMatrix}
      >
        <Rows3 size={17} aria-hidden="true" />
        <div>
          <strong>Codes by group</strong>
          <span>Codes across cases or attribute values</span>
        </div>
      </button>
      <button
        type="button"
        className={props.analyzePanel === 'crosstab' ? 'list-item active' : 'list-item'}
        onClick={props.onOpenCrosstab}
      >
        <Grid3x3 size={17} aria-hidden="true" />
        <div>
          <strong>Codes by two attributes</strong>
          <span>Crosstab with row/column percentages</span>
        </div>
      </button>

      <GroupHeader title="Language" />
      <button
        type="button"
        className={props.analyzePanel === 'frequency' ? 'list-item active' : 'list-item'}
        onClick={props.onOpenFrequency}
      >
        <BookOpenText size={17} aria-hidden="true" />
        <div>
          <strong>Word frequency</strong>
          <span>Terms in filtered excerpts</span>
        </div>
      </button>

      <GroupHeader title="Relationships" />
      <button
        type="button"
        className={props.analyzePanel === 'cooccurrence' ? 'list-item active' : 'list-item'}
        onClick={props.onOpenCoOccurrence}
      >
        <ListTree size={17} aria-hidden="true" />
        <div>
          <strong>Code co-occurrence</strong>
          <span>Codes that appear together</span>
        </div>
      </button>
    </>
  )
}
