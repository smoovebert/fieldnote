import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Highlighter, Plus, Sparkles } from 'lucide-react'
import type { Code, Source } from '../../lib/types'
import { markBackground } from './transcript'
import type { LineNumberingMode } from './transcript'
import { AiPreviewPanel } from '../../components/AiPreviewPanel'
import { estimateCostUsd, estimateInputTokens } from '../../ai/client'

type SortedCode = Code & { depth: number }
type QuickCodeMenu = { text: string; x: number; y: number }
type HighlightedLine = Array<{ text: string; codes?: { id: string; color: string; name: string }[] }>

type Props = {
  // shared data
  activeSource: Source
  selectedCodeNames: string
  selectedCodes: Code[]
  selectedCodeIds: string[]
  sortedCodes: SortedCode[]
  highlightedTranscriptLines: HighlightedLine[]
  readerWordCount: number
  readerRefCount: number
  lineNumberingMode: LineNumberingMode
  lineNumberingWidth: number
  selectionHint: string
  // setters / handlers from App
  setCodes: React.Dispatch<React.SetStateAction<Code[]>>
  setSelectedCodeIds: React.Dispatch<React.SetStateAction<string[]>>
  setActiveCodeId: (id: string) => void
  setSelectionHint: (hint: string) => void
  toggleSelectedCode: (codeId: string) => void
  codeSelection: (selectedTextOverride?: string) => void
  applyCodesToText: (selectedText: string, codeIds?: string[], label?: string) => void
  buildNewCode: (name: string, parentCodeId?: string) => Code
  onSuggestCodes: (selectedText: string) => Promise<{ ok: true; suggestions: Array<{ name: string; description: string }> } | { ok: false; message: string }>
}

export function CodeDetail(props: Props) {
  const transcriptRef = useRef<HTMLDivElement>(null)
  const [quickCodingEnabled, setQuickCodingEnabled] = useState(true)
  const [quickCodeMenu, setQuickCodeMenu] = useState<QuickCodeMenu | null>(null)
  const [quickNewCodeName, setQuickNewCodeName] = useState('')
  const [aiPhase, setAiPhase] = useState<'idle' | 'preview' | 'loading' | 'result' | 'error'>('idle')
  const [aiSuggestions, setAiSuggestions] = useState<Array<{ name: string; description: string; checked: boolean }>>([])
  const [aiError, setAiError] = useState<string | undefined>()

  const inputTokens = estimateInputTokens(quickCodeMenu?.text ?? '')
  const inputCost = estimateCostUsd(inputTokens)

  const captureQuickCodeSelection = () => {
    if (!quickCodingEnabled) return

    window.requestAnimationFrame(() => {
      const selection = window.getSelection()
      const selectedText = selection?.toString().trim() ?? ''
      const range = selection && selection.rangeCount ? selection.getRangeAt(0) : null
      const transcriptElement = transcriptRef.current
      const anchorNode = selection?.anchorNode

      if (!selectedText || !range || !transcriptElement || !anchorNode || !transcriptElement.contains(anchorNode)) {
        setQuickCodeMenu(null)
        return
      }

      const rect = range.getBoundingClientRect()
      if (!rect.width && !rect.height) return

      const x = Math.min(window.innerWidth - 220, Math.max(220, rect.left + rect.width / 2))
      const y = Math.max(88, rect.top - 12)
      setQuickNewCodeName('')
      setQuickCodeMenu({ text: selectedText, x, y })
    })
  }

  const createQuickCodeAndApply = () => {
    const name = quickNewCodeName.trim()
    if (!name || !quickCodeMenu) return

    const code = props.buildNewCode(name)
    const nextCodeIds = Array.from(new Set([...props.selectedCodeIds, code.id]))
    const nextLabel = [...props.selectedCodes.map((item) => item.name), code.name].join(', ')

    props.setCodes((current) => [...current, code])
    props.setSelectedCodeIds(nextCodeIds)
    props.setActiveCodeId(code.id)
    props.applyCodesToText(quickCodeMenu.text, nextCodeIds, nextLabel)
  }

  return (
    <article className="document-panel">
      <div className="active-codes-bar">
        <div className="active-codes-bar-text">
          <strong className="active-codes-title">{props.selectedCodeNames}</strong>
          <p className="active-codes-hint">{props.selectionHint} Active codes can be combined.</p>
        </div>
        <label className="quick-toggle">
          <input
            type="checkbox"
            checked={quickCodingEnabled}
            onChange={(event) => {
              setQuickCodingEnabled(event.target.checked)
              setQuickCodeMenu(null)
            }}
          />
          Quick menu
        </label>
      </div>

      <div
        className="reader-column"
        style={
          props.lineNumberingMode === 'fixed-width'
            ? ({ '--reader-measure': `${props.lineNumberingWidth}ch` } as CSSProperties)
            : undefined
        }
      >
        <div className="reader-meta-strip fn-meta">
          <span>{props.activeSource.caseName || props.activeSource.kind}</span>
          <span aria-hidden="true">·</span>
          <span>{props.readerWordCount.toLocaleString()} words</span>
          <span aria-hidden="true">·</span>
          <span>{props.readerRefCount} codes applied</span>
        </div>

        <div className="transcript" ref={transcriptRef} aria-label="Source text with line numbers" onMouseUp={captureQuickCodeSelection} onKeyUp={captureQuickCodeSelection}>
          {props.highlightedTranscriptLines.map((line, lineIndex) => (
            <div className="transcript-line" key={`${props.activeSource.id}-line-${lineIndex}`}>
              <span className="line-number" aria-hidden="true">
                {lineIndex + 1}
              </span>
              <span className="line-text">
                {line.length ? (
                  line.map((piece, pieceIndex) =>
                    piece.codes ? (
                      <mark
                        key={`${piece.text}-${lineIndex}-${pieceIndex}`}
                        className="multi-code-mark"
                        style={markBackground(piece.codes)}
                        title={piece.codes.map((code) => code.name).join(', ')}
                      >
                        {piece.text}
                      </mark>
                    ) : (
                      <span key={`${piece.text}-${lineIndex}-${pieceIndex}`}>{piece.text}</span>
                    )
                  )
                ) : (
                  <br />
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {quickCodingEnabled && quickCodeMenu && (
        <div className="quick-code-menu" style={{ left: quickCodeMenu.x, top: quickCodeMenu.y }}>
          <div className="quick-code-heading">
            <strong>Code selection</strong>
            <button type="button" aria-label="Close quick coding menu" onClick={() => setQuickCodeMenu(null)}>
              x
            </button>
          </div>
          <p>{quickCodeMenu.text.length > 110 ? `${quickCodeMenu.text.slice(0, 110)}...` : quickCodeMenu.text}</p>
          {aiPhase === 'idle' && (
            <button
              type="button"
              className="quick-code-ai-trigger"
              onClick={() => setAiPhase('preview')}
            >
              <Sparkles size={14} aria-hidden="true" />
              Suggest codes
            </button>
          )}
          {aiPhase !== 'idle' && (
            <AiPreviewPanel
              phase={aiPhase as 'preview' | 'loading' | 'result' | 'error'}
              inputPreview={quickCodeMenu?.text ?? ''}
              estimatedTokens={inputTokens}
              estimatedCostUsd={inputCost}
              errorMessage={aiError}
              onCancel={() => { setAiPhase('idle'); setAiSuggestions([]); setAiError(undefined) }}
              onSend={async () => {
                setAiPhase('loading')
                const result = await props.onSuggestCodes(quickCodeMenu?.text ?? '')
                if (result.ok) {
                  setAiSuggestions(result.suggestions.map((s) => ({ ...s, checked: true })))
                  setAiPhase('result')
                } else {
                  setAiError(result.message)
                  setAiPhase('error')
                }
              }}
            >
              {aiPhase === 'result' && (
                <ul className="ai-suggestions-list">
                  {aiSuggestions.map((s, i) => (
                    <li key={`${s.name}-${i}`}>
                      <label>
                        <input
                          type="checkbox"
                          checked={s.checked}
                          onChange={(e) => setAiSuggestions((current) =>
                            current.map((item, idx) => idx === i ? { ...item, checked: e.target.checked } : item)
                          )}
                        />
                        <div>
                          <strong>{s.name}</strong>
                          <span>{s.description}</span>
                        </div>
                      </label>
                    </li>
                  ))}
                  <div className="ai-suggestions-footer">
                    <button
                      type="button"
                      className="primary-button"
                      disabled={aiSuggestions.every((s) => !s.checked)}
                      onClick={() => {
                        const picks = aiSuggestions.filter((s) => s.checked)
                        if (picks.length === 0) return
                        const nextCodeIds: string[] = [...props.selectedCodeIds]
                        const namesToCreate: Array<{ name: string; description: string }> = []
                        for (const pick of picks) {
                          const existing = props.sortedCodes.find((c) => c.name.toLowerCase() === pick.name.toLowerCase())
                          if (existing) {
                            if (!nextCodeIds.includes(existing.id)) nextCodeIds.push(existing.id)
                          } else {
                            namesToCreate.push(pick)
                          }
                        }
                        const newCodes = namesToCreate.map((p) => {
                          const created = props.buildNewCode(p.name)
                          return { ...created, description: p.description }
                        })
                        if (newCodes.length) {
                          props.setCodes((current) => [...current, ...newCodes])
                          for (const c of newCodes) nextCodeIds.push(c.id)
                        }
                        const allNames = picks.map((p) => p.name).join(', ')
                        props.setSelectedCodeIds(nextCodeIds)
                        props.applyCodesToText(quickCodeMenu?.text ?? '', nextCodeIds, allNames)
                        setAiPhase('idle')
                        setAiSuggestions([])
                        setQuickCodeMenu(null)
                      }}
                    >
                      Apply {aiSuggestions.filter((s) => s.checked).length} suggested code{aiSuggestions.filter((s) => s.checked).length === 1 ? '' : 's'}
                    </button>
                  </div>
                </ul>
              )}
            </AiPreviewPanel>
          )}
          <div className="quick-code-new">
            <input
              value={quickNewCodeName}
              placeholder="New code for this passage"
              aria-label="New quick code"
              onChange={(event) => setQuickNewCodeName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') createQuickCodeAndApply()
              }}
            />
            <button type="button" onClick={createQuickCodeAndApply} disabled={!quickNewCodeName.trim()}>
              <Plus size={15} aria-hidden="true" />
              Add & apply
            </button>
          </div>
          <div className="quick-code-chips">
            {props.sortedCodes.map((code) => (
              <button
                key={code.id}
                className={props.selectedCodeIds.includes(code.id) ? 'selected' : ''}
                type="button"
                onClick={() => props.toggleSelectedCode(code.id)}
              >
                <span style={{ background: code.color }} />
                {code.name}
              </button>
            ))}
          </div>
          <button className="primary-button" type="button" onClick={() => props.codeSelection(quickCodeMenu.text)}>
            <Highlighter size={16} aria-hidden="true" />
            Apply {props.selectedCodeIds.length} code{props.selectedCodeIds.length === 1 ? '' : 's'}
          </button>
        </div>
      )}
    </article>
  )
}
