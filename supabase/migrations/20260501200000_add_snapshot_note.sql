-- Snapshots-with-memo: extend fieldnote_query_results with a free-form
-- note attached to each snapshot. The intent is to capture the
-- researcher's interpretation at the point a query result was pinned —
-- "at this stage, this is how I understood the theme" — so analyses
-- accumulate context over time instead of just dated dumps.

alter table public.fieldnote_query_results
  add column if not exists note text not null default '';
