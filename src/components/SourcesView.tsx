import { useState } from 'react'
import { ChevronDown, ChevronRight, FileText, FolderOpen } from 'lucide-react'
import type { Source } from '../lib/types'

type Props = {
  sources: Source[]
  activeSourceId: string | null
  onSelectSource: (id: string) => void
  /** Optional — when omitted, archived folder is hidden. */
  archivedSources?: Source[]
  /** Default: all folders expanded. */
  initialCollapsedFolders?: string[]
}

export function SourcesView({ sources, activeSourceId, onSelectSource, archivedSources, initialCollapsedFolders = [] }: Props) {
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() => new Set(initialCollapsedFolders))

  const toggle = (folder: string) => {
    setCollapsedFolders((current) => {
      const next = new Set(current)
      if (next.has(folder)) next.delete(folder)
      else next.add(folder)
      return next
    })
  }

  // Group active sources by folder, preserving insertion order of folders
  const groups = new Map<string, Source[]>()
  for (const s of sources) {
    const folder = s.folder?.trim() || 'Internals'
    if (!groups.has(folder)) groups.set(folder, [])
    groups.get(folder)!.push(s)
  }

  return (
    <div className="sources-view" role="tree" aria-label="Sources">
      {Array.from(groups.entries()).map(([folder, items]) => {
        const isCollapsed = collapsedFolders.has(folder)
        return (
          <div key={folder} className="sources-view-group" role="treeitem" aria-expanded={!isCollapsed}>
            <button
              type="button"
              className="sources-view-folder"
              onClick={() => toggle(folder)}
            >
              {isCollapsed ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
              <FolderOpen size={14} aria-hidden="true" />
              <span className="sources-view-folder-name">{folder}</span>
              <span className="sources-view-folder-count">{items.length}</span>
            </button>
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
