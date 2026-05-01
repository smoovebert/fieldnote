import type { MouseEvent } from 'react'
import { Database, Download, FileText, MessageSquareText, Rows3, Search } from 'lucide-react'
import type { ReportIncludes } from '../../report/buildReport'

type Props = {
  reportIncludes: ReportIncludes
  onReportIncludesChange: (next: ReportIncludes) => void
  exportFormat: 'csv' | 'xlsx'
  onExportFormatChange: (next: 'csv' | 'xlsx') => void
  exportCsv: (event: MouseEvent<HTMLButtonElement>) => void
  exportCodebookCsv: (event: MouseEvent<HTMLButtonElement>) => void
  exportCaseSheetCsv: (event: MouseEvent<HTMLButtonElement>) => void
  exportCaseExcerptCsv: (event: MouseEvent<HTMLButtonElement>) => void
  exportAnalyzeCsv: (event: MouseEvent<HTMLButtonElement>) => void
  exportMemosCsv: (event: MouseEvent<HTMLButtonElement>) => void
}

const SECTION_LABELS: Array<{ key: keyof ReportIncludes; label: string }> = [
  { key: 'projectMemo', label: 'Project memo' },
  { key: 'codebook', label: 'Codebook' },
  { key: 'sampleExcerpts', label: 'Coded excerpts (samples per code)' },
  { key: 'cases', label: 'Cases' },
  { key: 'sourceMemos', label: 'Source memos' },
  { key: 'snapshotMemos', label: 'Analysis snapshots (annotated)' },
]

export function ReportSidebar({
  reportIncludes,
  onReportIncludesChange,
  exportFormat,
  onExportFormatChange,
  exportCsv,
  exportCodebookCsv,
  exportCaseSheetCsv,
  exportCaseExcerptCsv,
  exportAnalyzeCsv,
  exportMemosCsv,
}: Props) {
  const formatLabel = exportFormat.toUpperCase()
  const toggle = (key: keyof ReportIncludes) =>
    onReportIncludesChange({ ...reportIncludes, [key]: !reportIncludes[key] })
  return (
    <>
    <div className="report-sections-panel">
      <p className="fn-label report-sections-heading">Report sections</p>
      {SECTION_LABELS.map(({ key, label }) => (
        <label key={key} className="report-section-toggle">
          <input
            type="checkbox"
            checked={reportIncludes[key]}
            onChange={() => toggle(key)}
          />
          <span>{label}</span>
        </label>
      ))}
    </div>
    <div className="raw-data-panel">
      <div className="raw-data-heading-row">
        <p className="fn-label raw-data-heading">Raw data</p>
        <div className="raw-data-format" role="group" aria-label="Export format">
          <button
            type="button"
            className={exportFormat === 'csv' ? 'active' : ''}
            onClick={() => onExportFormatChange('csv')}
          >
            CSV
          </button>
          <button
            type="button"
            className={exportFormat === 'xlsx' ? 'active' : ''}
            onClick={() => onExportFormatChange('xlsx')}
          >
            XLSX
          </button>
        </div>
      </div>
      <button type="button" className="raw-data-row" onClick={(event) => exportCsv(event)}>
        <Download size={14} aria-hidden="true" />
        <span>Coded excerpts {formatLabel}</span>
      </button>
      <button type="button" className="raw-data-row" onClick={(event) => exportCodebookCsv(event)}>
        <FileText size={14} aria-hidden="true" />
        <span>Codebook {formatLabel}</span>
      </button>
      <button type="button" className="raw-data-row" onClick={(event) => exportCaseSheetCsv(event)}>
        <Database size={14} aria-hidden="true" />
        <span>Case sheet {formatLabel}</span>
      </button>
      <button type="button" className="raw-data-row" onClick={(event) => exportCaseExcerptCsv(event)}>
        <Rows3 size={14} aria-hidden="true" />
        <span>Coded excerpts by case {formatLabel}</span>
      </button>
      <button type="button" className="raw-data-row" onClick={(event) => exportAnalyzeCsv(event)}>
        <Search size={14} aria-hidden="true" />
        <span>Current query {formatLabel}</span>
      </button>
      <button type="button" className="raw-data-row" onClick={(event) => exportMemosCsv(event)}>
        <MessageSquareText size={14} aria-hidden="true" />
        <span>Memos {formatLabel}</span>
      </button>
    </div>
    </>
  )
}
