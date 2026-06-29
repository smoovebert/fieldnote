create or replace function public.fieldnote_keepalive()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'checked_at', now()
  );
$$;

revoke all on function public.fieldnote_keepalive() from public;
grant execute on function public.fieldnote_keepalive() to anon;

comment on function public.fieldnote_keepalive() is
  'Tiny no-data RPC used by scheduled keepalive jobs so the Free Plan project does not pause from inactivity during tester quiet periods.';
