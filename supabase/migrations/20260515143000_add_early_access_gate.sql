create extension if not exists pgcrypto;

create table if not exists public.fieldnote_access_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  status text not null default 'invited' check (status in ('invited', 'accepted', 'revoked')),
  notes text not null default '',
  invited_by uuid references auth.users(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  constraint fieldnote_access_invites_email_normalized check (email = lower(btrim(email))),
  constraint fieldnote_access_invites_email_shape check (position('@' in email) > 1)
);

create unique index if not exists fieldnote_access_invites_email_idx
  on public.fieldnote_access_invites (email);

alter table public.fieldnote_access_invites enable row level security;

revoke all on public.fieldnote_access_invites from anon, authenticated;

comment on table public.fieldnote_access_invites is
  'Early-access allowlist. New auth.users rows are rejected unless the normalized email has an invited or accepted row here.';

create or replace function public.fieldnote_enforce_access_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(new.email));
begin
  if v_email is null or v_email = '' then
    raise exception 'fieldnote-access-email-required' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.fieldnote_access_invites invite
    where invite.email = v_email
      and invite.status in ('invited', 'accepted')
  ) then
    raise exception 'fieldnote-access-required' using errcode = '28000';
  end if;

  return new;
end;
$$;

create or replace function public.fieldnote_mark_access_invite_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(new.email));
begin
  update public.fieldnote_access_invites
  set status = 'accepted',
      accepted_at = coalesce(accepted_at, now()),
      user_id = new.id
  where email = v_email
    and status in ('invited', 'accepted');

  return new;
end;
$$;

drop trigger if exists fieldnote_enforce_access_invite_before_user_insert on auth.users;
create trigger fieldnote_enforce_access_invite_before_user_insert
before insert on auth.users
for each row
execute function public.fieldnote_enforce_access_invite();

drop trigger if exists fieldnote_mark_access_invite_after_user_insert on auth.users;
create trigger fieldnote_mark_access_invite_after_user_insert
after insert on auth.users
for each row
execute function public.fieldnote_mark_access_invite_accepted();
