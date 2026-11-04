-- TravelXM Academy · progress engine
-- All learner writes go through these security-definer functions so the rules
-- (access, module locks, completion thresholds, quiz grading) are enforced in
-- the database, not in the browser.

-- ---------------------------------------------------------------- helpers
create or replace function public.assert_lesson_available(p_lesson uuid)
returns public.lessons language plpgsql stable security definer set search_path = public as $$
declare
  l public.lessons;
begin
  if auth.uid() is null then
    raise exception 'You need to sign in first' using errcode = '28000';
  end if;
  select * into l from public.lessons where id = p_lesson;
  if l.id is null or not public.can_access_course(l.course_id) then
    raise exception 'Lesson not found' using errcode = 'P0002';
  end if;
  if not public.is_staff() and not public.module_unlocked(auth.uid(), l.module_id) then
    raise exception 'This module is locked until its required modules are complete' using errcode = '42501';
  end if;
  return l;
end $$;

create or replace function public.ensure_enrollment(p_user uuid, p_course uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.enrollments (user_id, course_id)
  values (p_user, p_course)
  on conflict (user_id, course_id) do nothing;
  if found then
    insert into public.learning_events (user_id, course_id, event) values (p_user, p_course, 'enroll');
  end if;
end $$;

-- ---------------------------------------------------------------- enroll
create or replace function public.enroll(p_course uuid)
returns public.enrollments language plpgsql security definer set search_path = public as $$
declare
  e public.enrollments;
begin
  if auth.uid() is null then
    raise exception 'You need to sign in first' using errcode = '28000';
  end if;
  if not public.can_access_course(p_course) then
    raise exception 'Course not found' using errcode = 'P0002';
  end if;
  perform public.ensure_enrollment(auth.uid(), p_course);
  select * into e from public.enrollments where user_id = auth.uid() and course_id = p_course;
  return e;
end $$;

-- ---------------------------------------------------------------- lesson start
create or replace function public.start_lesson(p_lesson uuid)
returns public.lesson_progress language plpgsql security definer set search_path = public as $$
declare
  l public.lessons;
  lp public.lesson_progress;
begin
  l := public.assert_lesson_available(p_lesson);
  perform public.ensure_enrollment(auth.uid(), l.course_id);

  insert into public.lesson_progress (user_id, lesson_id, course_id, status)
  values (auth.uid(), l.id, l.course_id, 'in_progress')
  on conflict (user_id, lesson_id) do update set updated_at = now()
  returning * into lp;

  update public.enrollments
     set started_at = coalesce(started_at, now()),
         last_lesson_id = l.id,
         last_activity_at = now()
   where user_id = auth.uid() and course_id = l.course_id;

  insert into public.learning_events (user_id, course_id, lesson_id, event)
  values (auth.uid(), l.course_id, l.id, 'lesson_start');

  update public.profiles set last_seen_at = now() where id = auth.uid();
  return lp;
end $$;

-- ---------------------------------------------------------------- heartbeat
-- Called every ~10 s while a lesson is open and on pause / seek / leave.
-- p_watch_pct is the share of the video actually played (unique seconds, not
-- the scrub position); it only ever ratchets up. p_seconds_delta is capped so
-- a tampered client cannot inflate learning time.
create or replace function public.record_progress(
  p_lesson uuid,
  p_position_seconds int default 0,
  p_watch_pct numeric default 0,
  p_seconds_delta int default 0
)
returns table (status public.progress_status, watch_pct numeric, just_completed boolean)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  l public.lessons;
  lp public.lesson_progress;
  was_completed boolean;
  new_pct numeric;
begin
  l := public.assert_lesson_available(p_lesson);
  perform public.ensure_enrollment(auth.uid(), l.course_id);

  select * into lp from public.lesson_progress where user_id = auth.uid() and lesson_id = l.id;
  was_completed := coalesce(lp.status = 'completed', false);
  new_pct := greatest(coalesce(lp.watch_pct, 0), least(100, greatest(0, coalesce(p_watch_pct, 0))));

  insert into public.lesson_progress as t (
    user_id, lesson_id, course_id, status, watch_pct, seconds_spent, last_position_seconds, completed_at
  ) values (
    auth.uid(), l.id, l.course_id,
    (case when l.type = 'video' and new_pct >= l.required_completion_pct then 'completed' else 'in_progress' end)::public.progress_status,
    new_pct,
    least(greatest(coalesce(p_seconds_delta, 0), 0), 120),
    greatest(coalesce(p_position_seconds, 0), 0),
    case when l.type = 'video' and new_pct >= l.required_completion_pct then now() end
  )
  on conflict (user_id, lesson_id) do update set
    watch_pct = new_pct,
    seconds_spent = t.seconds_spent + least(greatest(coalesce(p_seconds_delta, 0), 0), 120),
    last_position_seconds = greatest(coalesce(p_position_seconds, 0), 0),
    status = case
      when t.status = 'completed' then 'completed'::public.progress_status
      when l.type = 'video' and new_pct >= l.required_completion_pct then 'completed'::public.progress_status
      else 'in_progress'::public.progress_status
    end,
    completed_at = case
      when t.completed_at is not null then t.completed_at
      when l.type = 'video' and new_pct >= l.required_completion_pct then now()
    end,
    updated_at = now()
  returning * into lp;

  update public.enrollments
     set started_at = coalesce(started_at, now()), last_lesson_id = l.id, last_activity_at = now()
   where user_id = auth.uid() and course_id = l.course_id;

  if coalesce(p_seconds_delta, 0) > 0 then
    insert into public.learning_time_daily as d (user_id, course_id, day, seconds)
    values (auth.uid(), l.course_id, current_date, least(p_seconds_delta, 120))
    on conflict (user_id, course_id, day) do update set seconds = d.seconds + least(p_seconds_delta, 120);
  end if;

  if lp.status = 'completed' and not was_completed then
    insert into public.learning_events (user_id, course_id, lesson_id, event, payload)
    values (auth.uid(), l.course_id, l.id, 'lesson_complete', jsonb_build_object('watch_pct', new_pct));
  end if;

  return query select lp.status, lp.watch_pct, (lp.status = 'completed' and not was_completed);
end $$;

-- ---------------------------------------------------------------- manual completion
-- PDFs, documents, links and reading lessons are completed by the learner.
-- Videos must reach their required watch percentage; quizzes must be passed.
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
  if l.type = 'video' and coalesce(lp.watch_pct, 0) < l.required_completion_pct then
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

-- ---------------------------------------------------------------- quizzes
create or replace function public.get_quiz(p_lesson uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  l public.lessons;
  q public.quizzes;
  used int;
  best numeric;
  passed boolean;
begin
  l := public.assert_lesson_available(p_lesson);
  select * into q from public.quizzes where lesson_id = l.id;
  if q.id is null then
    return null;
  end if;
  select count(*), max(score), coalesce(bool_or(qa.passed), false)
    into used, best, passed
    from public.quiz_attempts qa where qa.quiz_id = q.id and qa.user_id = auth.uid();
  return jsonb_build_object(
    'quiz_id', q.id,
    'passing_score', q.passing_score,
    'max_attempts', q.max_attempts,
    'attempts_used', used,
    'best_score', best,
    'passed', passed,
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', qq.id, 'prompt', qq.prompt, 'type', qq.type, 'options', qq.options
      ) order by case when q.shuffle_questions then random() else qq.sort_order end)
      from public.quiz_questions qq where qq.quiz_id = q.id
    ), '[]'::jsonb)
  );
end $$;

-- p_answers: { "<question id>": ["a", "c"], ... }
create or replace function public.submit_quiz(p_lesson uuid, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  l public.lessons;
  q public.quizzes;
  used int;
  total int;
  right_count int := 0;
  score numeric;
  did_pass boolean;
  reveal boolean;
  results jsonb := '[]'::jsonb;
  rec record;
  given jsonb;
  is_right boolean;
  already_passed boolean;
begin
  l := public.assert_lesson_available(p_lesson);
  select * into q from public.quizzes where lesson_id = l.id;
  if q.id is null then
    raise exception 'Quiz not found' using errcode = 'P0002';
  end if;

  select count(*), coalesce(bool_or(passed), false) into used, already_passed
    from public.quiz_attempts where quiz_id = q.id and user_id = auth.uid();
  if q.max_attempts is not null and used >= q.max_attempts and not public.is_staff() then
    raise exception 'No attempts left for this quiz' using errcode = '42501';
  end if;

  select count(*) into total from public.quiz_questions where quiz_id = q.id;
  if total = 0 then
    raise exception 'This quiz has no questions yet' using errcode = 'P0002';
  end if;

  for rec in select * from public.quiz_questions where quiz_id = q.id order by sort_order loop
    given := coalesce(p_answers -> rec.id::text, '[]'::jsonb);
    if jsonb_typeof(given) <> 'array' then
      given := jsonb_build_array(given);
    end if;
    is_right := (
      select coalesce(array_agg(x order by x), '{}') from jsonb_array_elements_text(given) x
    ) = (
      select coalesce(array_agg(x order by x), '{}') from jsonb_array_elements_text(rec.correct) x
    );
    if is_right then
      right_count := right_count + 1;
    end if;
    results := results || jsonb_build_object(
      'question_id', rec.id, 'correct', is_right, 'given', given,
      'correct_options', rec.correct, 'explanation', rec.explanation
    );
  end loop;

  score := round(right_count::numeric * 100 / total, 2);
  did_pass := score >= q.passing_score;
  reveal := did_pass or (q.max_attempts is not null and used + 1 >= q.max_attempts);

  insert into public.quiz_attempts (user_id, quiz_id, answers, score, passed)
  values (auth.uid(), q.id, p_answers, score, did_pass);

  perform public.ensure_enrollment(auth.uid(), l.course_id);
  insert into public.learning_events (user_id, course_id, lesson_id, event, payload)
  values (auth.uid(), l.course_id, l.id, 'quiz_submit', jsonb_build_object('score', score, 'passed', did_pass));

  if did_pass then
    insert into public.lesson_progress as t (user_id, lesson_id, course_id, status, watch_pct, completed_at)
    values (auth.uid(), l.id, l.course_id, 'completed', 100, now())
    on conflict (user_id, lesson_id) do update set
      status = 'completed', completed_at = coalesce(t.completed_at, now()), updated_at = now();
    if not already_passed then
      insert into public.learning_events (user_id, course_id, lesson_id, event)
      values (auth.uid(), l.course_id, l.id, 'lesson_complete');
    end if;
  else
    insert into public.lesson_progress (user_id, lesson_id, course_id, status)
    values (auth.uid(), l.id, l.course_id, 'in_progress')
    on conflict (user_id, lesson_id) do update set updated_at = now();
  end if;

  update public.enrollments
     set started_at = coalesce(started_at, now()), last_lesson_id = l.id, last_activity_at = now()
   where user_id = auth.uid() and course_id = l.course_id;

  -- Hide the answer key until the learner passes or runs out of attempts.
  if not reveal then
    results := (
      select coalesce(jsonb_agg(r - 'correct_options'), '[]'::jsonb) from jsonb_array_elements(results) r
    );
  end if;

  return jsonb_build_object(
    'score', score,
    'passed', did_pass,
    'passing_score', q.passing_score,
    'attempts_used', used + 1,
    'max_attempts', q.max_attempts,
    'revealed', reveal,
    'results', results
  );
end $$;

-- ---------------------------------------------------------------- enrollment rollup + certificates
create or replace function public.gen_certificate_code()
returns text language sql volatile as $$
  select 'TXM-' || to_char(now(), 'YYYY') || '-' ||
    (select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
     from generate_series(1, 6));
$$;

create or replace function public.recompute_enrollment(p_user uuid, p_course uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  total int;
  done int;
  pct numeric;
  e public.enrollments;
  c public.courses;
  p public.profiles;
  v_code text;
begin
  select count(*) into total from public.lessons where course_id = p_course and is_required;
  select count(*) into done
    from public.lessons l
    join public.lesson_progress lp on lp.lesson_id = l.id and lp.user_id = p_user and lp.status = 'completed'
   where l.course_id = p_course and l.is_required;
  pct := case when total = 0 then 0 else round(done::numeric * 100 / total, 2) end;

  update public.enrollments set progress_pct = pct
   where user_id = p_user and course_id = p_course
  returning * into e;

  if e.id is null or pct < 100 or e.completed_at is not null then
    return;
  end if;

  update public.enrollments set completed_at = now() where id = e.id;
  insert into public.learning_events (user_id, course_id, event) values (p_user, p_course, 'course_complete');

  select * into c from public.courses where id = p_course;
  if c.certificate_enabled then
    select * into p from public.profiles where id = p_user;
    loop
      v_code := public.gen_certificate_code();
      exit when not exists (select 1 from public.certificates ce where ce.code = v_code);
    end loop;
    insert into public.certificates (user_id, course_id, code, recipient_name, course_title)
    values (p_user, p_course, v_code, coalesce(nullif(p.full_name, ''), p.email), c.title)
    on conflict (user_id, course_id) do nothing;
    if found then
      insert into public.learning_events (user_id, course_id, event, payload)
      values (p_user, p_course, 'certificate_issued', jsonb_build_object('code', v_code));
    end if;
  end if;
end $$;

create or replace function public.lesson_progress_rollup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_enrollment(old.user_id, old.course_id);
    return old;
  end if;
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    perform public.recompute_enrollment(new.user_id, new.course_id);
  end if;
  return new;
end $$;

create trigger lesson_progress_rollup after insert or update or delete on public.lesson_progress
  for each row execute function public.lesson_progress_rollup();

-- When staff add or remove required lessons, every enrollment's percentage
-- in that course is refreshed (completion dates and certificates are kept).
create or replace function public.lessons_refresh_enrollments()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cid uuid := coalesce(new.course_id, old.course_id);
  r record;
begin
  if tg_op = 'UPDATE' and new.is_required = old.is_required and new.course_id = old.course_id then
    return new;
  end if;
  for r in select user_id from public.enrollments where course_id = cid loop
    perform public.recompute_enrollment(r.user_id, cid);
  end loop;
  return coalesce(new, old);
end $$;

create trigger lessons_refresh_enrollments after insert or delete or update of is_required, module_id on public.lessons
  for each row execute function public.lessons_refresh_enrollments();

-- ---------------------------------------------------------------- events + certificates
create or replace function public.log_event(p_event text, p_course uuid default null, p_lesson uuid default null, p_payload jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_event not in ('course_view', 'resource_download') then
    return;
  end if;
  if p_course is not null and not public.can_access_course(p_course) then
    return;
  end if;
  insert into public.learning_events (user_id, course_id, lesson_id, event, payload)
  values (auth.uid(), p_course, p_lesson, p_event, coalesce(p_payload, '{}'::jsonb));
  update public.profiles set last_seen_at = now() where id = auth.uid();
end $$;

-- Public verification page: anyone holding a code can confirm it is genuine.
create or replace function public.verify_certificate(p_code text)
returns table (code text, recipient_name text, course_title text, issued_at timestamptz, course_slug text)
language sql stable security definer set search_path = public as $$
  select c.code, c.recipient_name, c.course_title, c.issued_at, co.slug
  from public.certificates c join public.courses co on co.id = c.course_id
  where c.code = upper(trim(p_code));
$$;

-- ---------------------------------------------------------------- function grants
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on function public.verify_certificate(text) to anon;
