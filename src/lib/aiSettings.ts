import { supabase } from './supabase'
import type { AiProvider, UserAiSettings } from '../ai/types'

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

export async function updateAiProvider(userId: string, provider: AiProvider): Promise<void> {
  const { error } = await supabase
    .from('fieldnote_user_settings')
    .upsert({ user_id: userId, ai_provider: provider, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function recordHostedConsent(userId: string): Promise<void> {
  const { error } = await supabase
    .from('fieldnote_user_settings')
    .upsert({ user_id: userId, hosted_ai_consent_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}
