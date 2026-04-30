import { BookOpenText, Database, FolderInput, FolderOpen, Trash2 } from 'lucide-react'
import type { Case, Memo, Source } from '../../lib/types'

type WorkspaceView = 'organize' | 'code' | 'refine' | 'classify' | 'analyze' | 'report'

type Props = {
  activeSource: Source
  sourceFolders: string[]
  cases: Case[]
  sourceExcerpts: Array<{ id: string }>
  activeSourceWords: number
  activeSourceMemo: Memo | undefined
  updateSource: (id: string, patch: Partial<Source>) => void
  assignSourceToCase: (sourceId: string, caseId: string) => void
  createCaseFromSource: () => void
  setActiveView: (view: WorkspaceView) => void
  archiveActiveSource: () => void
  restoreActiveSource: () => void
  deleteActiveSource: () => void
}

export function OrganizeInspector(props: Props) {
  const {
    activeSource,
    sourceFolders,
    cases,
    sourceExcerpts,
    activeSourceWords,
    activeSourceMemo,
    updateSource,
    assignSourceToCase,
    createCaseFromSource,
    setActiveView,
    archiveActiveSource,
    restoreActiveSource,
    deleteActiveSource,
  } = props

  return (
    <section className="panel source-properties-panel">
      <div className="panel-heading">
        <Database size={18} aria-hidden="true" />
        <h2>Source Properties</h2>
      </div>

      <label className="property-field">
        <span>Title</span>
        <input value={activeSource.title} onChange={(event) => updateSource(activeSource.id, { title: event.target.value })} />
      </label>

      <label className="property-field">
        <span>Type</span>
        <select value={activeSource.kind} onChange={(event) => updateSource(activeSource.id, { kind: event.target.value as Source['kind'] })}>
          <option value="Transcript">Transcript</option>
          <option value="Document">Document</option>
        </select>
      </label>

      <label className="property-field">
        <span>Folder</span>
        <select value={activeSource.folder} onChange={(event) => updateSource(activeSource.id, { folder: event.target.value })}>
          {sourceFolders.map((folder) => (
            <option key={folder} value={folder}>
              {folder}
            </option>
          ))}
        </select>
      </label>

      <label className="property-field">
        <span>Case</span>
        <select
          value={cases.find((item) => item.sourceIds.includes(activeSource.id))?.id ?? ''}
          aria-label={`Case for ${activeSource.title}`}
          onChange={(event) => assignSourceToCase(activeSource.id, event.target.value)}
        >
          <option value="">No case assigned</option>
          {cases.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <dl className="properties-list compact-properties">
        <div>
          <dt>Words</dt>
          <dd>{activeSourceWords}</dd>
        </div>
        <div>
          <dt>References</dt>
          <dd>{sourceExcerpts.length}</dd>
        </div>
        <div>
          <dt>Memo</dt>
          <dd>{activeSourceMemo?.body.trim() ? 'Started' : 'Blank'}</dd>
        </div>
        <div>
          <dt>Imported</dt>
          <dd>{activeSource.importedAt ? new Date(activeSource.importedAt).toLocaleDateString() : 'Sample'}</dd>
        </div>
      </dl>

      <button className="secondary-button" type="button" onClick={createCaseFromSource}>
        <Database size={17} aria-hidden="true" />
        Create case from source
      </button>
      <button className="secondary-button" type="button" onClick={() => setActiveView('code')}>
        <BookOpenText size={17} aria-hidden="true" />
        Open for coding
      </button>
      {activeSource.archived ? (
        <button className="secondary-button" type="button" onClick={restoreActiveSource}>
          <FolderInput size={17} aria-hidden="true" />
          Restore source
        </button>
      ) : (
        <button className="secondary-button" type="button" onClick={archiveActiveSource}>
          <FolderOpen size={17} aria-hidden="true" />
          Archive source
        </button>
      )}
      <button className="danger-button" type="button" onClick={deleteActiveSource}>
        <Trash2 size={17} aria-hidden="true" />
        Delete source
      </button>
    </section>
  )
}
