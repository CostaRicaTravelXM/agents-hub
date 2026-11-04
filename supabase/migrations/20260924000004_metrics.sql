-- TravelXM Academy · analytics for the Phase 1 success metrics
--   registered agents · course enrollments · completion rate · learning time
--   most viewed content / destinations · drop-off points · certified agents

create or replace function public.assert_staff()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
end $$;

-- ---------------------------------------------------------------- overview
create or replace function public.admin_overview(p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  result jsonb;
begin
  perform public.assert_staff();

  with
  agents as (select * from public.profiles where role = 'agent'),
  enr as (select e.* from public.enrollments e join agents a on a.id = e.user_id),
  cohort as (select * from enr where enrolled_at >= p_from and enrolled_at < p_to),
  time_in_range as (
    select t.user_id, sum(t.seconds) as seconds
    from public.learning_time_daily t join agents a on a.id = t.user_id
    where t.day >= p_from::date and t.day < p_to::date + 1
    group by t.user_id
  ),
  active as (
    select distinct ev.user_id from public.learning_events ev join agents a on a.id = ev.user_id
    where ev.created_at >= p_from and ev.created_at < p_to
  )
  select jsonb_build_object(
    'registered_agents', (select count(*) from agents),
    'new_agents', (select count(*) from agents where created_at >= p_from and created_at < p_to),
    'active_learners', (select count(*) from active),
    'enrollments_total', (select count(*) from enr),
    'enrollments', (select count(*) from cohort),
    'completions', (select count(*) from enr where completed_at >= p_from and completed_at < p_to),
    'completion_rate_total', (
      select case when count(*) = 0 then 0 else round(count(*) filter (where completed_at is not null) * 100.0 / count(*), 1) end from enr
    ),
    'completion_rate', (
      select case when count(*) = 0 then 0 else round(count(*) filter (where completed_at is not null) * 100.0 / count(*), 1) end from cohort
    ),
    'avg_progress', (select coalesce(round(avg(progress_pct), 1), 0) from enr),
    'learning_seconds', (select coalesce(sum(seconds), 0) from time_in_range),
    'avg_learning_seconds', (select coalesce(round(avg(seconds)), 0) from time_in_range),
    'certified_agents', (select count(distinct c.user_id) from public.certificates c join agents a on a.id = c.user_id),
    'certificates_issued', (
      select count(*) from public.certificates c join agents a on a.id = c.user_id
      where c.issued_at >= p_from and c.issued_at < p_to
    ),
    'signups_by_week', (
      select coalesce(jsonb_agg(jsonb_build_object('week', w.week, 'count', w.n) order by w.week), '[]'::jsonb)
      from (
        select gs::date as week,
               (select count(*) from agents a where a.created_at >= gs and a.created_at < gs + interval '7 days') as n
        from generate_series(date_trunc('week', now()) - interval '11 weeks', date_trunc('week', now()), interval '7 days') gs
      ) w
    ),
    'learning_minutes_by_week', (
      select coalesce(jsonb_agg(jsonb_build_object('week', w.week, 'minutes', w.m) order by w.week), '[]'::jsonb)
      from (
        select gs::date as week,
               (select coalesce(round(sum(t.seconds) / 60.0), 0) from public.learning_time_daily t join agents a on a.id = t.user_id
                 where t.day >= gs::date and t.day < (gs + interval '7 days')::date) as m
        from generate_series(date_trunc('week', now()) - interval '11 weeks', date_trunc('week', now()), interval '7 days') gs
      ) w
    ),
    'top_destinations', (
      select coalesce(jsonb_agg(x order by (x ->> 'views')::int desc), '[]'::jsonb) from (
        select jsonb_build_object('id', cat.id, 'name', cat.name, 'views', count(ev.id)) as x
        from public.categories cat
        join public.courses co on co.category_id = cat.id
        join public.learning_events ev on ev.course_id = co.id and ev.event in ('course_view', 'lesson_start')
          and ev.created_at >= p_from and ev.created_at < p_to
        where cat.is_destination
        group by cat.id, cat.name
        order by count(ev.id) desc
        limit 8
      ) t
    ),
    'top_lessons', (
      select coalesce(jsonb_agg(x order by (x ->> 'views')::int desc), '[]'::jsonb) from (
        select jsonb_build_object(
          'id', l.id, 'title', l.title, 'type', l.type, 'course_title', co.title, 'course_id', co.id,
          'views', count(ev.id), 'viewers', count(distinct ev.user_id)
        ) as x
        from public.learning_events ev
        join public.lessons l on l.id = ev.lesson_id
        join public.courses co on co.id = l.course_id
        where ev.event = 'lesson_start' and ev.created_at >= p_from and ev.created_at < p_to
        group by l.id, l.title, l.type, co.title, co.id
        order by count(ev.id) desc
        limit 8
      ) t
    ),
    'courses', (
      select coalesce(jsonb_agg(x order by (x ->> 'enrolled')::int desc), '[]'::jsonb) from (
        select jsonb_build_object(
          'id', co.id, 'title', co.title, 'slug', co.slug, 'status', co.status, 'visibility', co.visibility,
          'enrolled', count(e.id),
          'completed', count(e.id) filter (where e.completed_at is not null),
          'completion_rate', case when count(e.id) = 0 then 0
            else round(count(e.id) filter (where e.completed_at is not null) * 100.0 / count(e.id), 1) end,
          'avg_progress', coalesce(round(avg(e.progress_pct), 1), 0),
          'views', (select count(*) from public.learning_events v where v.course_id = co.id and v.event = 'course_view'
                    and v.created_at >= p_from and v.created_at < p_to)
        ) as x
        from public.courses co
        left join enr e on e.course_id = co.id
        where co.status <> 'archived'
        group by co.id
      ) t
    )
  ) into result;

  return result;
end $$;

-- ---------------------------------------------------------------- course funnel
-- For each lesson in syllabus order: how many agents started it, completed it,
-- and how many unfinished enrollments are stalled on it (their first
-- incomplete required lesson). The stalled count is the drop-off point.
create or replace function public.course_funnel(p_course uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  result jsonb;
begin
  perform public.assert_staff();

  with
  ordered as (
    select l.id, l.title, l.type, l.is_required, m.id as module_id, m.title as module_title,
           row_number() over (order by m.sort_order, m.created_at, l.sort_order, l.created_at) as pos
    from public.lessons l join public.modules m on m.id = l.module_id
    where l.course_id = p_course
  ),
  open_enrollments as (
    select e.user_id from public.enrollments e
    join public.profiles p on p.id = e.user_id and p.role = 'agent'
    where e.course_id = p_course and e.completed_at is null
  ),
  stalled as (
    select oe.user_id, (
      select o.id from ordered o
      where o.is_required and not exists (
        select 1 from public.lesson_progress lp
        where lp.lesson_id = o.id and lp.user_id = oe.user_id and lp.status = 'completed'
      )
      order by o.pos limit 1
    ) as lesson_id
    from open_enrollments oe
  )
  select jsonb_build_object(
    'enrolled', (select count(*) from public.enrollments e join public.profiles p on p.id = e.user_id and p.role = 'agent' where e.course_id = p_course),
    'completed', (select count(*) from public.enrollments e join public.profiles p on p.id = e.user_id and p.role = 'agent' where e.course_id = p_course and e.completed_at is not null),
    'lessons', coalesce(jsonb_agg(jsonb_build_object(
      'id', o.id, 'title', o.title, 'type', o.type, 'module_title', o.module_title, 'position', o.pos,
      'is_required', o.is_required,
      'started', (select count(*) from public.lesson_progress lp join public.profiles p on p.id = lp.user_id and p.role = 'agent' where lp.lesson_id = o.id),
      'completed', (select count(*) from public.lesson_progress lp join public.profiles p on p.id = lp.user_id and p.role = 'agent' where lp.lesson_id = o.id and lp.status = 'completed'),
      'stalled', (select count(*) from stalled s where s.lesson_id = o.id),
      'avg_watch_pct', (select coalesce(round(avg(lp.watch_pct), 1), 0) from public.lesson_progress lp where lp.lesson_id = o.id)
    ) order by o.pos), '[]'::jsonb)
  ) into result
  from ordered o;

  return result;
end $$;

-- ---------------------------------------------------------------- agent summary
create or replace view public.agent_summary with (security_invoker = true) as
select
  p.id, p.email, p.full_name, p.company, p.country, p.role, p.created_at, p.last_seen_at, p.onboarded_at,
  (select count(*) from public.enrollments e where e.user_id = p.id) as enrollments,
  (select count(*) from public.enrollments e where e.user_id = p.id and e.completed_at is not null) as completed_courses,
  (select count(*) from public.certificates c where c.user_id = p.id) as certificates,
  (select coalesce(sum(t.seconds), 0) from public.learning_time_daily t where t.user_id = p.id) as learning_seconds,
  (select coalesce(round(avg(e.progress_pct), 1), 0) from public.enrollments e where e.user_id = p.id) as avg_progress,
  (select max(e.last_activity_at) from public.enrollments e where e.user_id = p.id) as last_activity_at
from public.profiles p;

grant select on public.agent_summary to authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on function public.verify_certificate(text) to anon;
grant execute on function public.peek_group(text) to anon;
