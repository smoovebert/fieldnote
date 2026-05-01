// Shared between Code mode (multi-select active codes) and Refine mode
// (single-select active code). The Refine variant indents children by
// depth and shows a "Child" tag; the Code variant treats all codes as
// flat toggles. Both share the new-code input footer.

import type { ChangeEvent, KeyboardEvent } from 'react'
import { Plus, Tags } from 'lucide-react'
import type { Code } from '../lib/types'

type SortedCode = Code & { depth: number }

type Props = {
  variant: 'code' | 'refine'
  sortedCodes: SortedCode[]
  excerpts: Array<{ codeIds: string[] }>
  selectedCodeIds: string[]
  activeCodeId: string
  newCodeName: string
  onSelectCode: (codeId: string) => void
  onToggleSelectedCode: (codeId: string) => void
  onNewCodeNameChange: (next: string) => void
  onAddCode: () => void
}

function isPicked(props: Props, code: Code): boolean {
  return props.variant === 'code'
    ? props.selectedCodeIds.includes(code.id)
    : props.activeCodeId === code.id
}

export function CodePickerPanel(props: Props) {
  const refCounts = (() => {
    const counts = new Map<string, number>()
    for (const excerpt of props.excerpts) {
      for (const codeId of excerpt.codeIds) {
        counts.set(codeId, (counts.get(codeId) ?? 0) + 1)
      }
    }
    return counts
  })()

  return (
    <section className="panel" id="codes">
      <div className="panel-heading">
        <Tags size={18} aria-hidden="true" />
        <h2>{props.variant === 'code' ? 'Active Codes' : 'Codebook'}</h2>
      </div>
      <div className="code-picker">
        {props.sortedCodes.map((code) => {
          const picked = isPicked(props, code)
          return (
            <button
              key={code.id}
              type="button"
              className={picked ? 'selected' : ''}
              style={{ marginLeft: props.variant === 'refine' ? code.depth * 14 : 0 }}
              aria-pressed={picked}
              onClick={() => {
                if (props.variant === 'code') props.onToggleSelectedCode(code.id)
                else props.onSelectCode(code.id)
              }}
            >
              <span className="code-pick-dot" style={{ background: code.color }} />
              <span className="code-pick-name">{code.name}</span>
              {code.depth > 0 && props.variant === 'refine' && <small className="code-pick-child">Child</small>}
              <span className="code-pick-refs fn-mono">{refCounts.get(code.id) ?? 0}</span>
            </button>
          )
        })}
      </div>

      <div className="new-code">
        <input
          value={props.newCodeName}
          placeholder="New code"
          aria-label="New code name"
          onChange={(event: ChangeEvent<HTMLInputElement>) => props.onNewCodeNameChange(event.target.value)}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') props.onAddCode()
          }}
        />
        <button type="button" className="icon-button" onClick={props.onAddCode} aria-label="Add code">
          <Plus size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}
