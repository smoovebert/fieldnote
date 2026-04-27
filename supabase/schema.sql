create extension if not exists pgcrypto;

create table if not exists public.fieldnote_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled project',
  active_source_id text,
  sources jsonb not null default '[]'::jsonb,
  source_title text not null default '',
  transcript text not null default '',
  memo text not null default '',
  memos jsonb not null default '[]'::jsonb,
  codes jsonb not null default '[]'::jsonb,
  excerpts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fieldnote_project_members (
  project_id uuid not null references public.fieldnote_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('viewer', 'editor')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

alter table public.fieldnote_projects enable row level security;
alter table public.fieldnote_project_members enable row level security;

create or replace function public.set_fieldnote_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_fieldnote_projects_updated_at on public.fieldnote_projects;

create trigger set_fieldnote_projects_updated_at
before update on public.fieldnote_projects
for each row
execute function public.set_fieldnote_updated_at();

drop policy if exists "Owners can create projects" on public.fieldnote_projects;
drop policy if exists "Owners and members can read projects" on public.fieldnote_projects;
drop policy if exists "Owners and editors can update projects" on public.fieldnote_projects;
drop policy if exists "Owners can delete projects" on public.fieldnote_projects;
drop policy if exists "Owners can manage project members" on public.fieldnote_project_members;
drop policy if exists "Members can read their own memberships" on public.fieldnote_project_members;

create policy "Owners can create projects"
on public.fieldnote_projects
for insert
to authenticated
with check (owner_id = auth.uid());

create policy "Owners and members can read projects"
on public.fieldnote_projects
for select
to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.fieldnote_project_members members
    where members.project_id = fieldnote_projects.id
      and members.user_id = auth.uid()
  )
);

create policy "Owners and editors can update projects"
on public.fieldnote_projects
for update
to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.fieldnote_project_members members
    where members.project_id = fieldnote_projects.id
      and members.user_id = auth.uid()
      and members.role = 'editor'
  )
)
with check (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.fieldnote_project_members members
    where members.project_id = fieldnote_projects.id
      and members.user_id = auth.uid()
      and members.role = 'editor'
  )
);

create policy "Owners can delete projects"
on public.fieldnote_projects
for delete
to authenticated
using (owner_id = auth.uid());

create policy "Owners can manage project members"
on public.fieldnote_project_members
for all
to authenticated
using (
  exists (
    select 1
    from public.fieldnote_projects projects
    where projects.id = fieldnote_project_members.project_id
      and projects.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.fieldnote_projects projects
    where projects.id = fieldnote_project_members.project_id
      and projects.owner_id = auth.uid()
  )
);

create policy "Members can read their own memberships"
on public.fieldnote_project_members
for select
to authenticated
using (user_id = auth.uid());
