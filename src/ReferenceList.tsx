import { Scissors, Trash2 } from 'lucide-react'
import type { Code, Excerpt } from './lib/types'

export function ReferenceList({
  excerpts,
  codes,
  onNoteChange,
  onDelete,
  onRemoveCode,
  onSplit,
  compact = false,
}: {
  excerpts: Excerpt[]
  codes: Code[]
  onNoteChange: (id: string, note: string) => void
  onDelete: (id: string) => void
  onRemoveCode: (excerptId: string, codeId: string) => void
  onSplit?: (excerptId: string) => void
  compact?: boolean
}) {
  if (!excerpts.length) {
    return <p className="empty-reference-state">No coded references in this view yet.</p>
  }

  return (
    <div className={compact ? 'excerpt-list compact' : 'excerpt-list'}>
      {excerpts.map((excerpt) => {
        const excerptCodes = codes.filter((item) => excerpt.codeIds.includes(item.id))
        return (
          <article className="excerpt-card" key={excerpt.id}>
            <div className="excerpt-meta">
              <div className="code-stack">
                {excerptCodes.map((code) => (
                  <button key={code.id} type="button" style={{ borderColor: code.color }} onClick={() => onRemoveCode(excerpt.id, code.id)}>
                    <span aria-hidden="true" style={{ background: code.color }} />
                    {code.name}
                  </button>
                ))}
              </div>
              <small>{excerpt.sourceTitle}</small>
            </div>
            <p>{excerpt.text}</p>
            <div className="reference-actions">
              <input value={excerpt.note} placeholder="Add note" aria-label="Reference note" onChange={(event) => onNoteChange(excerpt.id, event.target.value)} />
              {onSplit && (
                <button className="neutral-reference-button" type="button" onClick={() => onSplit(excerpt.id)}>
                  <Scissors size={14} aria-hidden="true" />
                  Split
                </button>
              )}
              <button type="button" onClick={() => onDelete(excerpt.id)}>
                <Trash2 size={14} aria-hidden="true" />
                Delete
              </button>
            </div>
          </article>
        )
      })}
    </div>
  )
}
