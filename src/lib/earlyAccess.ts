import { supabaseAnonKey, supabaseUrl } from './supabase'

const DEFAULT_ACCESS_FORM_URL = 'mailto:studio.ops@behemothagency.com?subject=Fieldnote%20early%20access'

export const earlyAccessRequestUrl =
  (import.meta.env.VITE_FIELDNOTE_ACCESS_FORM_URL as string | undefined)?.trim() || DEFAULT_ACCESS_FORM_URL

type EarlyAccessSignupInput = {
  email: string
  password: string
  termsAccepted: boolean
  termsVersion: string
}

type EarlyAccessSignupResult = {
  ok: boolean
  code?: string
  message: string
}

export async function createEarlyAccessAccount(input: EarlyAccessSignupInput): Promise<EarlyAccessSignupResult> {
  const endpoint = `${(supabaseUrl ?? '').replace(/\/$/, '')}/functions/v1/early-access-signup`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: supabaseAnonKey ?? '',
      authorization: `Bearer ${supabaseAnonKey ?? ''}`,
    },
    body: JSON.stringify({
      ...input,
      emailRedirectTo: window.location.origin,
    }),
  })
  const payload = await response.json().catch(() => null) as EarlyAccessSignupResult | null
  if (!payload) return { ok: false, message: 'Could not create account.' }
  return {
    ok: response.ok && payload.ok,
    code: payload.code,
    message: payload.message,
  }
}
