import type {
  DraftDescriptionResponse,
  DraftMemoResponse,
  SuggestCodesResponse,
  SummarizeSourceResponse,
} from './types'

type ParseResult<T> = { ok: true; response: T } | { ok: false; message: string }

function objectValue(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null
}

function invalid(label: string): ParseResult<never> {
  return { ok: false, message: `AI response was missing ${label}.` }
}

export function parseSuggestCodesResponse(value: unknown): ParseResult<SuggestCodesResponse> {
  const root = objectValue(value)
  if (!root || !Array.isArray(root.suggestions)) return invalid('code suggestions')

  const suggestions = root.suggestions
    .map((item) => {
      const suggestion = objectValue(item)
      if (!suggestion || typeof suggestion.name !== 'string' || typeof suggestion.description !== 'string') return null
      return { name: suggestion.name, description: suggestion.description }
    })
    .filter((item): item is SuggestCodesResponse['suggestions'][number] => Boolean(item))

  if (suggestions.length === 0) return invalid('valid code suggestions')
  return { ok: true, response: { suggestions } }
}

export function parseDraftDescriptionResponse(value: unknown): ParseResult<DraftDescriptionResponse> {
  const root = objectValue(value)
  if (!root || typeof root.description !== 'string') return invalid('a code description')
  return { ok: true, response: { description: root.description } }
}

export function parseSummarizeSourceResponse(value: unknown): ParseResult<SummarizeSourceResponse> {
  const root = objectValue(value)
  if (!root || typeof root.summary !== 'string') return invalid('a source summary')
  return { ok: true, response: { summary: root.summary } }
}

export function parseDraftMemoResponse(value: unknown): ParseResult<DraftMemoResponse> {
  const root = objectValue(value)
  if (!root || typeof root.memo !== 'string') return invalid('a project memo draft')
  return { ok: true, response: { memo: root.memo } }
}
