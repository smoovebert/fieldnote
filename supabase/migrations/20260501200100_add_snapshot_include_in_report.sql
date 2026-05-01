-- Snapshot inclusion is now an explicit per-snapshot flag rather than a
-- "has-a-note" heuristic. Researchers can pin many snapshots over the
-- course of an analysis and only promote the ones they want to appear
-- in the Report. The note remains free-form and optional.
--
-- Default false on existing rows: previously the "has note" filter was
-- the gating signal, so we backfill include_in_report = true for any
-- row that already carries a non-empty note. New snapshots created
-- through "Send to report" set it to true at insert time.

alter table public.fieldnote_query_results
  add column if not exists include_in_report boolean not null default false;

update public.fieldnote_query_results
  set include_in_report = true
  where include_in_report = false
    and coalesce(trim(note), '') <> '';
