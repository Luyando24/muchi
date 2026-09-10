-- Aggregate report-card calculation and stored-PDF progress in Postgres so the
-- System Admin status page does not download hundreds of thousands of grade rows.
create or replace function public.get_system_report_card_progress(
  p_pdf_bucket text default 'report-card-pdfs',
  p_min_pdf_bytes bigint default 5000
)
returns table (
  school_id uuid,
  school_name text,
  total_classes bigint,
  calculated_classes bigint,
  total_pdfs bigint,
  built_pdfs bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with submitted_combos as (
    select distinct
      g.school_id,
      e.class_id,
      g.term,
      g.exam_type,
      g.academic_year
    from public.student_grades g
    join public.enrollments e on e.student_id = g.student_id
      and e.academic_year = g.academic_year
    join public.classes c on c.id = e.class_id
      and c.school_id = g.school_id
    where g.status in ('Submitted', 'Published')
      and e.class_id is not null
  ),
  combo_progress as (
    select
      combos.school_id,
      combos.class_id,
      cache.id as cache_id,
      cache.student_count,
      pdf.id as pdf_id
    from submitted_combos as combos
    left join public.report_card_cache as cache
      on cache.school_id = combos.school_id
      and cache.class_id = combos.class_id
      and cache.term = combos.term
      and cache.exam_type = combos.exam_type
      and cache.academic_year = combos.academic_year
    left join storage.objects as pdf
      on pdf.bucket_id = p_pdf_bucket
      and pdf.name = concat(
        regexp_replace(combos.school_id::text, '[^a-zA-Z0-9_-]', '_', 'g'),
        '/',
        regexp_replace(combos.class_id::text, '[^a-zA-Z0-9_-]', '_', 'g'),
        '_',
        regexp_replace(coalesce(combos.term, ''), '[^a-zA-Z0-9_-]', '_', 'g'),
        '_',
        regexp_replace(coalesce(combos.exam_type, ''), '[^a-zA-Z0-9_-]', '_', 'g'),
        '_',
        regexp_replace(coalesce(combos.academic_year, ''), '[^a-zA-Z0-9_-]', '_', 'g'),
        '.pdf'
      )
      and case
        when coalesce(pdf.metadata ->> 'size', '') ~ '^[0-9]+$'
          then (pdf.metadata ->> 'size')::bigint
        else 0
      end > p_min_pdf_bytes
  )
  select
    schools.id as school_id,
    schools.name::text as school_name,
    count(progress.class_id) as total_classes,
    count(progress.cache_id) as calculated_classes,
    count(progress.class_id) filter (
      where progress.cache_id is null or progress.student_count > 0
    ) as total_pdfs,
    count(progress.pdf_id) filter (
      where progress.student_count > 0
    ) as built_pdfs
  from public.schools as schools
  left join combo_progress as progress on progress.school_id = schools.id
  group by schools.id, schools.name
  order by schools.name;
$$;

revoke all on function public.get_system_report_card_progress(text, bigint) from public;
revoke all on function public.get_system_report_card_progress(text, bigint) from anon;
revoke all on function public.get_system_report_card_progress(text, bigint) from authenticated;
grant execute on function public.get_system_report_card_progress(text, bigint) to service_role;
