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
  line_numbering_mode text not null default 'fixed-width'
    check (line_numbering_mode in ('paragraph', 'fixed-width')),
  line_numbering_width integer not null default 80
    check (line_numbering_width between 40 and 160),
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

create or replace function public.fieldnote_project_member_role(project_id uuid, user_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select members.role
  from public.fieldnote_project_members members
  where members.project_id = fieldnote_project_member_role.project_id
    and members.user_id = fieldnote_project_member_role.user_id
  limit 1
$$;

create or replace function public.fieldnote_project_owner_id(project_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select projects.owner_id
  from public.fieldnote_projects projects
  where projects.id = fieldnote_project_owner_id.project_id
  limit 1
$$;

grant execute on function public.fieldnote_project_member_role(uuid, uuid) to authenticated;
grant execute on function public.fieldnote_project_owner_id(uuid) to authenticated;

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
  or public.fieldnote_project_member_role(id, auth.uid()) is not null
);

create policy "Owners and editors can update projects"
on public.fieldnote_projects
for update
to authenticated
using (
  owner_id = auth.uid()
  or public.fieldnote_project_member_role(id, auth.uid()) = 'editor'
)
with check (
  owner_id = auth.uid()
  or public.fieldnote_project_member_role(id, auth.uid()) = 'editor'
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
using (public.fieldnote_project_owner_id(project_id) = auth.uid())
with check (public.fieldnote_project_owner_id(project_id) = auth.uid());

create policy "Members can read their own memberships"
on public.fieldnote_project_members
for select
to authenticated
using (user_id = auth.uid());

create table if not exists public.fieldnote_sources (
  id text not null,
  project_id uuid not null references public.fieldnote_projects(id) on delete cascade,
  title text not null default 'Untitled source',
  kind text not null default 'Transcript',
  folder_name text not null default 'Internals',
  content text not null default '',
  archived boolean not null default false,
  imported_at text,
  case_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, id)
);

create table if not exists public.fieldnote_folders (
  id text not null,
  project_id uuid not null references public.fieldnote_projects(id) on delete cascade,
  name text not null,
  kind text not null default 'source',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, id),
  unique (project_id, kind, name)
);

create table if not exists public.fieldnote_codes (
  id text not null,
  project_id uuid not null references public.fieldnote_projects(id) on delete cascade,
  parent_code_id text,
  name text not null,
  color text not null default '#2f80ed',
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, id)
);

create table if not exists public.fieldnote_source_segments (
  id text not null,
  project_id uuid not null references public.fieldnote_projects(id) on delete cascade,
  source_id text not null,
  segment_type text not null default 'text_range',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, id),
  foreign key (project_id, source_id) references public.fieldnote_sources(project_id, id) on delete cascade
);

create table if not exists public.fieldnote_coded_references (
  project_id uuid not null references public.fieldnote_projects(id) on delete cascade,
  segment_id text not null,
  code_id text not null,
  source_id text not null,
  note text not null default '',
  coded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, segment_id, code_id),
  foreign key (project_id, segment_id) references public.fieldnote_source_segments(project_id, id) on delete cascade,
  foreign key (project_id, code_id) references public.fieldnote_codes(project_id, id) on delete cascade,
  foreign key (project_id, source_id) references public.fieldnote_sources(project_id, id) on delete cascade
);

create table if not exists public.fieldnote_memos (
  id text not null,
  project_id uuid not null references public.fieldnote_projects(id) on delete cascade,
  title text not null default 'Untitled memo',
  body text not null default '',
  linked_type text not null default 'project',
  linked_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, id)
);

create table if not exists public.fieldnote_cases (
  id text not null,
  project_id uuid not null references public.fieldnote_projects(id) on delete cascade,
  name text not null default 'Untitled case',
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, id),
  unique (project_id, name)
);

create table if not exists public.fieldnote_case_sources (
  project_id uuid not null references public.fieldnote_projects(id) on delete cascade,
  case_id text not null,
  source_id text not null,
  created_at timestamptz not null default now(),
  primary key (project_id, case_id, source_id),
  foreign key (project_id, case_id) references public.fieldnote_cases(project_id, id) on delete cascade,
  foreign key (project_id, source_id) references public.fieldnote_sources(project_id, id) on delete cascade
);

create table if not exists public.fieldnote_attributes (
  id text not null,
  project_id uuid not null references public.fieldnote_projects(id) on delete cascade,
  name text not null,
  value_type text not null default 'text',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, id),
  unique (project_id, name)
);

create table if not exists public.fieldnote_attribute_values (
  project_id uuid not null references public.fieldnote_projects(id) on delete cascade,
  case_id text not null,
  attribute_id text not null,
  value text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, case_id, attribute_id),
  foreign key (project_id, case_id) references public.fieldnote_cases(project_id, id) on delete cascade,
  foreign key (project_id, attribute_id) references public.fieldnote_attributes(project_id, id) on delete cascade
);

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

alter table public.fieldnote_sources enable row level security;
alter table public.fieldnote_folders enable row level security;
alter table public.fieldnote_codes enable row level security;
alter table public.fieldnote_source_segments enable row level security;
alter table public.fieldnote_coded_references enable row level security;
alter table public.fieldnote_memos enable row level security;
alter table public.fieldnote_cases enable row level security;
alter table public.fieldnote_case_sources enable row level security;
alter table public.fieldnote_attributes enable row level security;
alter table public.fieldnote_attribute_values enable row level security;
alter table public.fieldnote_queries enable row level security;

create trigger set_fieldnote_cases_updated_at
before update on public.fieldnote_cases
for each row execute function public.set_fieldnote_updated_at();

create trigger set_fieldnote_attributes_updated_at
before update on public.fieldnote_attributes
for each row execute function public.set_fieldnote_updated_at();

create trigger set_fieldnote_attribute_values_updated_at
before update on public.fieldnote_attribute_values
for each row execute function public.set_fieldnote_updated_at();

create trigger set_fieldnote_queries_updated_at
before update on public.fieldnote_queries
for each row execute function public.set_fieldnote_updated_at();

create policy "Project members can read sources" on public.fieldnote_sources for select to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) is not null);
create policy "Project editors can insert sources" on public.fieldnote_sources for insert to authenticated
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can update sources" on public.fieldnote_sources for update to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor')
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can delete sources" on public.fieldnote_sources for delete to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');

create policy "Project members can read folders" on public.fieldnote_folders for select to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) is not null);
create policy "Project editors can insert folders" on public.fieldnote_folders for insert to authenticated
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can update folders" on public.fieldnote_folders for update to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor')
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can delete folders" on public.fieldnote_folders for delete to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');

create policy "Project members can read codes" on public.fieldnote_codes for select to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) is not null);
create policy "Project editors can insert codes" on public.fieldnote_codes for insert to authenticated
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can update codes" on public.fieldnote_codes for update to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor')
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can delete codes" on public.fieldnote_codes for delete to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');

create policy "Project members can read source segments" on public.fieldnote_source_segments for select to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) is not null);
create policy "Project editors can insert source segments" on public.fieldnote_source_segments for insert to authenticated
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can update source segments" on public.fieldnote_source_segments for update to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor')
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can delete source segments" on public.fieldnote_source_segments for delete to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');

create policy "Project members can read coded references" on public.fieldnote_coded_references for select to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) is not null);
create policy "Project editors can insert coded references" on public.fieldnote_coded_references for insert to authenticated
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can update coded references" on public.fieldnote_coded_references for update to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor')
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can delete coded references" on public.fieldnote_coded_references for delete to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');

create policy "Project members can read memos" on public.fieldnote_memos for select to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) is not null);
create policy "Project editors can insert memos" on public.fieldnote_memos for insert to authenticated
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can update memos" on public.fieldnote_memos for update to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor')
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can delete memos" on public.fieldnote_memos for delete to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');

create policy "Project members can read cases" on public.fieldnote_cases for select to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) is not null);
create policy "Project editors can insert cases" on public.fieldnote_cases for insert to authenticated
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can update cases" on public.fieldnote_cases for update to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor')
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can delete cases" on public.fieldnote_cases for delete to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');

create policy "Project members can read case sources" on public.fieldnote_case_sources for select to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) is not null);
create policy "Project editors can insert case sources" on public.fieldnote_case_sources for insert to authenticated
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can update case sources" on public.fieldnote_case_sources for update to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor')
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can delete case sources" on public.fieldnote_case_sources for delete to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');

create policy "Project members can read attributes" on public.fieldnote_attributes for select to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) is not null);
create policy "Project editors can insert attributes" on public.fieldnote_attributes for insert to authenticated
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can update attributes" on public.fieldnote_attributes for update to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor')
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can delete attributes" on public.fieldnote_attributes for delete to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');

create policy "Project members can read attribute values" on public.fieldnote_attribute_values for select to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) is not null);
create policy "Project editors can insert attribute values" on public.fieldnote_attribute_values for insert to authenticated
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can update attribute values" on public.fieldnote_attribute_values for update to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor')
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can delete attribute values" on public.fieldnote_attribute_values for delete to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');

create policy "Project members can read queries" on public.fieldnote_queries for select to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) is not null);
create policy "Project editors can insert queries" on public.fieldnote_queries for insert to authenticated
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can update queries" on public.fieldnote_queries for update to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor')
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can delete queries" on public.fieldnote_queries for delete to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
