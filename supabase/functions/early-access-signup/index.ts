// Public early-access signup endpoint. The database trigger on auth.users
// is the hard gate; this function gives the app a friendly allowlist check
// and keeps signup metadata consistent.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ALLOWED_TERMS_VERSION = '2026-05-02-alpha'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization, apikey, content-type',
    },
  })
}

function normalizeEmail(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'authorization, apikey, content-type',
      },
    })
  }
  if (req.method !== 'POST') return jsonResponse(405, { ok: false, message: 'POST only' })

  let body: any
  try {
    body = await req.json()
  } catch {
    return jsonResponse(400, { ok: false, message: 'Body is not JSON' })
  }

  const email = normalizeEmail(body?.email)
  const password = String(body?.password ?? '')
  const termsAccepted = Boolean(body?.termsAccepted)
  const termsVersion = String(body?.termsVersion ?? '')
  const emailRedirectTo = String(body?.emailRedirectTo ?? '')

  if (!email || !email.includes('@')) return jsonResponse(400, { ok: false, code: 'invalid-email', message: 'Enter a valid email address.' })
  if (password.length < 6) return jsonResponse(400, { ok: false, code: 'weak-password', message: 'Password must be at least 6 characters.' })
  if (!termsAccepted || termsVersion !== ALLOWED_TERMS_VERSION) {
    return jsonResponse(400, { ok: false, code: 'terms-required', message: 'Please accept the current Fieldnote terms first.' })
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: invite, error: inviteErr } = await admin
    .from('fieldnote_access_invites')
    .select('id, status')
    .eq('email', email)
    .maybeSingle()

  if (inviteErr) return jsonResponse(500, { ok: false, message: inviteErr.message })
  if (!invite || invite.status === 'revoked') {
    return jsonResponse(403, {
      ok: false,
      code: 'early-access-required',
      message: 'Fieldnote is currently opening access in small research cohorts. Request access and we will follow up shortly.',
    })
  }

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const options: {
    data: Record<string, string>
    emailRedirectTo?: string
  } = {
    data: {
      termsAcceptedAt: new Date().toISOString(),
      termsVersion: ALLOWED_TERMS_VERSION,
      earlyAccessInviteId: invite.id,
    },
  }
  if (emailRedirectTo.startsWith('http://') || emailRedirectTo.startsWith('https://')) {
    options.emailRedirectTo = emailRedirectTo
  }

  const { error: signupErr } = await anon.auth.signUp({
    email,
    password,
    options,
  })

  if (signupErr) {
    const message = signupErr.message.includes('fieldnote-access-required')
      ? 'Fieldnote is currently opening access in small research cohorts. Request access and we will follow up shortly.'
      : signupErr.message
    const code = signupErr.message.includes('fieldnote-access-required') ? 'early-access-required' : 'signup-failed'
    return jsonResponse(400, { ok: false, code, message })
  }

  return jsonResponse(200, {
    ok: true,
    message: 'Account created. Check your email if confirmation is enabled, then sign in.',
  })
})
