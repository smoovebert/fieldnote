create table if not exists public.fieldnote_queries (
  id text not null,
  project_id uuid not null references public.fieldnote_projects(id) on delete cascade,
  name text not null default 'Untitled query',
  query_type text not null default 'coded_excerpt',
  definition jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, id)
);

alter table public.fieldnote_queries enable row level security;

drop trigger if exists set_fieldnote_queries_updated_at on public.fieldnote_queries;
create trigger set_fieldnote_queries_updated_at
before update on public.fieldnote_queries
for each row execute function public.set_fieldnote_updated_at();

drop policy if exists "Project members can read queries" on public.fieldnote_queries;
drop policy if exists "Project editors can insert queries" on public.fieldnote_queries;
drop policy if exists "Project editors can update queries" on public.fieldnote_queries;
drop policy if exists "Project editors can delete queries" on public.fieldnote_queries;

create policy "Project members can read queries" on public.fieldnote_queries for select to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) is not null);
create policy "Project editors can insert queries" on public.fieldnote_queries for insert to authenticated
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can update queries" on public.fieldnote_queries for update to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor')
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can delete queries" on public.fieldnote_queries for delete to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
