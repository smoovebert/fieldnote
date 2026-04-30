import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { FilePlus2, FolderInput, FolderOpen, ListTree, Plus } from 'lucide-react'
import type { Source } from '../../lib/types'

type Props = {
  sourceFolderFilter: string
  sourceFolders: string[]
  activeSources: Source[]
  archivedSources: Source[]
  selectSourceFolder: (folder: string) => void
  importTranscript: (event: ChangeEvent<HTMLInputElement>) => void
  moveActiveSourceToNewFolder: (folderName: string) => void
}

export function OrganizeSidebar(props: Props) {
  const { sourceFolderFilter, sourceFolders, activeSources, archivedSources, selectSourceFolder, importTranscript, moveActiveSourceToNewFolder } = props
  const [newFolderName, setNewFolderName] = useState('')

  const submit = () => {
    if (!newFolderName.trim()) return
    moveActiveSourceToNewFolder(newFolderName)
    setNewFolderName('')
  }

  return (
    <section className="folder-pane" aria-label="Source folders">
      <div className="pane-title">
        <ListTree size={16} aria-hidden="true" />
        <span>Source folders</span>
      </div>
      <label className="folder-row import-row">
        <FilePlus2 size={16} aria-hidden="true" />
        Import sources
        <input type="file" accept=".txt,.md,.csv,.docx" multiple onChange={importTranscript} />
      </label>
      <button className={sourceFolderFilter === 'All' ? 'folder-row active' : 'folder-row'} type="button" onClick={() => selectSourceFolder('All')}>
        <FolderOpen size={16} aria-hidden="true" />
        All sources
        <span>{activeSources.length}</span>
      </button>
      {sourceFolders.map((folder) => (
        <button key={folder} className={sourceFolderFilter === folder ? 'folder-row active' : 'folder-row'} type="button" onClick={() => selectSourceFolder(folder)}>
          <FolderInput size={16} aria-hidden="true" />
          {folder}
          <span>{activeSources.filter((source) => source.folder === folder).length}</span>
        </button>
      ))}
      <button className={sourceFolderFilter === 'Archived' ? 'folder-row active' : 'folder-row'} type="button" onClick={() => selectSourceFolder('Archived')}>
        <FolderOpen size={16} aria-hidden="true" />
        Archived
        <span>{archivedSources.length}</span>
      </button>
      <div className="new-folder-row">
        <input
          value={newFolderName}
          placeholder="New folder"
          aria-label="New folder name"
          onChange={(event: ChangeEvent<HTMLInputElement>) => setNewFolderName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit()
          }}
        />
        <button className="icon-button" type="button" onClick={submit} aria-label="Move source to new folder">
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}
