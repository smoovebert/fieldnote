-- Tighten the security posture around fieldnote_user_settings:
-- 1. Drop direct client-facing select/insert/update policies on the base
--    table so encrypted_keys can never be read or written by the client.
-- 2. Recreate the safe view with security_invoker so RLS still applies
--    when called as the user, and filter by auth.uid() defensively.
-- 3. Add a narrow RPC for non-secret updates (provider, consent) that the
--    client uses instead of upserting to the base table.
-- 4. Writes to encrypted_keys continue to go through the /save-key Edge
--    Function with the service-role key.

drop policy if exists "user_settings_select_own" on public.fieldnote_user_settings;
drop policy if exists "user_settings_update_own_provider_consent" on public.fieldnote_user_settings;
drop policy if exists "user_settings_insert_own" on public.fieldnote_user_settings;

revoke select, insert, update, delete on public.fieldnote_user_settings from authenticated;
revoke select, insert, update, delete on public.fieldnote_user_settings from anon;
revoke select, insert, update, delete on public.fieldnote_user_settings from public;

drop view if exists public.fieldnote_user_settings_safe;
create view public.fieldnote_user_settings_safe
  with (security_invoker = true)
  as select user_id, ai_provider, hosted_ai_consent_at, created_at, updated_at
  from public.fieldnote_user_settings
  where user_id = auth.uid();

grant select on public.fieldnote_user_settings_safe to authenticated;

-- Re-add a SELECT policy on the base table scoped to own row, so the
-- security_invoker view can read it. Encrypted_keys is still hidden by
-- the view; clients have no path to select * on the base table because
-- the table grant is revoked above.
create policy "user_settings_select_own_via_view"
  on public.fieldnote_user_settings for select
  using (user_id = auth.uid());

-- Narrow RPC: clients update only the non-secret fields through this.
-- security definer + auth.uid() guards mean a client cannot rewrite
-- another user's row or touch encrypted_keys.
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
  insert into public.fieldnote_user_settings (user_id, ai_provider, hosted_ai_consent_at, updated_at)
  values (v_user, coalesce(p_provider, 'gemini-free'), p_hosted_consent_at, now())
  on conflict (user_id) do update
    set ai_provider = coalesce(p_provider, public.fieldnote_user_settings.ai_provider),
        hosted_ai_consent_at = coalesce(p_hosted_consent_at, public.fieldnote_user_settings.hosted_ai_consent_at),
        updated_at = now();
end $$;

revoke execute on function public.update_ai_settings_safe(text, timestamptz) from public;
grant execute on function public.update_ai_settings_safe(text, timestamptz) to authenticated;
