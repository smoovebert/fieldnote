import type { ChangeEvent } from 'react'
import { FilePlus2, ListTree } from 'lucide-react'
import type { Source } from '../../lib/types'
import { SourcesView } from '../../components/SourcesView'

type Props = {
  activeSources: Source[]
  archivedSources: Source[]
  activeSourceId: string | null
  onSelectSource: (id: string) => void
  importTranscript: (event: ChangeEvent<HTMLInputElement>) => void
  onRenameFolder: (oldName: string, newName: string) => void
  onDeleteFolder: (name: string) => void
}

export function OrganizeSidebar(props: Props) {
  const { activeSources, archivedSources, activeSourceId, onSelectSource, importTranscript, onRenameFolder, onDeleteFolder } = props

  return (
    <section className="folder-pane" aria-label="Sources">
      <div className="pane-title">
        <ListTree size={16} aria-hidden="true" />
        <span>Sources</span>
      </div>
      <label className="folder-row import-row">
        <FilePlus2 size={16} aria-hidden="true" />
        Import sources
        <input type="file" accept=".txt,.md,.csv,.docx" multiple onChange={importTranscript} />
      </label>
      <SourcesView
        sources={activeSources}
        archivedSources={archivedSources}
        activeSourceId={activeSourceId}
        onSelectSource={onSelectSource}
        onRenameFolder={onRenameFolder}
        onDeleteFolder={onDeleteFolder}
      />
    </section>
  )
}
