alter table public.fieldnote_projects
add column if not exists active_source_id text,
add column if not exists sources jsonb not null default '[]'::jsonb,
add column if not exists memos jsonb not null default '[]'::jsonb;
