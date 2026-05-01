// supabase/functions/ai-call/index.ts
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { callGemini } from './providers/gemini.ts'
import { callOpenAI } from './providers/openai.ts'
import { callAnthropic } from './providers/anthropic.ts'
import { PROMPT_TEMPLATES, isValidKind } from './prompts.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SHARED_GEMINI_KEY = Deno.env.get('SHARED_GEMINI_KEY') ?? ''
const ENCRYPTION_SECRET = Deno.env.get('AI_KEY_ENCRYPTION_SECRET') ?? ''
const HOSTED_KILL = Deno.env.get('HOSTED_AI_KILL_SWITCH') === '1'
const ALL_KILL = Deno.env.get('ALL_AI_KILL_SWITCH') === '1'

const MAX_INPUT_TOKENS_HOSTED = 20_000
const MAX_INPUT_TOKENS_BYOK = 50_000
const RPM_LIMIT_HOSTED = 10
const RPM_LIMIT_BYOK = 30

// in-memory rate-limit token bucket (best-effort, per Function instance)
const rateBuckets = new Map<string, { tokens: number; refillAt: number }>()

function rpmCheck(userId: string, limit: number): boolean {
  const now = Date.now()
  const bucket = rateBuckets.get(userId) ?? { tokens: limit, refillAt: now + 60_000 }
  if (now >= bucket.refillAt) {
    bucket.tokens = limit
    bucket.refillAt = now + 60_000
  }
  if (bucket.tokens <= 0) {
    rateBuckets.set(userId, bucket)
    return false
  }
  bucket.tokens -= 1
  rateBuckets.set(userId, bucket)
  return true
}

function approxTokenCount(text: string): number {
  // 4 chars per token rule of thumb. Used only for pre-call gating.
  return Math.ceil(text.length / 4)
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'authorization, content-type' },
    })
  }
  if (req.method !== 'POST') return jsonResponse(405, { ok: false, reason: 'method', message: 'POST only' })

  const authHeader = req.headers.get('authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return jsonResponse(401, { ok: false, reason: 'auth', message: 'Missing bearer token' })
  const userJwt = authHeader.slice('Bearer '.length)

  // Two clients: an admin client that runs as service_role for all DB/RPC
  // work (required after the lockdown migration revoked client-side grants
  // on the settings/quota tables), and an auth client used only to verify
  // the caller's JWT. Mixing the two — service-role key + Authorization:
  // <user JWT> on the same client — makes PostgREST treat the request as
  // `authenticated`, which now lacks the privileges to read encrypted_keys
  // or call reserve_ai_call.
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userErr } = await supabase.auth.getUser(userJwt)
  if (userErr || !userData.user) return jsonResponse(401, { ok: false, reason: 'auth', message: 'Invalid session' })
  const userId = userData.user.id

  let body: any
  try {
    body = await req.json()
  } catch {
    return jsonResponse(400, { ok: false, reason: 'parse', message: 'Body is not JSON' })
  }
  const kind = String(body?.kind ?? '')
  const inputText = String(body?.inputText ?? '')
  const projectId = body?.projectId ? String(body.projectId) : null

  if (!isValidKind(kind)) return jsonResponse(400, { ok: false, reason: 'kind', message: 'Unknown kind' })
  if (!inputText.trim()) return jsonResponse(400, { ok: false, reason: 'input', message: 'inputText is required' })

  // Load user's settings (provider + encrypted_keys) using service role.
  const { data: settings, error: settingsErr } = await supabase
    .from('fieldnote_user_settings')
    .select('ai_provider, encrypted_keys, hosted_ai_consent_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (settingsErr) return jsonResponse(500, { ok: false, reason: 'db', message: settingsErr.message })

  const provider = settings?.ai_provider ?? 'gemini-free'
  const isHosted = provider === 'gemini-free'

  // Kill switches
  if (ALL_KILL) return jsonResponse(503, { ok: false, reason: 'kill-switch-all', message: 'AI features temporarily disabled.' })
  if (isHosted && HOSTED_KILL) return jsonResponse(503, { ok: false, reason: 'kill-switch-hosted', message: 'Hosted AI temporarily disabled. Add your own API key in Settings to continue.' })

  // IRB consent required for hosted
  if (isHosted && !settings?.hosted_ai_consent_at) {
    return jsonResponse(412, { ok: false, reason: 'consent', message: 'IRB consent required for hosted AI.' })
  }

  const tpl = PROMPT_TEMPLATES[kind]
  const estimatedInput = approxTokenCount(tpl.systemPrompt + inputText)
  const inputCap = isHosted ? MAX_INPUT_TOKENS_HOSTED : MAX_INPUT_TOKENS_BYOK
  if (estimatedInput > inputCap) {
    return jsonResponse(413, { ok: false, reason: 'too-large', message: `Input exceeds ${inputCap} token cap.` })
  }
  const rpmLimit = isHosted ? RPM_LIMIT_HOSTED : RPM_LIMIT_BYOK
  if (!rpmCheck(userId, rpmLimit)) {
    return jsonResponse(429, { ok: false, reason: 'rate-limit', message: `Slow down — ${rpmLimit} requests/minute max.` })
  }

  // Resolve the effective model up front so cache scoping matches what we
  // actually call. tpl.model is only correct for Gemini paths; OpenAI and
  // Anthropic paths use their own models below, and a cache hit across
  // providers would return the wrong shape/output.
  let effectiveModel = tpl.model
  if (provider === 'openai-byok') effectiveModel = 'gpt-4o-mini'
  else if (provider === 'anthropic-byok') effectiveModel = 'claude-3-5-haiku-latest'

  // Cache lookup (cacheable kinds only). Hash + audit filters both include
  // provider and effective model so cache is per (user, provider, model, kind, input).
  const cacheHash = await sha256Hex(`${userId}\n${provider}\n${effectiveModel}\n${tpl.id}\n${inputText}`)
  if (tpl.cacheable) {
    const { data: cached } = await supabase
      .from('fieldnote_ai_calls')
      .select('response, prompt_tokens, completion_tokens, estimated_cost_usd')
      .eq('user_id', userId)
      .eq('kind', kind)
      .eq('provider', provider)
      .eq('content_hash', cacheHash)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (cached) {
      return jsonResponse(200, {
        ok: true,
        cacheHit: true,
        response: cached.response,
        usage: { promptTokens: cached.prompt_tokens, completionTokens: cached.completion_tokens, costUsd: cached.estimated_cost_usd },
      })
    }
  }

  // Atomic quota reservation (hosted only)
  if (isHosted) {
    const { data: reserve, error: reserveErr } = await supabase
      .rpc('reserve_ai_call', { p_user_id: userId, p_estimated_input: estimatedInput })
      .single()
    if (reserveErr) return jsonResponse(500, { ok: false, reason: 'db', message: reserveErr.message })
    if (!reserve?.ok) {
      return jsonResponse(429, { ok: false, reason: 'quota', message: 'Daily free-tier limit reached. Add your own key in Settings to continue.' })
    }
  }

  // Decrypt BYOK key if needed
  let providerKey = SHARED_GEMINI_KEY
  if (!isHosted) {
    const providerName = provider.replace('-byok', '') // 'gemini' | 'openai' | 'anthropic'
    const ciphertext = settings?.encrypted_keys?.[providerName]
    if (!ciphertext) return jsonResponse(400, { ok: false, reason: 'no-key', message: `No ${providerName} key saved. Add one in Settings.` })
    const { data: decrypted, error: decErr } = await supabase
      .rpc('ai_key_decrypt', { p_ciphertext_b64: ciphertext, p_secret: ENCRYPTION_SECRET })
    if (decErr || !decrypted) return jsonResponse(500, { ok: false, reason: 'decrypt', message: 'Could not decrypt key.' })
    providerKey = String(decrypted)
  }

  // Call provider
  let providerResp
  try {
    if (isHosted || provider === 'gemini-byok') {
      providerResp = await callGemini({ apiKey: providerKey, model: effectiveModel, systemPrompt: tpl.systemPrompt, userPrompt: tpl.buildUserPrompt(inputText) })
    } else if (provider === 'openai-byok') {
      providerResp = await callOpenAI({ apiKey: providerKey, model: effectiveModel, systemPrompt: tpl.systemPrompt, userPrompt: tpl.buildUserPrompt(inputText) })
    } else if (provider === 'anthropic-byok') {
      providerResp = await callAnthropic({ apiKey: providerKey, model: effectiveModel, systemPrompt: tpl.systemPrompt, userPrompt: tpl.buildUserPrompt(inputText) })
    } else {
      return jsonResponse(400, { ok: false, reason: 'provider', message: `Unknown provider: ${provider}` })
    }
  } catch (e: any) {
    return jsonResponse(502, { ok: false, reason: 'provider', message: e?.message ?? 'Provider call failed.' })
  }

  // Parse JSON response
  let parsed: unknown
  try {
    parsed = JSON.parse(providerResp.text)
  } catch {
    return jsonResponse(502, { ok: false, reason: 'parse', message: 'Provider returned non-JSON output.' })
  }

  // Estimated cost (Gemini Flash retail pricing)
  const costUsd = isHosted
    ? (providerResp.promptTokens * 0.10 + providerResp.completionTokens * 0.40) / 1_000_000
    : null

  // Audit row
  const { error: insertErr } = await supabase.from('fieldnote_ai_calls').insert({
    user_id: userId,
    project_id: projectId,
    kind,
    provider,
    content_hash: cacheHash,
    prompt_tokens: providerResp.promptTokens,
    completion_tokens: providerResp.completionTokens,
    estimated_cost_usd: costUsd,
    response: parsed,
    cache_hit: false,
  })
  if (insertErr) {
    // Don't fail the whole call on audit insert error — log only.
    console.warn('audit insert failed', insertErr)
  }

  // Record actuals if we reserved
  if (isHosted) {
    await supabase.rpc('record_ai_call_actuals', {
      p_user_id: userId,
      p_estimated_input: estimatedInput,
      p_actual_input: providerResp.promptTokens,
      p_actual_output: providerResp.completionTokens,
    })
  }

  return jsonResponse(200, {
    ok: true,
    cacheHit: false,
    response: parsed,
    usage: { promptTokens: providerResp.promptTokens, completionTokens: providerResp.completionTokens, costUsd },
  })
})
