import type { MouseEvent } from 'react'
import { Database, Download, FileText, MessageSquareText, Rows3, Search } from 'lucide-react'

type Props = {
  exportCsv: (event: MouseEvent<HTMLButtonElement>) => void
  exportCodebookCsv: (event: MouseEvent<HTMLButtonElement>) => void
  exportCaseSheetCsv: (event: MouseEvent<HTMLButtonElement>) => void
  exportCaseExcerptCsv: (event: MouseEvent<HTMLButtonElement>) => void
  exportAnalyzeCsv: (event: MouseEvent<HTMLButtonElement>) => void
  exportMemosCsv: (event: MouseEvent<HTMLButtonElement>) => void
}

export function ReportSidebar({
  exportCsv,
  exportCodebookCsv,
  exportCaseSheetCsv,
  exportCaseExcerptCsv,
  exportAnalyzeCsv,
  exportMemosCsv,
}: Props) {
  return (
    <div className="raw-data-panel">
      <p className="fn-label raw-data-heading">Raw data</p>
      <button type="button" className="raw-data-row" onClick={(event) => exportCsv(event)}>
        <Download size={14} aria-hidden="true" />
        <span>Coded excerpts CSV</span>
      </button>
      <button type="button" className="raw-data-row" onClick={(event) => exportCodebookCsv(event)}>
        <FileText size={14} aria-hidden="true" />
        <span>Codebook CSV</span>
      </button>
      <button type="button" className="raw-data-row" onClick={(event) => exportCaseSheetCsv(event)}>
        <Database size={14} aria-hidden="true" />
        <span>Case sheet CSV</span>
      </button>
      <button type="button" className="raw-data-row" onClick={(event) => exportCaseExcerptCsv(event)}>
        <Rows3 size={14} aria-hidden="true" />
        <span>Coded excerpts by case CSV</span>
      </button>
      <button type="button" className="raw-data-row" onClick={(event) => exportAnalyzeCsv(event)}>
        <Search size={14} aria-hidden="true" />
        <span>Current query CSV</span>
      </button>
      <button type="button" className="raw-data-row" onClick={(event) => exportMemosCsv(event)}>
        <MessageSquareText size={14} aria-hidden="true" />
        <span>Memos CSV</span>
      </button>
    </div>
  )
}
