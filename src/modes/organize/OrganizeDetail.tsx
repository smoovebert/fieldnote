import type { ChangeEvent } from 'react'
import { FilePlus2, FileText } from 'lucide-react'
import type { Excerpt, Memo, Source } from '../../lib/types'

type Props = {
  sources: Source[]
  activeSource: Source
  excerpts: Excerpt[]
  memos: Memo[]
  importTranscript: (event: ChangeEvent<HTMLInputElement>) => void
  selectActiveSource: (id: string) => void
}

export function OrganizeDetail(props: Props) {
  const { sources, activeSource, excerpts, memos, importTranscript, selectActiveSource } = props

  return (
    <article className="detail-card organize-surface">
      <div className="source-register-heading">
        <div>
          <p className="detail-kicker">Source register</p>
          <h2>All sources</h2>
        </div>
        <label className="secondary-button import-inline">
          <FilePlus2 size={17} aria-hidden="true" />
          Import
          <input type="file" accept=".txt,.md,.csv,.docx,.pdf" multiple onChange={importTranscript} />
        </label>
      </div>
      <div className="source-table" role="table" aria-label="Project sources">
        <div className="source-row source-row-head" role="row">
          <span>Title</span>
          <small>Type</small>
          <small>Folder</small>
          <small>Case</small>
          <small>References</small>
          <small>Memo</small>
        </div>
        {sources.map((source) => {
          const referenceCount = excerpts.filter((excerpt) => excerpt.sourceId === source.id).length
          const hasMemo = memos.some((memo) => memo.linkedType === 'source' && memo.linkedId === source.id && memo.body.trim())

          return (
            <button key={source.id} className={source.id === activeSource.id ? 'source-row active' : 'source-row'} type="button" onClick={() => selectActiveSource(source.id)}>
              <span>{source.title}</span>
              <small>{source.kind}</small>
              <small>{source.folder}</small>
              <small>{source.caseName || '-'}</small>
              <small>{referenceCount}</small>
              <small>{hasMemo ? 'Yes' : 'No'}</small>
            </button>
          )
        })}
        {!sources.length && (
          <article className="empty-list-state">
            <FileText size={20} aria-hidden="true" />
            <strong>No sources yet</strong>
            <span>Import a text file or move an existing source here from the properties rail.</span>
          </article>
        )}
      </div>
    </article>
  )
}
