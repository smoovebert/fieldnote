-- Saved analysis snapshots: point-in-time captures of a saved query's results.
-- v1 scope: coded-excerpt queries only (the "Query results" panel).
-- Future: matrix/wordfreq/co-occurrence/crosstab snapshots can land in the
-- same table by extending the result_kind enum + payload shape.

create extension if not exists "pgcrypto";

create table if not exists public.fieldnote_query_results (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.fieldnote_projects(id) on delete cascade,
  query_id text not null,
  captured_at timestamptz not null default now(),
  label text not null default '',
  result_kind text not null default 'coded_excerpt',
  definition jsonb not null default '{}'::jsonb,
  results jsonb not null default '{}'::jsonb,
  foreign key (project_id, query_id)
    references public.fieldnote_queries(project_id, id)
    on delete cascade
);

create index if not exists fieldnote_query_results_query_id_idx
  on public.fieldnote_query_results (query_id, captured_at desc);

alter table public.fieldnote_query_results enable row level security;

-- Match the access rules of the parent project: a user can read/write a
-- snapshot iff they own the project. The owner_id column lives on
-- fieldnote_projects.
create policy "snapshots_select_own"
  on public.fieldnote_query_results
  for select
  using (
    exists (
      select 1 from public.fieldnote_projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

create policy "snapshots_insert_own"
  on public.fieldnote_query_results
  for insert
  with check (
    exists (
      select 1 from public.fieldnote_projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

create policy "snapshots_update_own"
  on public.fieldnote_query_results
  for update
  using (
    exists (
      select 1 from public.fieldnote_projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

create policy "snapshots_delete_own"
  on public.fieldnote_query_results
  for delete
  using (
    exists (
      select 1 from public.fieldnote_projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );
