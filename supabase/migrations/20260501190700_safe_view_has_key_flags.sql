-- Expose per-provider has_key booleans on the safe view so the BYOK
-- settings UI can tell whether switching to a *-byok provider would
-- leave the account without a usable key. The actual ciphertexts are
-- still hidden — only presence flags are projected.

drop view if exists public.fieldnote_user_settings_safe;
create view public.fieldnote_user_settings_safe
  with (security_invoker = false)
  as select
    user_id,
    ai_provider,
    hosted_ai_consent_at,
    created_at,
    updated_at,
    coalesce(encrypted_keys ? 'gemini', false) as has_gemini_key,
    coalesce(encrypted_keys ? 'openai', false) as has_openai_key,
    coalesce(encrypted_keys ? 'anthropic', false) as has_anthropic_key
  from public.fieldnote_user_settings
  where user_id = auth.uid();

grant select on public.fieldnote_user_settings_safe to authenticated;
