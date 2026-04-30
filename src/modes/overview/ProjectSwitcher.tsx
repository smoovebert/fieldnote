import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import type { ProjectRow } from '../../lib/types'

type Props = {
  activeProjectId: string | null
  activeProjectTitle: string
  projects: ProjectRow[]
  newProjectTitle: string
  isCreatingProject: boolean
  onSelectProject: (project: ProjectRow) => void
  onNewProjectTitleChange: (next: string) => void
  onCreateProject: () => void
}

export function ProjectSwitcher(props: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const triggerLabel = props.activeProjectId ? props.activeProjectTitle || 'Untitled project' : 'No project selected'

  return (
    <div className="project-switcher" ref={containerRef}>
      <button
        type="button"
        className="project-switcher-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="project-switcher-label">{triggerLabel}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div className="project-switcher-menu" role="menu">
          <ul className="project-switcher-list">
            {props.projects.length === 0 && (
              <li className="project-switcher-empty">No projects yet.</li>
            )}
            {props.projects.map((project) => (
              <li key={project.id}>
                <button
                  type="button"
                  className={project.id === props.activeProjectId ? 'active' : ''}
                  onClick={() => {
                    props.onSelectProject(project)
                    setOpen(false)
                  }}
                >
                  <span className="project-switcher-title">{project.title || 'Untitled project'}</span>
                  <span className="project-switcher-meta">
                    {project.updated_at ? new Date(project.updated_at).toLocaleDateString() : '-'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="project-switcher-create">
            <input
              value={props.newProjectTitle}
              placeholder="New project title"
              aria-label="New project title"
              onChange={(event: ChangeEvent<HTMLInputElement>) => props.onNewProjectTitleChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  props.onCreateProject()
                  setOpen(false)
                }
              }}
            />
            <button
              type="button"
              disabled={props.isCreatingProject || !props.newProjectTitle.trim()}
              onClick={() => {
                props.onCreateProject()
                setOpen(false)
              }}
            >
              <Plus size={14} aria-hidden="true" />
              Create
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
