-- Followup to 20260501190500: the safe view was created with
-- security_invoker = true, but that migration also revoked SELECT on
-- the base table from authenticated/anon, which means an invoker-mode
-- view leaves the caller without privileges to read the underlying
-- columns. Switch the view to security_invoker = false (definer mode,
-- the default) and keep the explicit `auth.uid()` filter as the access
-- control. Drop the now-unneeded base-table SELECT policy too.

drop view if exists public.fieldnote_user_settings_safe;
create view public.fieldnote_user_settings_safe
  with (security_invoker = false)
  as select user_id, ai_provider, hosted_ai_consent_at, created_at, updated_at
  from public.fieldnote_user_settings
  where user_id = auth.uid();

grant select on public.fieldnote_user_settings_safe to authenticated;

drop policy if exists "user_settings_select_own_via_view" on public.fieldnote_user_settings;
