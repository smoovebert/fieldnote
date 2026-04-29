-- Per-project display preferences for the source-text line numbering shown
-- in Code mode. `paragraph` keeps the existing behavior (one number per
-- newline-separated paragraph). `fixed-width` wraps the source at
-- `line_numbering_width` characters (word-aware) so line numbers are stable
-- across users and screen sizes — required for academic-style citations.

alter table public.fieldnote_projects
  add column if not exists line_numbering_mode text not null default 'fixed-width'
    check (line_numbering_mode in ('paragraph', 'fixed-width'));

alter table public.fieldnote_projects
  add column if not exists line_numbering_width integer not null default 80
    check (line_numbering_width between 40 and 160);
