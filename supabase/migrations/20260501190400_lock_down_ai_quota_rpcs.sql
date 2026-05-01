-- The AI quota RPCs are only ever invoked from the ai-call Edge Function,
-- which uses the service-role key. Earlier we granted execute to
-- `authenticated` so the role would be available, but a logged-in client
-- could call them with an arbitrary `p_user_id` to reserve or rewrite
-- quota for a different user. Revoke that grant; service_role retains
-- the implicit grant via security definer + ownership.

revoke execute on function public.reserve_ai_call(uuid, int) from authenticated;
revoke execute on function public.record_ai_call_actuals(uuid, int, int, int) from authenticated;
revoke execute on function public.reserve_ai_call(uuid, int) from public;
revoke execute on function public.record_ai_call_actuals(uuid, int, int, int) from public;

grant execute on function public.reserve_ai_call(uuid, int) to service_role;
grant execute on function public.record_ai_call_actuals(uuid, int, int, int) to service_role;
