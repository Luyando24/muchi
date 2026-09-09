-- report_card_cache: stores pre-computed batch report card JSON so that
-- Bulk Print returns in ~50ms instead of 10-30 seconds.
-- Populated by the background reportCardCacheService after each grade submission.

create table if not exists report_card_cache (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  class_id      uuid not null,
  term          text not null,
  exam_type     text not null,
  academic_year text not null,
  student_count integer not null default 0,
  data          jsonb not null,
  cached_at     timestamptz not null default now(),
  unique (school_id, class_id, term, exam_type, academic_year)
);

-- Service role only — this table is written by server-side code exclusively
alter table report_card_cache enable row level security;

-- Deny all access via the anon/authenticated keys; only supabaseAdmin (service role) can read/write
create policy "service role only" on report_card_cache
  as restrictive
  for all
  using (false)
  with check (false);

-- Fast lookup by the composite key used in every cache hit check
create index if not exists report_card_cache_lookup_idx
  on report_card_cache (school_id, class_id, term, exam_type, academic_year);
