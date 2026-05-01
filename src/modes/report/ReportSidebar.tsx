import type { MouseEvent } from 'react'
import { Database, Download, FileText, MessageSquareText, Rows3, Search } from 'lucide-react'

type Props = {
  exportFormat: 'csv' | 'xlsx'
  onExportFormatChange: (next: 'csv' | 'xlsx') => void
  exportCsv: (event: MouseEvent<HTMLButtonElement>) => void
  exportCodebookCsv: (event: MouseEvent<HTMLButtonElement>) => void
  exportCaseSheetCsv: (event: MouseEvent<HTMLButtonElement>) => void
  exportCaseExcerptCsv: (event: MouseEvent<HTMLButtonElement>) => void
  exportAnalyzeCsv: (event: MouseEvent<HTMLButtonElement>) => void
  exportMemosCsv: (event: MouseEvent<HTMLButtonElement>) => void
}

export function ReportSidebar({
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
  return (
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
  )
}
