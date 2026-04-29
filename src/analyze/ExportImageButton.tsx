import { useState, type RefObject } from 'react'
import { buildExportFilename, downloadBlob, exportPng, type AnalysisName } from './exportImage'

type Props = {
  containerRef: RefObject<HTMLElement | null>
  analysis: AnalysisName
  view: string
  disabled?: boolean
  /** Optional override for canvas-native exports (wordcloud, network). Returns null on failure. */
  exportOverride?: () => Promise<Blob | null>
}

export function ExportImageButton({ containerRef, analysis, view, disabled, exportOverride }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const blob = exportOverride ? await exportOverride() : await exportPng(containerRef)
      if (!blob) {
        setError("Couldn't export this chart. Try another view.")
        return
      }
      downloadBlob(blob, buildExportFilename(analysis, view))
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="export-image-button">
      <button type="button" onClick={handleClick} disabled={disabled || busy}>
        {busy ? 'Exporting…' : '⤓ PNG'}
      </button>
      {error ? <span className="export-image-error" role="alert">{error}</span> : null}
    </span>
  )
}
