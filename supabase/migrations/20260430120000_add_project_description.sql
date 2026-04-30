-- Adds a description column to fieldnote_projects to support the per-project
-- Overview view (one-line summary, distinct from the long-form project memo).

ALTER TABLE fieldnote_projects
ADD COLUMN description text NOT NULL DEFAULT '';
