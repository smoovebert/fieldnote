// Account self-deletion. Verifies the caller's JWT, then uses the
// service-role admin API to delete their auth.users row. Every related
// table (fieldnote_projects, fieldnote_user_settings,
// fieldnote_ai_calls, fieldnote_ai_usage, fieldnote_query_results,
// the per-project child tables, etc.) cascades on auth.users delete,
// so a single admin.deleteUser call removes all of the user's content.
//
// Same client-split pattern as ai-call / save-key: a service-role
// client (no Authorization override) does the admin work; a separate
// auth.getUser(token) call verifies the user JWT.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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

  // Service-role client for admin.deleteUser; separate auth.getUser
  // call (no client override) verifies the JWT belongs to a real user.
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userErr } = await supabase.auth.getUser(userJwt)
  if (userErr || !userData.user) return jsonResponse(401, { ok: false, message: 'Invalid session' })
  const userId = userData.user.id

  // Defensive double-check: the body must include the email of the
  // signed-in user. This is the same value the UI requires the user to
  // re-type into the confirmation field, so a stray POST against the
  // endpoint with just a stolen JWT can't trigger deletion without
  // also knowing the account email.
  let body: any
  try {
    body = await req.json()
  } catch {
    return jsonResponse(400, { ok: false, message: 'Body is not JSON' })
  }
  const confirmEmail = String(body?.confirmEmail ?? '').trim().toLowerCase()
  const accountEmail = (userData.user.email ?? '').toLowerCase()
  if (!confirmEmail || confirmEmail !== accountEmail) {
    return jsonResponse(400, { ok: false, message: 'Email confirmation does not match account.' })
  }

  // The cascade chain handles all owned content:
  //   auth.users -> fieldnote_projects (owner_id) -> all per-project rows
  //   auth.users -> fieldnote_user_settings
  //   auth.users -> fieldnote_ai_calls
  //   auth.users -> fieldnote_ai_usage
  //   auth.users -> fieldnote_query_results (via fieldnote_projects)
  const { error: deleteErr } = await supabase.auth.admin.deleteUser(userId)
  if (deleteErr) {
    return jsonResponse(500, { ok: false, message: deleteErr.message })
  }

  return jsonResponse(200, { ok: true })
})
