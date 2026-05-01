import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { ChevronDown, ChevronRight, FileText, FolderOpen, Pencil, Trash2 } from 'lucide-react'
import type { Source } from '../lib/types'

type Props = {
  sources: Source[]
  activeSourceId: string | null
  onSelectSource: (id: string) => void
  /** Optional — when omitted, archived folder is hidden. */
  archivedSources?: Source[]
  /** Default: all folders expanded. */
  initialCollapsedFolders?: string[]
  /** Optional — when set, folder headers (other than Internals) gain rename/delete affordances. */
  onRenameFolder?: (oldName: string, newName: string) => void
  onDeleteFolder?: (name: string) => void
}

const PROTECTED_FOLDERS = new Set(['Internals'])

export function SourcesView({
  sources,
  activeSourceId,
  onSelectSource,
  archivedSources,
  initialCollapsedFolders = [],
  onRenameFolder,
  onDeleteFolder,
}: Props) {
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() => new Set(initialCollapsedFolders))
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')

  const toggle = (folder: string) => {
    setCollapsedFolders((current) => {
      const next = new Set(current)
      if (next.has(folder)) next.delete(folder)
      else next.add(folder)
      return next
    })
  }

  const startRename = (folder: string) => {
    setRenamingFolder(folder)
    setRenameDraft(folder)
  }

  const commitRename = () => {
    if (!renamingFolder || !onRenameFolder) return
    const trimmed = renameDraft.trim()
    if (trimmed && trimmed !== renamingFolder) {
      onRenameFolder(renamingFolder, trimmed)
    }
    setRenamingFolder(null)
    setRenameDraft('')
  }

  const cancelRename = () => {
    setRenamingFolder(null)
    setRenameDraft('')
  }

  const onRenameKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitRename()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancelRename()
    }
  }

  // Group active sources by folder, preserving insertion order of folders
  const groups = new Map<string, Source[]>()
  for (const s of sources) {
    const folder = s.folder?.trim() || 'Internals'
    if (!groups.has(folder)) groups.set(folder, [])
    groups.get(folder)!.push(s)
  }

  const canEdit = (folder: string) => Boolean(onRenameFolder || onDeleteFolder) && !PROTECTED_FOLDERS.has(folder)

  return (
    <div className="sources-view" role="tree" aria-label="Sources">
      {Array.from(groups.entries()).map(([folder, items]) => {
        const isCollapsed = collapsedFolders.has(folder)
        const isRenaming = renamingFolder === folder
        return (
          <div key={folder} className="sources-view-group" role="treeitem" aria-expanded={!isCollapsed}>
            <div className="sources-view-folder-row">
              <button
                type="button"
                className="sources-view-folder"
                onClick={() => !isRenaming && toggle(folder)}
              >
                {isCollapsed ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                <FolderOpen size={14} aria-hidden="true" />
                {isRenaming ? (
                  <input
                    className="sources-view-folder-rename"
                    autoFocus
                    value={renameDraft}
                    aria-label={`Rename ${folder}`}
                    onChange={(event) => setRenameDraft(event.target.value)}
                    onBlur={commitRename}
                    onKeyDown={onRenameKey}
                    onClick={(event) => event.stopPropagation()}
                  />
                ) : (
                  <>
                    <span className="sources-view-folder-name">{folder}</span>
                    <span className="sources-view-folder-count">{items.length}</span>
                  </>
                )}
              </button>
              {!isRenaming && canEdit(folder) && (
                <div className="sources-view-folder-actions">
                  {onRenameFolder && (
                    <button
                      type="button"
                      className="sources-view-folder-action"
                      aria-label={`Rename ${folder}`}
                      title="Rename folder"
                      onClick={(event) => {
                        event.stopPropagation()
                        startRename(folder)
                      }}
                    >
                      <Pencil size={12} aria-hidden="true" />
                    </button>
                  )}
                  {onDeleteFolder && (
                    <button
                      type="button"
                      className="sources-view-folder-action sources-view-folder-action-danger"
                      aria-label={`Delete ${folder}`}
                      title="Delete folder (sources move to Internals)"
                      onClick={(event) => {
                        event.stopPropagation()
                        onDeleteFolder(folder)
                      }}
                    >
                      <Trash2 size={12} aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}
            </div>
            {!isCollapsed && (
              <ul className="sources-view-list" role="group">
                {items.map((source) => (
                  <li key={source.id}>
                    <button
                      type="button"
                      className={source.id === activeSourceId ? 'sources-view-source active' : 'sources-view-source'}
                      onClick={() => onSelectSource(source.id)}
                    >
                      <FileText size={14} aria-hidden="true" />
                      <span className="sources-view-source-title">{source.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}

      {archivedSources && archivedSources.length > 0 && (() => {
        const isCollapsed = collapsedFolders.has('__archived__')
        return (
          <div className="sources-view-group sources-view-group-archived" role="treeitem" aria-expanded={!isCollapsed}>
            <div className="sources-view-folder-row">
              <button
                type="button"
                className="sources-view-folder"
                onClick={() => toggle('__archived__')}
              >
                {isCollapsed ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                <FolderOpen size={14} aria-hidden="true" />
                <span className="sources-view-folder-name">Archived</span>
                <span className="sources-view-folder-count">{archivedSources.length}</span>
              </button>
            </div>
            {!isCollapsed && (
              <ul className="sources-view-list" role="group">
                {archivedSources.map((source) => (
                  <li key={source.id}>
                    <button
                      type="button"
                      className={source.id === activeSourceId ? 'sources-view-source active' : 'sources-view-source'}
                      onClick={() => onSelectSource(source.id)}
                    >
                      <FileText size={14} aria-hidden="true" />
                      <span className="sources-view-source-title">{source.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })()}
    </div>
  )
}
