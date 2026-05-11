export type RowExportFormat = 'csv' | 'xlsx'

export function rowsToCsv(rows: string[][]) {
  return rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n')
}

function downloadCsv(rows: string[][], filename: string) {
  const blob = new Blob([rowsToCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

async function downloadXlsx(rows: string[][], filename: string, sheetName = 'Sheet1') {
  const XLSX = await import('xlsx')
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, sheetName.slice(0, 31))
  XLSX.writeFile(book, filename)
}

export function downloadRows(rows: string[][], baseName: string, format: RowExportFormat, sheetName?: string) {
  if (format === 'xlsx') {
    void downloadXlsx(rows, `${baseName}.xlsx`, sheetName ?? 'Sheet1')
    return
  }

  downloadCsv(rows, `${baseName}.csv`)
}
