-- update_ai_settings_safe currently accepts any text for p_provider. The UI
-- only ever sends known values, but a client can invoke the RPC directly,
-- so add an explicit allow-list inside the function. We also add a CHECK
-- constraint on the base column as a defense-in-depth measure for any
-- future write path that bypasses this RPC.

create or replace function public.update_ai_settings_safe(
  p_provider text,
  p_hosted_consent_at timestamptz
)
returns void
language plpgsql security definer
set search_path = public as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not-authenticated';
  end if;
  if p_provider is not null and p_provider not in (
    'gemini-free', 'gemini-byok', 'openai-byok', 'anthropic-byok'
  ) then
    raise exception 'invalid-provider: %', p_provider;
  end if;
  insert into public.fieldnote_user_settings (user_id, ai_provider, hosted_ai_consent_at, updated_at)
  values (v_user, coalesce(p_provider, 'gemini-free'), p_hosted_consent_at, now())
  on conflict (user_id) do update
    set ai_provider = coalesce(p_provider, public.fieldnote_user_settings.ai_provider),
        hosted_ai_consent_at = coalesce(p_hosted_consent_at, public.fieldnote_user_settings.hosted_ai_consent_at),
        updated_at = now();
end $$;

alter table public.fieldnote_user_settings
  drop constraint if exists fieldnote_user_settings_ai_provider_check;
alter table public.fieldnote_user_settings
  add constraint fieldnote_user_settings_ai_provider_check
  check (ai_provider in ('gemini-free', 'gemini-byok', 'openai-byok', 'anthropic-byok'));
