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

alter table public.fieldnote_cases enable row level security;
alter table public.fieldnote_case_sources enable row level security;
alter table public.fieldnote_attributes enable row level security;
alter table public.fieldnote_attribute_values enable row level security;

drop trigger if exists set_fieldnote_cases_updated_at on public.fieldnote_cases;
create trigger set_fieldnote_cases_updated_at
before update on public.fieldnote_cases
for each row execute function public.set_fieldnote_updated_at();

drop trigger if exists set_fieldnote_attributes_updated_at on public.fieldnote_attributes;
create trigger set_fieldnote_attributes_updated_at
before update on public.fieldnote_attributes
for each row execute function public.set_fieldnote_updated_at();

drop trigger if exists set_fieldnote_attribute_values_updated_at on public.fieldnote_attribute_values;
create trigger set_fieldnote_attribute_values_updated_at
before update on public.fieldnote_attribute_values
for each row execute function public.set_fieldnote_updated_at();

insert into public.fieldnote_cases (project_id, id, name)
select distinct
  sources.project_id,
  lower(regexp_replace(sources.case_name, '[^a-zA-Z0-9]+', '-', 'g')),
  sources.case_name
from public.fieldnote_sources sources
where nullif(sources.case_name, '') is not null
on conflict (project_id, name) do nothing;

insert into public.fieldnote_case_sources (project_id, case_id, source_id)
select
  sources.project_id,
  cases.id,
  sources.id
from public.fieldnote_sources sources
join public.fieldnote_cases cases
  on cases.project_id = sources.project_id
  and cases.name = sources.case_name
where nullif(sources.case_name, '') is not null
on conflict (project_id, case_id, source_id) do nothing;

drop policy if exists "Project members can read cases" on public.fieldnote_cases;
drop policy if exists "Project editors can insert cases" on public.fieldnote_cases;
drop policy if exists "Project editors can update cases" on public.fieldnote_cases;
drop policy if exists "Project editors can delete cases" on public.fieldnote_cases;

create policy "Project members can read cases" on public.fieldnote_cases for select to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) is not null);
create policy "Project editors can insert cases" on public.fieldnote_cases for insert to authenticated
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can update cases" on public.fieldnote_cases for update to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor')
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can delete cases" on public.fieldnote_cases for delete to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');

drop policy if exists "Project members can read case sources" on public.fieldnote_case_sources;
drop policy if exists "Project editors can insert case sources" on public.fieldnote_case_sources;
drop policy if exists "Project editors can update case sources" on public.fieldnote_case_sources;
drop policy if exists "Project editors can delete case sources" on public.fieldnote_case_sources;

create policy "Project members can read case sources" on public.fieldnote_case_sources for select to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) is not null);
create policy "Project editors can insert case sources" on public.fieldnote_case_sources for insert to authenticated
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can update case sources" on public.fieldnote_case_sources for update to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor')
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can delete case sources" on public.fieldnote_case_sources for delete to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');

drop policy if exists "Project members can read attributes" on public.fieldnote_attributes;
drop policy if exists "Project editors can insert attributes" on public.fieldnote_attributes;
drop policy if exists "Project editors can update attributes" on public.fieldnote_attributes;
drop policy if exists "Project editors can delete attributes" on public.fieldnote_attributes;

create policy "Project members can read attributes" on public.fieldnote_attributes for select to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) is not null);
create policy "Project editors can insert attributes" on public.fieldnote_attributes for insert to authenticated
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can update attributes" on public.fieldnote_attributes for update to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor')
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can delete attributes" on public.fieldnote_attributes for delete to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');

drop policy if exists "Project members can read attribute values" on public.fieldnote_attribute_values;
drop policy if exists "Project editors can insert attribute values" on public.fieldnote_attribute_values;
drop policy if exists "Project editors can update attribute values" on public.fieldnote_attribute_values;
drop policy if exists "Project editors can delete attribute values" on public.fieldnote_attribute_values;

create policy "Project members can read attribute values" on public.fieldnote_attribute_values for select to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) is not null);
create policy "Project editors can insert attribute values" on public.fieldnote_attribute_values for insert to authenticated
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can update attribute values" on public.fieldnote_attribute_values for update to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor')
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can delete attribute values" on public.fieldnote_attribute_values for delete to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
