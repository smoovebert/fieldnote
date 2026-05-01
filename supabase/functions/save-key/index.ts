// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ENCRYPTION_SECRET = Deno.env.get('AI_KEY_ENCRYPTION_SECRET') ?? ''

const ALLOWED_PROVIDERS = new Set(['gemini', 'openai', 'anthropic'])

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
  if (req.method !== 'POST') return jsonResponse(405, { ok: false, message: 'POST only' })

  const authHeader = req.headers.get('authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return jsonResponse(401, { ok: false, message: 'Missing bearer token' })
  const userJwt = authHeader.slice('Bearer '.length)

  // Service-role client without an Authorization override so PostgREST
  // sees the request as service_role. Verify the user JWT separately.
  // (See ai-call/index.ts for the same pattern and the rationale.)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userErr } = await supabase.auth.getUser(userJwt)
  if (userErr || !userData.user) return jsonResponse(401, { ok: false, message: 'Invalid session' })
  const userId = userData.user.id

  let body: any
  try {
    body = await req.json()
  } catch {
    return jsonResponse(400, { ok: false, message: 'Body is not JSON' })
  }
  const provider = String(body?.provider ?? '')
  const plaintextKey = String(body?.plaintextKey ?? '')
  if (!ALLOWED_PROVIDERS.has(provider)) return jsonResponse(400, { ok: false, message: `Unknown provider: ${provider}` })
  if (!plaintextKey || plaintextKey.length > 1024) return jsonResponse(400, { ok: false, message: 'plaintextKey is required and ≤1024 chars' })

  // Encrypt via ai_key_encrypt RPC helper
  const { data: ciphertextB64, error: encErr } = await supabase
    .rpc('ai_key_encrypt', { p_plaintext: plaintextKey, p_secret: ENCRYPTION_SECRET })
  if (encErr || !ciphertextB64) return jsonResponse(500, { ok: false, message: 'Could not encrypt key' })

  // Upsert encrypted_keys[provider]
  const { data: existing } = await supabase
    .from('fieldnote_user_settings')
    .select('encrypted_keys')
    .eq('user_id', userId)
    .maybeSingle()
  const nextKeys = { ...(existing?.encrypted_keys ?? {}), [provider]: ciphertextB64 }

  const { error: upsertErr } = await supabase
    .from('fieldnote_user_settings')
    .upsert({ user_id: userId, encrypted_keys: nextKeys, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (upsertErr) return jsonResponse(500, { ok: false, message: upsertErr.message })

  return jsonResponse(200, { ok: true })
})
