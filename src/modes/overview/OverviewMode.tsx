import type { ChangeEvent } from 'react'
import { BarChart3, Network, Plus } from 'lucide-react'
import type { Code, Excerpt, Memo, Source } from '../../lib/types'
import { computeOntology, computeProgress } from './stats'
import { StatCard } from './StatCard'

type Props = {
  title: string
  description: string
  sources: Source[]
  codes: Code[]
  excerpts: Excerpt[]
  projectMemo: Memo | undefined
  onTitleChange: (next: string) => void
  onDescriptionChange: (next: string) => void
  onProjectMemoChange: (next: string) => void
  onNewSource: () => void
}

export function OverviewMode(props: Props) {
  const progress = computeProgress({ sources: props.sources, excerpts: props.excerpts })
  const ontology = computeOntology(props.codes)

  return (
    <article className="overview-mode">
      <header className="overview-header">
        <div className="overview-titles">
          <input
            className="overview-title"
            value={props.title}
            placeholder="Untitled project"
            aria-label="Project title"
            onChange={(event: ChangeEvent<HTMLInputElement>) => props.onTitleChange(event.target.value)}
          />
          <input
            className="overview-description"
            value={props.description}
            placeholder="One-line description for collaborators"
            aria-label="Project description"
            onChange={(event: ChangeEvent<HTMLInputElement>) => props.onDescriptionChange(event.target.value)}
          />
        </div>
        <button type="button" className="primary-button" onClick={props.onNewSource}>
          <Plus size={16} aria-hidden="true" />
          New source
        </button>
      </header>

      <div className="overview-stats">
        <StatCard
          label="Progress"
          icon={BarChart3}
          iconBackground="#e8eafc"
          primary={
            <span>
              <strong>{progress.coded}</strong>
              <span className="overview-stat-of"> of {progress.total} sources coded</span>
            </span>
          }
          progress={{ value: progress.coded, max: progress.total }}
        />
        <StatCard
          label="Ontology"
          icon={Network}
          iconBackground="#fbe9d8"
          primary={<strong>{ontology.codes}</strong>}
          secondary={<span>{ontology.themes === 1 ? '1 theme' : `${ontology.themes} themes`}</span>}
        />
      </div>

      <section className="overview-memo">
        <header className="panel-heading">
          <h2>Project memo</h2>
        </header>
        <textarea
          value={props.projectMemo?.body ?? ''}
          placeholder="Add notes about this project's research questions, design choices, or evolving thinking."
          aria-label="Project memo"
          onChange={(event) => props.onProjectMemoChange(event.target.value)}
        />
      </section>
    </article>
  )
}
