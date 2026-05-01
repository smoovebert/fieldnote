create or replace function public.reserve_ai_call(p_user_id uuid, p_estimated_input int)
returns table(ok boolean, reason text, today_count int)
language plpgsql security definer as $$
declare
  v_count int;
  v_daily_cap int := 50;
begin
  insert into public.fieldnote_ai_usage (user_id, date)
  values (p_user_id, current_date)
  on conflict (user_id, date) do nothing;

  select call_count into v_count
    from public.fieldnote_ai_usage
   where user_id = p_user_id and date = current_date
   for update;

  if v_count >= v_daily_cap then
    return query select false, 'daily-cap'::text, v_count;
    return;
  end if;

  update public.fieldnote_ai_usage
     set call_count = call_count + 1,
         prompt_tokens = prompt_tokens + greatest(p_estimated_input, 0)
   where user_id = p_user_id and date = current_date;

  return query select true, ''::text, v_count + 1;
end $$;

create or replace function public.record_ai_call_actuals(
  p_user_id uuid,
  p_estimated_input int,
  p_actual_input int,
  p_actual_output int
)
returns void
language plpgsql security definer as $$
begin
  -- Replace the estimated input tokens with actuals; add output tokens.
  update public.fieldnote_ai_usage
     set prompt_tokens = prompt_tokens - greatest(p_estimated_input, 0) + greatest(p_actual_input, 0),
         completion_tokens = completion_tokens + greatest(p_actual_output, 0)
   where user_id = p_user_id and date = current_date;
end $$;

grant execute on function public.reserve_ai_call(uuid, int) to authenticated;
grant execute on function public.record_ai_call_actuals(uuid, int, int, int) to authenticated;
