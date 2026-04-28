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

alter table public.fieldnote_sources enable row level security;
alter table public.fieldnote_folders enable row level security;
alter table public.fieldnote_codes enable row level security;
alter table public.fieldnote_source_segments enable row level security;
alter table public.fieldnote_coded_references enable row level security;
alter table public.fieldnote_memos enable row level security;

drop trigger if exists set_fieldnote_sources_updated_at on public.fieldnote_sources;
create trigger set_fieldnote_sources_updated_at
before update on public.fieldnote_sources
for each row execute function public.set_fieldnote_updated_at();

drop trigger if exists set_fieldnote_folders_updated_at on public.fieldnote_folders;
create trigger set_fieldnote_folders_updated_at
before update on public.fieldnote_folders
for each row execute function public.set_fieldnote_updated_at();

drop trigger if exists set_fieldnote_codes_updated_at on public.fieldnote_codes;
create trigger set_fieldnote_codes_updated_at
before update on public.fieldnote_codes
for each row execute function public.set_fieldnote_updated_at();

drop trigger if exists set_fieldnote_source_segments_updated_at on public.fieldnote_source_segments;
create trigger set_fieldnote_source_segments_updated_at
before update on public.fieldnote_source_segments
for each row execute function public.set_fieldnote_updated_at();

drop trigger if exists set_fieldnote_coded_references_updated_at on public.fieldnote_coded_references;
create trigger set_fieldnote_coded_references_updated_at
before update on public.fieldnote_coded_references
for each row execute function public.set_fieldnote_updated_at();

drop trigger if exists set_fieldnote_memos_updated_at on public.fieldnote_memos;
create trigger set_fieldnote_memos_updated_at
before update on public.fieldnote_memos
for each row execute function public.set_fieldnote_updated_at();

insert into public.fieldnote_sources (project_id, id, title, kind, folder_name, content, archived, imported_at, case_name)
select
  projects.id,
  source_item.value->>'id',
  coalesce(source_item.value->>'title', 'Untitled source'),
  coalesce(source_item.value->>'kind', 'Transcript'),
  coalesce(source_item.value->>'folder', 'Internals'),
  coalesce(source_item.value->>'content', ''),
  coalesce((source_item.value->>'archived')::boolean, false),
  source_item.value->>'importedAt',
  source_item.value->>'caseName'
from public.fieldnote_projects projects
cross join lateral jsonb_array_elements(projects.sources) as source_item(value)
where source_item.value ? 'id'
on conflict (project_id, id) do update set
  title = excluded.title,
  kind = excluded.kind,
  folder_name = excluded.folder_name,
  content = excluded.content,
  archived = excluded.archived,
  imported_at = excluded.imported_at,
  case_name = excluded.case_name;

insert into public.fieldnote_sources (project_id, id, title, kind, folder_name, content)
select
  projects.id,
  coalesce(nullif(projects.active_source_id, ''), 'interview-03'),
  coalesce(nullif(projects.source_title, ''), 'Interview 03'),
  'Transcript',
  'Internals',
  projects.transcript
from public.fieldnote_projects projects
where not exists (
  select 1 from public.fieldnote_sources sources where sources.project_id = projects.id
)
on conflict (project_id, id) do nothing;

insert into public.fieldnote_folders (project_id, id, name)
select distinct
  sources.project_id,
  lower(regexp_replace(sources.folder_name, '[^a-zA-Z0-9]+', '-', 'g')),
  sources.folder_name
from public.fieldnote_sources sources
where nullif(sources.folder_name, '') is not null
on conflict (project_id, kind, name) do nothing;

insert into public.fieldnote_codes (project_id, id, name, color, description)
select
  projects.id,
  code_item.value->>'id',
  coalesce(code_item.value->>'name', 'Untitled code'),
  coalesce(code_item.value->>'color', '#2f80ed'),
  coalesce(code_item.value->>'description', '')
from public.fieldnote_projects projects
cross join lateral jsonb_array_elements(projects.codes) as code_item(value)
where code_item.value ? 'id'
on conflict (project_id, id) do update set
  name = excluded.name,
  color = excluded.color,
  description = excluded.description;

insert into public.fieldnote_memos (project_id, id, title, body, linked_type, linked_id)
select
  projects.id,
  memo_item.value->>'id',
  coalesce(memo_item.value->>'title', 'Untitled memo'),
  coalesce(memo_item.value->>'body', ''),
  coalesce(memo_item.value->>'linkedType', 'project'),
  memo_item.value->>'linkedId'
from public.fieldnote_projects projects
cross join lateral jsonb_array_elements(projects.memos) as memo_item(value)
where memo_item.value ? 'id'
on conflict (project_id, id) do update set
  title = excluded.title,
  body = excluded.body,
  linked_type = excluded.linked_type,
  linked_id = excluded.linked_id;

insert into public.fieldnote_memos (project_id, id, title, body, linked_type)
select projects.id, 'project-memo', 'Project memo', projects.memo, 'project'
from public.fieldnote_projects projects
where not exists (
  select 1 from public.fieldnote_memos memos where memos.project_id = projects.id and memos.linked_type = 'project'
)
on conflict (project_id, id) do nothing;

insert into public.fieldnote_source_segments (project_id, id, source_id, segment_type, content)
select
  projects.id,
  excerpt_item.value->>'id',
  coalesce(excerpt_item.value->>'sourceId', sources.id),
  'text_range',
  coalesce(excerpt_item.value->>'text', '')
from public.fieldnote_projects projects
cross join lateral jsonb_array_elements(projects.excerpts) as excerpt_item(value)
left join public.fieldnote_sources sources
  on sources.project_id = projects.id
  and sources.title = excerpt_item.value->>'sourceTitle'
where excerpt_item.value ? 'id'
  and coalesce(excerpt_item.value->>'sourceId', sources.id) is not null
on conflict (project_id, id) do update set
  source_id = excluded.source_id,
  content = excluded.content;

insert into public.fieldnote_coded_references (project_id, segment_id, code_id, source_id, note)
select
  projects.id,
  excerpt_item.value->>'id',
  code_id.value#>>'{}',
  coalesce(excerpt_item.value->>'sourceId', sources.id),
  coalesce(excerpt_item.value->>'note', '')
from public.fieldnote_projects projects
cross join lateral jsonb_array_elements(projects.excerpts) as excerpt_item(value)
cross join lateral jsonb_array_elements(coalesce(excerpt_item.value->'codeIds', '[]'::jsonb)) as code_id(value)
left join public.fieldnote_sources sources
  on sources.project_id = projects.id
  and sources.title = excerpt_item.value->>'sourceTitle'
where excerpt_item.value ? 'id'
  and coalesce(excerpt_item.value->>'sourceId', sources.id) is not null
on conflict (project_id, segment_id, code_id) do update set
  source_id = excluded.source_id,
  note = excluded.note;

drop policy if exists "Project members can read sources" on public.fieldnote_sources;
drop policy if exists "Project editors can insert sources" on public.fieldnote_sources;
drop policy if exists "Project editors can update sources" on public.fieldnote_sources;
drop policy if exists "Project editors can delete sources" on public.fieldnote_sources;

create policy "Project members can read sources" on public.fieldnote_sources for select to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) is not null);
create policy "Project editors can insert sources" on public.fieldnote_sources for insert to authenticated
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can update sources" on public.fieldnote_sources for update to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor')
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can delete sources" on public.fieldnote_sources for delete to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');

drop policy if exists "Project members can read folders" on public.fieldnote_folders;
drop policy if exists "Project editors can insert folders" on public.fieldnote_folders;
drop policy if exists "Project editors can update folders" on public.fieldnote_folders;
drop policy if exists "Project editors can delete folders" on public.fieldnote_folders;

create policy "Project members can read folders" on public.fieldnote_folders for select to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) is not null);
create policy "Project editors can insert folders" on public.fieldnote_folders for insert to authenticated
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can update folders" on public.fieldnote_folders for update to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor')
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can delete folders" on public.fieldnote_folders for delete to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');

drop policy if exists "Project members can read codes" on public.fieldnote_codes;
drop policy if exists "Project editors can insert codes" on public.fieldnote_codes;
drop policy if exists "Project editors can update codes" on public.fieldnote_codes;
drop policy if exists "Project editors can delete codes" on public.fieldnote_codes;

create policy "Project members can read codes" on public.fieldnote_codes for select to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) is not null);
create policy "Project editors can insert codes" on public.fieldnote_codes for insert to authenticated
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can update codes" on public.fieldnote_codes for update to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor')
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can delete codes" on public.fieldnote_codes for delete to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');

drop policy if exists "Project members can read source segments" on public.fieldnote_source_segments;
drop policy if exists "Project editors can insert source segments" on public.fieldnote_source_segments;
drop policy if exists "Project editors can update source segments" on public.fieldnote_source_segments;
drop policy if exists "Project editors can delete source segments" on public.fieldnote_source_segments;

create policy "Project members can read source segments" on public.fieldnote_source_segments for select to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) is not null);
create policy "Project editors can insert source segments" on public.fieldnote_source_segments for insert to authenticated
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can update source segments" on public.fieldnote_source_segments for update to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor')
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can delete source segments" on public.fieldnote_source_segments for delete to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');

drop policy if exists "Project members can read coded references" on public.fieldnote_coded_references;
drop policy if exists "Project editors can insert coded references" on public.fieldnote_coded_references;
drop policy if exists "Project editors can update coded references" on public.fieldnote_coded_references;
drop policy if exists "Project editors can delete coded references" on public.fieldnote_coded_references;

create policy "Project members can read coded references" on public.fieldnote_coded_references for select to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) is not null);
create policy "Project editors can insert coded references" on public.fieldnote_coded_references for insert to authenticated
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can update coded references" on public.fieldnote_coded_references for update to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor')
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can delete coded references" on public.fieldnote_coded_references for delete to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');

drop policy if exists "Project members can read memos" on public.fieldnote_memos;
drop policy if exists "Project editors can insert memos" on public.fieldnote_memos;
drop policy if exists "Project editors can update memos" on public.fieldnote_memos;
drop policy if exists "Project editors can delete memos" on public.fieldnote_memos;

create policy "Project members can read memos" on public.fieldnote_memos for select to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) is not null);
create policy "Project editors can insert memos" on public.fieldnote_memos for insert to authenticated
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can update memos" on public.fieldnote_memos for update to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor')
with check (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
create policy "Project editors can delete memos" on public.fieldnote_memos for delete to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid() or public.fieldnote_project_member_role(project_id, auth.uid()) = 'editor');
