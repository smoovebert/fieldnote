// Classify-mode left rail: a list of cases (or, if no cases exist yet,
// a list of unassigned sources so the researcher has somewhere to start).
// Selecting an item activates the first source in the case so Classify
// can show its case sheet on the right.

import { Database } from 'lucide-react'
import type { Case, Source } from '../../lib/types'

type Props = {
  cases: Case[]
  sources: Source[]
  activeSourceId: string
  onSelectSource: (id: string) => void
}

export function ClassifySidebar(props: Props) {
  if (props.cases.length === 0) {
    return (
      <>
        {props.sources.map((source) => (
          <button
            key={source.id}
            type="button"
            className={source.id === props.activeSourceId ? 'list-item active' : 'list-item'}
            onClick={() => props.onSelectSource(source.id)}
          >
            <Database size={17} aria-hidden="true" />
            <div>
              <strong>{source.title}</strong>
              <span>No case yet</span>
            </div>
          </button>
        ))}
      </>
    )
  }

  return (
    <>
      {props.cases.map((item) => {
        const firstSourceId = item.sourceIds[0] ?? props.activeSourceId
        const isActive = item.sourceIds.includes(props.activeSourceId)
        return (
          <button
            key={item.id}
            type="button"
            className={isActive ? 'list-item active' : 'list-item'}
            onClick={() => props.onSelectSource(firstSourceId)}
          >
            <Database size={17} aria-hidden="true" />
            <div>
              <strong>{item.name}</strong>
              <span>{item.sourceIds.length} source{item.sourceIds.length === 1 ? '' : 's'}</span>
            </div>
          </button>
        )
      })}
    </>
  )
}
