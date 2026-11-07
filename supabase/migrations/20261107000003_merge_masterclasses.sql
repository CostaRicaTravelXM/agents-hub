-- Masterclasses and Learning are the same thing: a masterclass is now a course in
-- the "Masterclasses" category, with one module and one video lesson.

insert into public.categories (slug, name, description, sort_order)
values ('masterclasses', 'Masterclasses', 'Short videos from the TravelXM team.', 100)
on conflict (slug) do nothing;

do $$
declare
  m public.hub_masterclasses;
  v_course uuid;
  v_module uuid;
  v_category uuid;
begin
  select id into v_category from public.categories where slug = 'masterclasses';
  for m in select * from public.hub_masterclasses order by sort_order, created_at loop
    insert into public.courses (slug, title, subtitle, description, cover_key, category_id, status, visibility,
                                estimated_minutes, certificate_enabled, sort_order, created_by,
                                published_at)
    values (m.slug, m.title, m.speaker, m.description, m.poster_key, v_category, m.status, 'public',
            ceil(coalesce(m.duration_seconds, 0) / 60.0)::int, false, 1000 + m.sort_order, m.created_by,
            case when m.status = 'published' then now() end)
    on conflict (slug) do nothing
    returning id into v_course;
    continue when v_course is null;

    insert into public.modules (course_id, title, sort_order)
    values (v_course, 'Masterclass', 0)
    returning id into v_module;

    insert into public.lessons (module_id, course_id, title, summary, type, sort_order, duration_seconds,
                                video_key, poster_key, external_url)
    values (v_module, v_course, m.title, m.speaker, 'video', 0, m.duration_seconds,
            m.video_key, m.poster_key, m.embed_url);
  end loop;
end $$;

drop table public.hub_masterclasses;

-- A video lesson may point to Google Drive or Wistia instead of an uploaded file.
-- Those players do not report how much was watched, so the agent completes it by hand.
create or replace function public.complete_lesson(p_lesson uuid)
returns public.lesson_progress language plpgsql security definer set search_path = public as $$
declare
  l public.lessons;
  lp public.lesson_progress;
  was_completed boolean;
begin
  l := public.assert_lesson_available(p_lesson);
  if l.type = 'quiz' then
    raise exception 'Pass the quiz to complete this lesson' using errcode = '42501';
  end if;
  select * into lp from public.lesson_progress where user_id = auth.uid() and lesson_id = l.id;
  if l.type = 'video' and (l.video_key is not null or l.external_url is null) and coalesce(lp.watch_pct, 0) < l.required_completion_pct then
    raise exception using
      message = format('Watch at least %s%% of the video to complete it', l.required_completion_pct),
      errcode = '42501';
  end if;
  was_completed := coalesce(lp.status = 'completed', false);
  perform public.ensure_enrollment(auth.uid(), l.course_id);

  insert into public.lesson_progress as t (user_id, lesson_id, course_id, status, completed_at)
  values (auth.uid(), l.id, l.course_id, 'completed', now())
  on conflict (user_id, lesson_id) do update set
    status = 'completed', completed_at = coalesce(t.completed_at, now()), updated_at = now()
  returning * into lp;

  update public.enrollments
     set started_at = coalesce(started_at, now()), last_lesson_id = l.id, last_activity_at = now()
   where user_id = auth.uid() and course_id = l.course_id;

  if not was_completed then
    insert into public.learning_events (user_id, course_id, lesson_id, event)
    values (auth.uid(), l.course_id, l.id, 'lesson_complete');
  end if;
  return lp;
end $$;
