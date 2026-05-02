-- Extend the snapshot table to cover the non-Find-excerpts panels:
-- Matrix / Word frequency / Co-occurrence / Crosstab. These analyses
-- aren't tied to a saved query, so query_id becomes nullable. A
-- composite FK with one nullable column already satisfies MATCH SIMPLE
-- when query_id is null, so no FK rewrite is needed.
--
-- A new config jsonb column carries panel-specific settings captured
-- with the snapshot (e.g. matrix columnMode + attributeId, frequency
-- topN, crosstab attr1/attr2/percentMode). The result_kind text
-- column gains the new variants without a schema change since it has
-- no CHECK constraint.

alter table public.fieldnote_query_results
  alter column query_id drop not null;

alter table public.fieldnote_query_results
  add column if not exists config jsonb not null default '{}'::jsonb;
