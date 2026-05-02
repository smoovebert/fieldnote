-- Expose the user's own row of fieldnote_ai_usage so the AI preview
-- panel can show "X of N free calls left today" before the user clicks
-- Send. The base table has RLS but is service-role-only for writes
-- (via reserve_ai_call); reads are filtered to auth.uid() through this
-- definer view, mirroring fieldnote_user_settings_safe.

create view public.fieldnote_ai_usage_safe
  with (security_invoker = false)
  as select user_id, date, call_count, prompt_tokens, completion_tokens
  from public.fieldnote_ai_usage
  where user_id = auth.uid();

grant select on public.fieldnote_ai_usage_safe to authenticated;
