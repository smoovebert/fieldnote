import { useEffect, useMemo, useRef, useState } from 'react'
import { Database, FileText, Highlighter, ListTree, MessageSquareText, Search, X } from 'lucide-react'
import type { Case, Code, Excerpt, Memo, Source } from '../lib/types'
import { formatExcerptCitation } from '../lib/excerptCitation'

export type SearchHit =
  | { kind: 'source'; id: string; title: string; snippet: string }
  | { kind: 'memo'; id: string; title: string; snippet: string }
  | { kind: 'code'; id: string; title: string; snippet: string }
  | { kind: 'case'; id: string; title: string; snippet: string }
  | { kind: 'excerpt'; id: string; sourceId: string; sourceTitle: string; pageNumber?: number; codeId: string | null; snippet: string }

type Props = {
  sources: Source[]
  codes: Code[]
  excerpts: Excerpt[]
  cases: Case[]
  memos: Memo[]
  onOpenSource: (sourceId: string) => void
  onOpenCode: (codeId: string) => void
  onOpenCase: (caseId: string) => void
  onOpenMemo: (memoId: string) => void
  onOpenExcerpt: (sourceId: string, excerptId: string) => void
}

const SNIPPET_RADIUS = 40
const MAX_PER_KIND = 6

function snippetAround(text: string, query: string): string {
  if (!text) return ''
  const lower = text.toLowerCase()
  const idx = lower.indexOf(query.toLowerCase())
  if (idx < 0) return text.slice(0, 90) + (text.length > 90 ? '…' : '')
  const start = Math.max(0, idx - SNIPPET_RADIUS)
  const end = Math.min(text.length, idx + query.length + SNIPPET_RADIUS)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < text.length ? '…' : ''
  return prefix + text.slice(start, end) + suffix
}

function matches(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase())
}

export function HeaderSearch({ sources, codes, excerpts, cases, memos, onOpenSource, onOpenCode, onOpenCase, onOpenMemo, onOpenExcerpt }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // Cmd/Ctrl + K opens
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 0)
      } else if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const codeById = useMemo(() => new Map(codes.map((c) => [c.id, c])), [codes])

  const hits = useMemo<SearchHit[]>(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) return []
    const out: SearchHit[] = []

    const sourceHits: SearchHit[] = []
    for (const s of sources) {
      if (matches(s.title, trimmed) || matches(s.content, trimmed)) {
        sourceHits.push({
          kind: 'source',
          id: s.id,
          title: s.title,
          snippet: matches(s.title, trimmed) ? `${s.kind} · ${s.folder}` : snippetAround(s.content, trimmed),
        })
        if (sourceHits.length >= MAX_PER_KIND) break
      }
    }
    out.push(...sourceHits)

    const memoHits: SearchHit[] = []
    for (const m of memos) {
      if (matches(m.title, trimmed) || matches(m.body, trimmed)) {
        memoHits.push({
          kind: 'memo',
          id: m.id,
          title: m.title || `${m.linkedType} memo`,
          snippet: matches(m.title, trimmed) ? `Memo · ${m.linkedType}` : snippetAround(m.body, trimmed),
        })
        if (memoHits.length >= MAX_PER_KIND) break
      }
    }
    out.push(...memoHits)

    const codeHits: SearchHit[] = []
    for (const c of codes) {
      if (matches(c.name, trimmed) || matches(c.description, trimmed)) {
        codeHits.push({
          kind: 'code',
          id: c.id,
          title: c.name,
          snippet: matches(c.name, trimmed) ? 'Code' : snippetAround(c.description, trimmed),
        })
        if (codeHits.length >= MAX_PER_KIND) break
      }
    }
    out.push(...codeHits)

    const caseHits: SearchHit[] = []
    for (const k of cases) {
      if (matches(k.name, trimmed) || matches(k.description, trimmed)) {
        caseHits.push({
          kind: 'case',
          id: k.id,
          title: k.name,
          snippet: matches(k.name, trimmed) ? `Case · ${k.sourceIds.length} source${k.sourceIds.length === 1 ? '' : 's'}` : snippetAround(k.description, trimmed),
        })
        if (caseHits.length >= MAX_PER_KIND) break
      }
    }
    out.push(...caseHits)

    const excerptHits: SearchHit[] = []
    for (const e of excerpts) {
      if (matches(e.text, trimmed) || matches(e.note, trimmed)) {
        excerptHits.push({
          kind: 'excerpt',
          id: e.id,
          sourceId: e.sourceId,
          sourceTitle: e.sourceTitle,
          pageNumber: e.pageNumber,
          codeId: e.codeIds[0] ?? null,
          snippet: snippetAround(matches(e.text, trimmed) ? e.text : e.note, trimmed),
        })
        if (excerptHits.length >= MAX_PER_KIND) break
      }
    }
    out.push(...excerptHits)

    return out
  }, [query, sources, codes, excerpts, cases, memos])

  const grouped = {
    source: hits.filter((h): h is Extract<SearchHit, { kind: 'source' }> => h.kind === 'source'),
    memo: hits.filter((h): h is Extract<SearchHit, { kind: 'memo' }> => h.kind === 'memo'),
    code: hits.filter((h): h is Extract<SearchHit, { kind: 'code' }> => h.kind === 'code'),
    case: hits.filter((h): h is Extract<SearchHit, { kind: 'case' }> => h.kind === 'case'),
    excerpt: hits.filter((h): h is Extract<SearchHit, { kind: 'excerpt' }> => h.kind === 'excerpt'),
  }

  const handleHit = (hit: SearchHit) => {
    setOpen(false)
    setQuery('')
    if (hit.kind === 'source') onOpenSource(hit.id)
    else if (hit.kind === 'memo') onOpenMemo(hit.id)
    else if (hit.kind === 'code') onOpenCode(hit.id)
    else if (hit.kind === 'case') onOpenCase(hit.id)
    else if (hit.kind === 'excerpt') {
      if (hit.codeId) onOpenCode(hit.codeId)
      else onOpenExcerpt(hit.sourceId, hit.id)
    }
  }

  const isActive = open && query.trim().length >= 2

  return (
    <div className="hsearch" ref={containerRef}>
      <div className="hsearch-trigger">
        <Search size={14} aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          className="hsearch-input"
          placeholder="Search project (⌘K)"
          aria-label="Search project"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button type="button" className="hsearch-clear" aria-label="Clear search" onClick={() => { setQuery(''); inputRef.current?.focus() }}>
            <X size={12} aria-hidden="true" />
          </button>
        )}
      </div>
      {isActive && (
        <div className="hsearch-results" role="listbox">
          {hits.length === 0 && (
            <div className="hsearch-empty">No matches.</div>
          )}
          {grouped.source.length > 0 && (
            <SearchGroup label="Sources" icon={FileText}>
              {grouped.source.map((hit) => (
                <SearchRow key={hit.id} icon={FileText} title={hit.title} snippet={hit.snippet} onClick={() => handleHit(hit)} />
              ))}
            </SearchGroup>
          )}
          {grouped.memo.length > 0 && (
            <SearchGroup label="Memos" icon={MessageSquareText}>
              {grouped.memo.map((hit) => (
                <SearchRow key={hit.id} icon={MessageSquareText} title={hit.title} snippet={hit.snippet} onClick={() => handleHit(hit)} />
              ))}
            </SearchGroup>
          )}
          {grouped.code.length > 0 && (
            <SearchGroup label="Codes" icon={ListTree}>
              {grouped.code.map((hit) => (
                <SearchRow key={hit.id} icon={ListTree} title={hit.title} snippet={hit.snippet} onClick={() => handleHit(hit)} />
              ))}
            </SearchGroup>
          )}
          {grouped.case.length > 0 && (
            <SearchGroup label="Cases" icon={Database}>
              {grouped.case.map((hit) => (
                <SearchRow key={hit.id} icon={Database} title={hit.title} snippet={hit.snippet} onClick={() => handleHit(hit)} />
              ))}
            </SearchGroup>
          )}
          {grouped.excerpt.length > 0 && (
            <SearchGroup label="Excerpts" icon={Highlighter}>
              {grouped.excerpt.map((hit) => {
                const code = hit.codeId ? codeById.get(hit.codeId) : null
                return (
                  <SearchRow
                    key={hit.id}
                    icon={Highlighter}
                    title={`${formatExcerptCitation(hit)}${code ? ` · ${code.name}` : ''}`}
                    snippet={hit.snippet}
                    onClick={() => handleHit(hit)}
                  />
                )
              })}
            </SearchGroup>
          )}
        </div>
      )}
    </div>
  )
}

function SearchGroup({ label, icon: Icon, children }: { label: string; icon: typeof Search; children: React.ReactNode }) {
  return (
    <section className="hsearch-group">
      <header><Icon size={12} aria-hidden="true" /> <span>{label}</span></header>
      <ul>{children}</ul>
    </section>
  )
}

function SearchRow({ icon: Icon, title, snippet, onClick }: { icon: typeof Search; title: string; snippet: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick}>
        <Icon size={13} aria-hidden="true" />
        <div>
          <strong>{title}</strong>
          <span>{snippet}</span>
        </div>
      </button>
    </li>
  )
}
