// Analyze-mode left rail. Lists the built-in analyses (Matrix / Word
// frequency / Co-occurrence / Crosstabs) plus the user's saved queries
// and a "Current query" entry that opens the live query builder.

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

export function AnalyzeSidebar(props: Props) {
  const isCurrentQueryActive = !props.activeSavedQueryId && props.analyzePanel === 'query'
  return (
    <>
      <button
        type="button"
        className={isCurrentQueryActive ? 'list-item active' : 'list-item'}
        onClick={props.onUseCurrentQuery}
      >
        <Search size={17} aria-hidden="true" />
        <div>
          <strong>Current query</strong>
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
      <button
        type="button"
        className={props.analyzePanel === 'matrix' ? 'list-item active' : 'list-item'}
        onClick={props.onOpenMatrix}
      >
        <Rows3 size={17} aria-hidden="true" />
        <div>
          <strong>Matrix coding</strong>
          <span>Codes by case or attribute</span>
        </div>
      </button>
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
      <button
        type="button"
        className={props.analyzePanel === 'cooccurrence' ? 'list-item active' : 'list-item'}
        onClick={props.onOpenCoOccurrence}
      >
        <ListTree size={17} aria-hidden="true" />
        <div>
          <strong>Co-occurrence</strong>
          <span>Codes that appear together</span>
        </div>
      </button>
      <button
        type="button"
        className={props.analyzePanel === 'crosstab' ? 'list-item active' : 'list-item'}
        onClick={props.onOpenCrosstab}
      >
        <Grid3x3 size={17} aria-hidden="true" />
        <div>
          <strong>Crosstabs</strong>
          <span>Two-attribute counts</span>
        </div>
      </button>
    </>
  )
}
