import type { MouseEvent } from 'react'
import { Highlighter, MessageSquareText } from 'lucide-react'
import { AnalyzeInspector } from '../analyze/AnalyzeInspector'
import type { AnalyzePanel } from '../analyze/analyzeViewState'
import { CodePickerPanel } from './CodePickerPanel'
import { ScrollAffordance } from './ScrollAffordance'
import { OverviewInspector } from '../modes/overview/OverviewInspector'
import { OrganizeInspector } from '../modes/organize/OrganizeInspector'
import { RefineInspector } from '../modes/refine/RefineInspector'
import { ReportInspector } from '../modes/report/ReportInspector'
import { ReferenceList } from '../ReferenceList'
import type { Attribute, Case, Code, Excerpt, Memo, QueryResultSnapshot, SavedQuery, Source } from '../lib/types'

type WorkspaceView = 'overview' | 'organize' | 'code' | 'refine' | 'classify' | 'analyze' | 'report'
type LineNumberingMode = 'paragraph' | 'fixed-width'
type SortedCode = Code & { depth: number }

type Props = {
  activeView: WorkspaceView
  lineNumberingMode: LineNumberingMode
  lineNumberingWidth: number
  onOpenProjectSettings: () => void
  activeSource: Source
  sourceFolders: string[]
  cases: Case[]
  sourceExcerpts: Excerpt[]
  activeSourceWords: number
  activeSourceMemo: Memo | undefined
  updateSource: (id: string, patch: Partial<Source>) => void
  assignSourceToCase: (sourceId: string, caseId: string) => void
  createCaseFromSource: () => void
  setActiveView: (view: WorkspaceView) => void
  archiveActiveSource: () => void
  restoreActiveSource: () => void
  deleteActiveSource: () => void
  onSummarizeSource: (source: { title: string; content: string }) => Promise<{ ok: true; summary: string } | { ok: false; message: string }>
  isHostedAi: boolean
  onOpenAiSettings: () => void
  sortedCodes: SortedCode[]
  excerpts: Excerpt[]
  selectedCodeIds: string[]
  activeCode: Code
  newCodeName: string
  onSelectCode: (id: string) => void
  onToggleSelectedCode: (id: string) => void
  onNewCodeNameChange: (name: string) => void
  onAddCode: () => void
  allExcerpts: Excerpt[]
  codeExcerpts: Excerpt[]
  parentCodeOptions: SortedCode[]
  activeCodeParent: Code | undefined
  activeCodeChildren: Code[]
  updateCode: (codeId: string, patch: Partial<Code>) => void
  updateCodeParent: (codeId: string, parentCodeId: string) => void
  mergeActiveCodeIntoTarget: (targetCodeId: string) => void
  deleteActiveCode: () => void
  onDraftDescription: (codeName: string, references: Array<{ sourceTitle: string; text: string }>) => Promise<{ ok: true; description: string } | { ok: false; message: string }>
  railMemoTitle: string
  contextualMemo: Memo | undefined
  railMemo: Memo | undefined
  projectMemo: Memo | undefined
  updateRailMemo: (body: string) => void
  analyzePanel: AnalyzePanel
  analyzeResults: Excerpt[]
  analyzeMatchingCases: Case[]
  activeQueryFilters: string[]
  activeSavedQuery: SavedQuery | null
  querySnapshots: QueryResultSnapshot[]
  exportFormat: string
  onDeleteSavedQuery: (id: string) => void
  onDownloadSnapshotCsv: (snapshotId: string) => void
  onDeleteSnapshot: (snapshotId: string) => void
  onUpdateSnapshotNote: (snapshotId: string, note: string) => void
  onUpdateSnapshotInclude: (snapshotId: string, include: boolean) => void
  onSendActiveAnalysisToReport: () => void
  onExportActiveAnalysisCsv: (event: MouseEvent<HTMLButtonElement>) => void
  projectTitle: string
  activeSources: Source[]
  codes: Code[]
  attributes: Attribute[]
  visibleExcerpts: Excerpt[]
  onUpdateExcerptNote: (excerptId: string, note: string) => void
  onDeleteExcerpt: (excerptId: string) => void
  onRemoveCodeFromExcerpt: (excerptId: string, codeId: string) => void
}

export function PropertiesRail(props: Props) {
  if (props.activeView === 'classify') return null

  return (
    <aside className="properties-view">
      {props.activeView === 'overview' && (
        <OverviewInspector
          lineNumberingMode={props.lineNumberingMode}
          lineNumberingWidth={props.lineNumberingWidth}
          onOpenProjectSettings={props.onOpenProjectSettings}
        />
      )}
      {props.activeView === 'organize' && (
        <OrganizeInspector
          key={props.activeSource.id}
          activeSource={props.activeSource}
          sourceFolders={props.sourceFolders}
          cases={props.cases}
          sourceExcerpts={props.sourceExcerpts}
          activeSourceWords={props.activeSourceWords}
          activeSourceMemo={props.activeSourceMemo}
          updateSource={props.updateSource}
          assignSourceToCase={props.assignSourceToCase}
          createCaseFromSource={props.createCaseFromSource}
          setActiveView={props.setActiveView}
          archiveActiveSource={props.archiveActiveSource}
          restoreActiveSource={props.restoreActiveSource}
          deleteActiveSource={props.deleteActiveSource}
          onSummarizeSource={props.onSummarizeSource}
          isHostedAi={props.isHostedAi}
          onOpenAiSettings={props.onOpenAiSettings}
        />
      )}

      {props.activeView === 'code' && (
        <CodePickerPanel
          variant="code"
          sortedCodes={props.sortedCodes}
          excerpts={props.excerpts}
          selectedCodeIds={props.selectedCodeIds}
          activeCodeId={props.activeCode.id}
          newCodeName={props.newCodeName}
          onSelectCode={props.onSelectCode}
          onToggleSelectedCode={props.onToggleSelectedCode}
          onNewCodeNameChange={props.onNewCodeNameChange}
          onAddCode={props.onAddCode}
        />
      )}
      {props.activeView === 'refine' && (
        <RefineInspector
          activeCode={props.activeCode}
          codes={props.codes}
          allExcerpts={props.allExcerpts}
          codeExcerpts={props.codeExcerpts}
          parentCodeOptions={props.parentCodeOptions}
          activeCodeParent={props.activeCodeParent}
          activeCodeChildren={props.activeCodeChildren}
          updateCode={props.updateCode}
          updateCodeParent={props.updateCodeParent}
          mergeActiveCodeIntoTarget={props.mergeActiveCodeIntoTarget}
          deleteActiveCode={props.deleteActiveCode}
          onSelectCode={props.onSelectCode}
          onDraftDescription={props.onDraftDescription}
          isHostedAi={props.isHostedAi}
          onOpenAiSettings={props.onOpenAiSettings}
        />
      )}

      {(props.activeView === 'organize' || props.activeView === 'code' || props.activeView === 'refine') && (
        <section className="panel" id="memo">
          <div className="panel-heading">
            <MessageSquareText size={18} aria-hidden="true" />
            <h2>{props.railMemoTitle}</h2>
          </div>
          <textarea
            value={props.contextualMemo?.body ?? ''}
            placeholder={`Add notes for ${props.railMemoTitle.toLowerCase()}`}
            onChange={(event) => props.updateRailMemo(event.target.value)}
            aria-label={props.railMemoTitle}
          />
          {props.railMemo && props.projectMemo && props.railMemo.id !== props.projectMemo.id && (
            <p className="memo-link-note">Linked to this {props.railMemo.linkedType}.</p>
          )}
        </section>
      )}

      {props.activeView === 'analyze' && (
        <AnalyzeInspector
          analyzePanel={props.analyzePanel}
          analyzeResults={props.analyzeResults}
          analyzeMatchingCases={props.analyzeMatchingCases}
          activeQueryFilters={props.activeQueryFilters}
          activeSavedQuery={props.activeSavedQuery}
          querySnapshots={props.querySnapshots}
          exportFormat={props.exportFormat}
          onDeleteSavedQuery={props.onDeleteSavedQuery}
          onDownloadSnapshotCsv={props.onDownloadSnapshotCsv}
          onDeleteSnapshot={props.onDeleteSnapshot}
          onUpdateSnapshotNote={props.onUpdateSnapshotNote}
          onUpdateSnapshotInclude={props.onUpdateSnapshotInclude}
          onSendActiveAnalysisToReport={props.onSendActiveAnalysisToReport}
          onExportActiveAnalysisCsv={props.onExportActiveAnalysisCsv}
        />
      )}

      {props.activeView === 'report' && (
        <ReportInspector
          projectTitle={props.projectTitle}
          sourceCount={props.activeSources.length}
          codeCount={props.codes.length}
          excerptCount={props.excerpts.length}
          caseCount={props.cases.length}
          attributeCount={props.attributes.length}
        />
      )}

      {props.activeView === 'code' && (
        <section className="panel">
          <div className="panel-heading">
            <Highlighter size={18} aria-hidden="true" />
            <h2>Excerpts</h2>
          </div>
          <ReferenceList
            excerpts={props.visibleExcerpts}
            codes={props.codes}
            onNoteChange={props.onUpdateExcerptNote}
            onDelete={props.onDeleteExcerpt}
            onRemoveCode={props.onRemoveCodeFromExcerpt}
            compact
          />
        </section>
      )}
      <ScrollAffordance />
    </aside>
  )
}
