import { supabase } from './supabase'
import type { AiProvider, UserAiSettings } from '../ai/types'

// Reads go through the safe view (encrypted_keys never exposed to the
// client). Writes go through narrow RPCs / Edge Functions; the base
// table is not directly writable by `authenticated`.

export async function loadAiSettings(userId: string): Promise<UserAiSettings | null> {
  const { data, error } = await supabase
    .from('fieldnote_user_settings_safe')
    .select('ai_provider, hosted_ai_consent_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return null
  return {
    aiProvider: data.ai_provider as AiProvider,
    hostedAiConsentAt: data.hosted_ai_consent_at,
  }
}

// userId is no longer needed — the RPC uses auth.uid() server-side — but we
// keep it in the signature so existing callers don't change.
export async function updateAiProvider(_userId: string, provider: AiProvider): Promise<void> {
  void _userId
  const { error } = await supabase.rpc('update_ai_settings_safe', {
    p_provider: provider,
    p_hosted_consent_at: null,
  })
  if (error) throw error
}

export async function recordHostedConsent(_userId: string): Promise<void> {
  void _userId
  const { error } = await supabase.rpc('update_ai_settings_safe', {
    p_provider: null,
    p_hosted_consent_at: new Date().toISOString(),
  })
  if (error) throw error
}
