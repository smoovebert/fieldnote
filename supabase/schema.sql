create table if not exists public.fieldnote_projects (
  id text primary key,
  source_title text not null default '',
  transcript text not null default '',
  memo text not null default '',
  codes jsonb not null default '[]'::jsonb,
  excerpts jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.fieldnote_projects enable row level security;

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
