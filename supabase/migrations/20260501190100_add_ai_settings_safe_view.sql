create view public.fieldnote_user_settings_safe as
  select user_id, ai_provider, hosted_ai_consent_at, created_at, updated_at
  from public.fieldnote_user_settings;

grant select, update on public.fieldnote_user_settings_safe to authenticated;

-- Clients use this view; encrypted_keys is intentionally not exposed.
-- Writes to encrypted_keys go through the /save-key Edge Function with
-- service-role access.

create policy "user_settings_select_own"
  on public.fieldnote_user_settings for select
  using (user_id = auth.uid());

create policy "user_settings_update_own_provider_consent"
  on public.fieldnote_user_settings for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "user_settings_insert_own"
  on public.fieldnote_user_settings for insert
  with check (user_id = auth.uid());
