import { Download, FileText } from 'lucide-react'
import type { AnalyzePanel } from '../analyze/analyzeViewState'
import { AnalyzeSidebar } from '../analyze/AnalyzeSidebar'
import { ScrollAffordance } from './ScrollAffordance'
import { SourcesView } from './SourcesView'
import { ClassifySidebar } from '../modes/classify/ClassifySidebar'
import { OverviewSidebar } from '../modes/overview/OverviewSidebar'
import { OrganizeSidebar } from '../modes/organize/OrganizeSidebar'
import { RefineSidebar } from '../modes/refine/RefineSidebar'
import { ReportSidebar } from '../modes/report/ReportSidebar'
import type { Code, Excerpt, ProjectRow, SavedQuery, Source, Case } from '../lib/types'
import type { ReportIncludes } from '../report/buildReport'
import type { RowExportFormat } from '../lib/downloadRows'

type WorkspaceView = 'overview' | 'organize' | 'code' | 'refine' | 'classify' | 'analyze' | 'report'

type Props = {
  activeView: WorkspaceView
  projectId: string | null
  projectRows: ProjectRow[]
  isCreatingProject: boolean
  onSelectProject: (project: ProjectRow) => void
  onOpenNewProject: () => void
  onDeleteProject: (projectId: string) => void
  onImportBackup: (file: File) => void
  activeSources: Source[]
  archivedSources: Source[]
  activeSourceId: string
  onSelectSource: (sourceId: string) => void
  importTranscript: (event: React.ChangeEvent<HTMLInputElement>) => void
  onRenameFolder: (oldName: string, newName: string) => void
  onDeleteFolder: (folder: string) => void
  onCreateFolder: (name: string) => void
  extraFolders: string[]
  reportIncludes: ReportIncludes
  onReportIncludesChange: (includes: ReportIncludes) => void
  exportFormat: RowExportFormat
  onExportFormatChange: (format: RowExportFormat) => void
  exportCsv: (event: React.MouseEvent<HTMLButtonElement>) => void
  exportCodebookCsv: (event: React.MouseEvent<HTMLButtonElement>) => void
  exportCaseSheetCsv: (event: React.MouseEvent<HTMLButtonElement>) => void
  exportCaseExcerptCsv: (event: React.MouseEvent<HTMLButtonElement>) => void
  exportAnalyzeCsv: (event: React.MouseEvent<HTMLButtonElement>) => void
  exportMemosCsv: (event: React.MouseEvent<HTMLButtonElement>) => void
  activeCodeId: string
  cases: Case[]
  savedQueries: SavedQuery[]
  activeSavedQueryId: string
  analyzePanel: AnalyzePanel
  codes: Code[]
  excerpts: Excerpt[]
  onSelectCode: (codeId: string) => void
  onUseCurrentQuery: () => void
  onOpenSavedQuery: (query: SavedQuery) => void
  onOpenMatrix: () => void
  onOpenFrequency: () => void
  onOpenCoOccurrence: () => void
  onOpenCrosstab: () => void
  onReparentCode: (codeId: string, parentCodeId: string) => void
  onMergeCode: (fromCodeId: string, intoCodeId: string) => void
  newCodeName: string
  onNewCodeNameChange: (next: string) => void
  onAddCode: () => void
  onDeleteCodes: (codeIds: string[]) => void
}

export function WorkspaceSidebar(props: Props) {
  return (
    <aside
      className="workspace-sidebar"
      aria-label="Workspace sidebar"
    >
      {props.activeView === 'overview' && (
        <OverviewSidebar
          activeProjectId={props.projectId}
          projects={props.projectRows}
          isCreatingProject={props.isCreatingProject}
          onSelectProject={props.onSelectProject}
          onOpenNewProject={props.onOpenNewProject}
          onDeleteProject={props.onDeleteProject}
          onImportBackup={props.onImportBackup}
        />
      )}
      {props.activeView === 'organize' && (
        <OrganizeSidebar
          activeSources={props.activeSources}
          archivedSources={props.archivedSources}
          activeSourceId={props.activeSourceId}
          onSelectSource={props.onSelectSource}
          importTranscript={props.importTranscript}
          onRenameFolder={props.onRenameFolder}
          onDeleteFolder={props.onDeleteFolder}
          onCreateFolder={props.onCreateFolder}
          extraFolders={props.extraFolders}
        />
      )}

      {props.activeView !== 'organize' && props.activeView !== 'overview' && (
        <section className="list-view" aria-label="Objects">
          {props.activeView === 'report' && (
            <ReportSidebar
              reportIncludes={props.reportIncludes}
              onReportIncludesChange={props.onReportIncludesChange}
              exportFormat={props.exportFormat}
              onExportFormatChange={props.onExportFormatChange}
              exportCsv={props.exportCsv}
              exportCodebookCsv={props.exportCodebookCsv}
              exportCaseSheetCsv={props.exportCaseSheetCsv}
              exportCaseExcerptCsv={props.exportCaseExcerptCsv}
              exportAnalyzeCsv={props.exportAnalyzeCsv}
              exportMemosCsv={props.exportMemosCsv}
            />
          )}
          {props.activeView !== 'report' && (
            <ObjectList
              activeView={props.activeView}
              activeSourceId={props.activeSourceId}
              activeCodeId={props.activeCodeId}
              sources={props.activeSources}
              cases={props.cases}
              savedQueries={props.savedQueries}
              activeSavedQueryId={props.activeSavedQueryId}
              analyzePanel={props.analyzePanel}
              codes={props.codes}
              excerpts={props.excerpts}
              onSelectSource={props.onSelectSource}
              onSelectCode={props.onSelectCode}
              onUseCurrentQuery={props.onUseCurrentQuery}
              onOpenSavedQuery={props.onOpenSavedQuery}
              onOpenMatrix={props.onOpenMatrix}
              onOpenFrequency={props.onOpenFrequency}
              onOpenCoOccurrence={props.onOpenCoOccurrence}
              onOpenCrosstab={props.onOpenCrosstab}
              onReparentCode={props.onReparentCode}
              onMergeCode={props.onMergeCode}
              newCodeName={props.newCodeName}
              onNewCodeNameChange={props.onNewCodeNameChange}
              onAddCode={props.onAddCode}
              onDeleteCodes={props.onDeleteCodes}
            />
          )}
          <ScrollAffordance />
        </section>
      )}
    </aside>
  )
}

function ObjectList({
  activeView,
  activeSourceId,
  activeCodeId,
  sources,
  cases,
  savedQueries,
  activeSavedQueryId,
  analyzePanel,
  codes,
  excerpts,
  onSelectSource,
  onSelectCode,
  onUseCurrentQuery,
  onOpenSavedQuery,
  onOpenMatrix,
  onOpenFrequency,
  onOpenCoOccurrence,
  onOpenCrosstab,
  onReparentCode,
  onMergeCode,
  newCodeName,
  onNewCodeNameChange,
  onAddCode,
  onDeleteCodes,
}: {
  activeView: WorkspaceView
  activeSourceId: string
  activeCodeId: string
  sources: Source[]
  cases: Case[]
  savedQueries: SavedQuery[]
  activeSavedQueryId: string
  analyzePanel: AnalyzePanel
  codes: Code[]
  excerpts: Excerpt[]
  onSelectSource: (id: string) => void
  onSelectCode: (id: string) => void
  onUseCurrentQuery: () => void
  onOpenSavedQuery: (query: SavedQuery) => void
  onOpenMatrix: () => void
  onOpenFrequency: () => void
  onOpenCoOccurrence: () => void
  onOpenCrosstab: () => void
  onReparentCode: (codeId: string, parentCodeId: string) => void
  onMergeCode: (fromCodeId: string, intoCodeId: string) => void
  newCodeName: string
  onNewCodeNameChange: (next: string) => void
  onDeleteCodes: (codeIds: string[]) => void
  onAddCode: () => void
}) {
  return (
    <>
      <div className="pane-title">
        <FileText size={16} aria-hidden="true" />
        <span>{activeView === 'code' ? 'Sources' : activeView === 'refine' ? 'Codebook' : activeView === 'classify' ? 'Classifications' : activeView === 'analyze' ? 'Questions' : 'Exports'}</span>
      </div>
      {activeView === 'code' && (
        <SourcesView
          sources={sources}
          activeSourceId={activeSourceId}
          onSelectSource={onSelectSource}
        />
      )}
      {activeView === 'refine' && (
        <RefineSidebar
          codes={codes}
          excerpts={excerpts}
          activeCodeId={activeCodeId}
          onSelectCode={onSelectCode}
          onReparentCode={onReparentCode}
          onMergeCode={onMergeCode}
          newCodeName={newCodeName}
          onNewCodeNameChange={onNewCodeNameChange}
          onAddCode={onAddCode}
          onDeleteCodes={onDeleteCodes}
        />
      )}
      {activeView === 'classify' && (
        <ClassifySidebar
          cases={cases}
          sources={sources}
          activeSourceId={activeSourceId}
          onSelectSource={onSelectSource}
        />
      )}
      {activeView === 'analyze' && (
        <AnalyzeSidebar
          analyzePanel={analyzePanel}
          savedQueries={savedQueries}
          activeSavedQueryId={activeSavedQueryId}
          onUseCurrentQuery={onUseCurrentQuery}
          onOpenSavedQuery={onOpenSavedQuery}
          onOpenMatrix={onOpenMatrix}
          onOpenFrequency={onOpenFrequency}
          onOpenCoOccurrence={onOpenCoOccurrence}
          onOpenCrosstab={onOpenCrosstab}
        />
      )}
      {activeView === 'report' && (
        <article className="empty-list-state">
          <Download size={20} aria-hidden="true" />
          <strong>Exports are in the Report panel</strong>
          <span>Use the center workspace to download coded excerpts or the codebook.</span>
        </article>
      )}
    </>
  )
}
