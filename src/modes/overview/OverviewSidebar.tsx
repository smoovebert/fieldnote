// Overview-mode left rail: full project picker with rich rows
// (title + description + last-updated + source/code counts) plus
// create-blank, sample-project, and backup import controls.
//
// On non-Overview modes the project picker is gone from the header
// entirely; researchers go to Overview to switch projects.

import type { ChangeEvent } from 'react'
import { Database, FileText, Plus, Sparkles, Trash2, Upload } from 'lucide-react'
import type { ProjectRow } from '../../lib/types'

type Props = {
  activeProjectId: string | null
  projects: ProjectRow[]
  newProjectTitle: string
  isCreatingProject: boolean
  onSelectProject: (project: ProjectRow) => void
  onNewProjectTitleChange: (next: string) => void
  onCreateProject: () => void
  onCreateSampleProject: () => void
  onDeleteProject: (projectId: string) => void
  onImportBackup: (file: File) => void
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString()
}

export function OverviewSidebar(props: Props) {
  return (
    <section className="overview-sidebar" aria-label="Projects">
      <div className="pane-title">
        <Database size={16} aria-hidden="true" />
        <span>Projects</span>
      </div>

      <ul className="overview-sidebar-list">
        {props.projects.length === 0 && (
          <li className="overview-sidebar-empty">No projects yet — create one below.</li>
        )}
        {props.projects.map((project) => {
          const sourceCount = (project.sources?.length ?? 0)
          const codeCount = (project.codes?.length ?? 0)
          const isActive = project.id === props.activeProjectId
          return (
            <li key={project.id} className={isActive ? 'active' : ''}>
              <button
                type="button"
                className="overview-sidebar-row"
                onClick={() => props.onSelectProject(project)}
              >
                <strong>{project.title || 'Untitled project'}</strong>
                {project.description ? (
                  <span className="overview-sidebar-desc">{project.description}</span>
                ) : null}
                <span className="overview-sidebar-meta">
                  <span><FileText size={11} aria-hidden="true" /> {sourceCount}</span>
                  <span>·</span>
                  <span>{codeCount} code{codeCount === 1 ? '' : 's'}</span>
                  <span>·</span>
                  <span>{formatDate(project.updated_at)}</span>
                </span>
              </button>
              <button
                type="button"
                className="overview-sidebar-delete"
                aria-label={`Delete ${project.title || 'project'}`}
                title="Delete project"
                onClick={(event) => {
                  event.stopPropagation()
                  props.onDeleteProject(project.id)
                }}
              >
                <Trash2 size={12} aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ul>

      <div className="overview-sidebar-create">
        <p className="overview-sidebar-section-title">Add a project</p>
        <input
          value={props.newProjectTitle}
          placeholder="New project title"
          aria-label="New project title"
          onChange={(event: ChangeEvent<HTMLInputElement>) => props.onNewProjectTitleChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') props.onCreateProject()
          }}
        />
        <button
          type="button"
          className="overview-sidebar-create-btn"
          disabled={props.isCreatingProject || !props.newProjectTitle.trim()}
          onClick={props.onCreateProject}
        >
          <Plus size={13} aria-hidden="true" />
          Create blank project
        </button>
        <button
          type="button"
          className="overview-sidebar-sample-btn"
          disabled={props.isCreatingProject}
          onClick={props.onCreateSampleProject}
          title="Create a sample project preloaded with interviews, codes, cases, and saved analyses"
        >
          <Sparkles size={13} aria-hidden="true" />
          Try a sample project
        </button>
        <label className="overview-sidebar-import" title="Restore from a .fieldnote.json file as a new project">
          <Upload size={12} aria-hidden="true" />
          Import backup
          <input
            type="file"
            accept=".json,.fieldnote.json,application/json"
            style={{ display: 'none' }}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              props.onImportBackup(file)
              event.target.value = ''
            }}
          />
        </label>
      </div>
    </section>
  )
}

