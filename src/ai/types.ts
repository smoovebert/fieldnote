export type AiCallKind = 'suggest_codes' | 'draft_description' | 'summarize_source' | 'draft_memo'

export type AiProvider = 'gemini-free' | 'gemini-byok' | 'openai-byok' | 'anthropic-byok'

export type SuggestCodesResponse = {
  suggestions: Array<{ name: string; description: string }>
}

export type DraftDescriptionResponse = { description: string }
export type SummarizeSourceResponse = { summary: string }
export type DraftMemoResponse = { memo: string }

export type AiResponse =
  | SuggestCodesResponse
  | DraftDescriptionResponse
  | SummarizeSourceResponse
  | DraftMemoResponse

export type AiUsage = {
  promptTokens: number
  completionTokens: number
  costUsd: number | null
}

export type AiCallResult =
  | { ok: true; cacheHit: boolean; response: AiResponse; usage: AiUsage }
  | { ok: false; reason: AiCallErrorReason; message: string }

export type AiCallErrorReason =
  | 'auth' | 'parse' | 'kind' | 'input' | 'too-large' | 'rate-limit' | 'quota'
  | 'consent' | 'kill-switch-hosted' | 'kill-switch-all' | 'no-key' | 'decrypt'
  | 'provider' | 'db' | 'network' | 'unknown'

export type UserAiSettings = {
  aiProvider: AiProvider
  hostedAiConsentAt: string | null
  hasGeminiKey: boolean
  hasOpenaiKey: boolean
  hasAnthropicKey: boolean
}
