// Client wrapper for the delete-account Edge Function. The endpoint
// requires the user JWT (verified server-side) AND the email of the
// signed-in user typed into the body, so a stolen-JWT-only attack
// can't trigger deletion without also knowing the account email.
//
// On success, the auth row + every cascaded table row is gone server-
// side. The caller is responsible for signing the local session out
// and routing the user back to the public landing.

import { supabase } from './supabase'

const FUNCTIONS_BASE = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '') + '/functions/v1'

export async function deleteOwnAccount(confirmEmail: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return { ok: false, message: 'Not signed in.' }
  let res: Response
  try {
    res = await fetch(`${FUNCTIONS_BASE}/delete-account`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ confirmEmail }),
    })
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error' }
  }
  let body: { ok: boolean; message?: string }
  try {
    body = await res.json() as { ok: boolean; message?: string }
  } catch {
    return { ok: false, message: 'Server returned invalid JSON' }
  }
  if (!body.ok) return { ok: false, message: body.message ?? 'Could not delete account.' }
  return { ok: true }
}
