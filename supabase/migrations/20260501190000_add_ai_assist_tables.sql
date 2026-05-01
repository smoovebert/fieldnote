create extension if not exists pgcrypto;

create table public.fieldnote_user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ai_provider text not null default 'gemini-free',
  encrypted_keys jsonb not null default '{}'::jsonb,
  hosted_ai_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.fieldnote_user_settings enable row level security;

create table public.fieldnote_ai_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.fieldnote_projects(id) on delete cascade,
  kind text not null,
  provider text not null,
  content_hash text not null,
  prompt_tokens int,
  completion_tokens int,
  estimated_cost_usd numeric(10, 6),
  response jsonb not null,
  cache_hit boolean not null default false,
  created_at timestamptz not null default now()
);
create index fieldnote_ai_calls_hash_kind_idx on public.fieldnote_ai_calls (user_id, content_hash, kind);
create index fieldnote_ai_calls_user_recent_idx on public.fieldnote_ai_calls (user_id, created_at desc);
create index fieldnote_ai_calls_hosted_idx on public.fieldnote_ai_calls (created_at) where provider = 'gemini-free';
alter table public.fieldnote_ai_calls enable row level security;

create table public.fieldnote_ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  call_count int not null default 0,
  prompt_tokens int not null default 0,
  completion_tokens int not null default 0,
  primary key (user_id, date)
);
alter table public.fieldnote_ai_usage enable row level security;

create table public.fieldnote_ai_cost_log (
  date date primary key,
  total_usd numeric(10, 4) not null default 0,
  call_count int not null default 0,
  computed_at timestamptz not null default now()
);
alter table public.fieldnote_ai_cost_log enable row level security;

create policy "ai_calls_select_own"
  on public.fieldnote_ai_calls for select
  using (user_id = auth.uid());
create policy "ai_calls_insert_own"
  on public.fieldnote_ai_calls for insert
  with check (user_id = auth.uid());
create policy "ai_calls_delete_own"
  on public.fieldnote_ai_calls for delete
  using (user_id = auth.uid());

create policy "ai_usage_select_own"
  on public.fieldnote_ai_usage for select
  using (user_id = auth.uid());
