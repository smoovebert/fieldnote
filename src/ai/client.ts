import { supabase } from '../lib/supabase'
import type { AiCallKind, AiCallResult } from './types'

const FUNCTIONS_BASE = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '') + '/functions/v1'

// Hosted Gemini-free quota cap. Mirrors v_daily_cap in
// 20260501190200_add_ai_quota_rpcs.sql. Kept as a UI constant so the
// preview panel can render "X of N free calls left today" without a
// round trip — the source of truth for enforcement is still the RPC.
export const HOSTED_DAILY_CAP = 50

// Today's hosted-quota usage for the signed-in user. Reads the safe
// view (filtered to auth.uid() server-side) so this is safe to call
// from any client component. Returns 0 if no row exists yet (the
// reserve_ai_call RPC creates the row on first use).
export async function loadAiUsageToday(): Promise<{ callsToday: number; cap: number; remaining: number }> {
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('fieldnote_ai_usage_safe')
    .select('call_count')
    .eq('date', today)
    .maybeSingle()
  const callsToday = error || !data ? 0 : Number(data.call_count ?? 0)
  return {
    callsToday,
    cap: HOSTED_DAILY_CAP,
    remaining: Math.max(0, HOSTED_DAILY_CAP - callsToday),
  }
}

export async function callAi(input: { kind: AiCallKind; inputText: string; projectId: string | null }): Promise<AiCallResult> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return { ok: false, reason: 'auth', message: 'Not signed in.' }

  let res: Response
  try {
    res = await fetch(`${FUNCTIONS_BASE}/ai-call`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  } catch (e) {
    return { ok: false, reason: 'network', message: e instanceof Error ? e.message : 'Network error' }
  }

  let body: AiCallResult
  try {
    body = await res.json() as AiCallResult
  } catch {
    return { ok: false, reason: 'parse', message: 'Server returned invalid JSON' }
  }
  return body
}

export async function saveProviderKey(input: { provider: 'gemini' | 'openai' | 'anthropic'; plaintextKey: string }): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return { ok: false, message: 'Not signed in.' }
  const res = await fetch(`${FUNCTIONS_BASE}/save-key`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  const body = await res.json() as { ok: boolean; message?: string }
  if (!body.ok) return { ok: false, message: body.message ?? 'Could not save key' }
  return { ok: true }
}

/** Pre-call cost preview (rough estimate; the server returns the real cost in usage). */
export function estimateInputTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/** Gemini Flash retail pricing as of Nov 2025: $0.10 / $0.40 per million tokens. */
export function estimateCostUsd(promptTokens: number, completionTokensGuess = 250): number {
  return (promptTokens * 0.10 + completionTokensGuess * 0.40) / 1_000_000
}
