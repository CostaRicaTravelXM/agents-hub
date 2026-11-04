-- pgTAP suite for access control and the progress engine.
--   npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

-- ---------------------------------------------------------------- fixtures
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test.dev', '{"full_name":"Ada Admin"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'member@test.dev', '{"full_name":"Mia Member"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000c', 'outsider@test.dev', '{"full_name":"Oli Outsider"}', 'authenticated', 'authenticated');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000a';

insert into public.courses (id, slug, title, status, visibility) values
  ('10000000-0000-0000-0000-000000000001', 'public-course', 'Public course', 'published', 'public'),
  ('10000000-0000-0000-0000-000000000002', 'group-course', 'Group course', 'published', 'groups'),
  ('10000000-0000-0000-0000-000000000003', 'draft-course', 'Draft course', 'draft', 'public');
insert into public.groups (id, name, join_code) values
  ('20000000-0000-0000-0000-000000000001', 'Partners', 'PARTNER1');
insert into public.course_groups values ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001');

insert into public.modules (id, course_id, title, sort_order) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Intro', 1),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Advanced', 2);
insert into public.module_requirements values
  ('30000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001');
insert into public.lessons (id, module_id, title, type, duration_seconds, required_completion_pct, sort_order) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Welcome video', 'video', 600, 80, 1),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'Fact sheet', 'pdf', null, 90, 2),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', 'Final quiz', 'quiz', null, 90, 1);
insert into public.quizzes (id, lesson_id, passing_score, max_attempts) values
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 50, 3);
insert into public.quiz_questions (quiz_id, prompt, type, options, correct, sort_order) values
  ('50000000-0000-0000-0000-000000000001', 'Capital of Costa Rica?', 'single', '[{"id":"a","text":"San José"},{"id":"b","text":"Liberia"}]', '["a"]', 1),
  ('50000000-0000-0000-0000-000000000001', 'Pick the volcanoes', 'multiple', '[{"id":"a","text":"Arenal"},{"id":"b","text":"Poás"},{"id":"c","text":"Tortuguero"}]', '["a","b"]', 2);

select is((select lessons.course_id from public.lessons where id = '40000000-0000-0000-0000-000000000001'),
  '10000000-0000-0000-0000-000000000001'::uuid, 'lessons.course_id is denormalised from the module');
select throws_ok(
  $$insert into public.module_requirements values ('30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002')$$,
  'This requirement would create a circular dependency', 'circular module requirements are rejected');

-- ---------------------------------------------------------------- outsider (agent, no groups)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);

select results_eq($$select slug from public.courses where slug in ('public-course', 'group-course', 'draft-course') order by slug$$, $$values ('public-course')$$,
  'an agent sees only published public courses');
select is_empty($$select 1 from public.quiz_questions$$, 'agents cannot read the quiz answer key');
select is_empty($$select 1 from public.groups$$, 'agents cannot read groups or join codes');
select is((select count(*)::int from public.profiles where id <> '00000000-0000-0000-0000-00000000000c'), 0, 'agents only see their own profile');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000c';
select is((select role::text from public.profiles where id = '00000000-0000-0000-0000-00000000000c'), 'agent',
  'agents cannot promote themselves');
select throws_ok($$select public.enroll('10000000-0000-0000-0000-000000000002')$$, 'P0002', 'Course not found',
  'agents cannot enroll in a group course they are not part of');
select throws_ok($$insert into public.enrollments (user_id, course_id) values ('00000000-0000-0000-0000-00000000000c', '10000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'agents cannot write enrollments directly');

-- ---------------------------------------------------------------- member joins group by code
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select throws_ok($$select * from public.join_group('NOPE0000')$$, 'P0002', null, 'bad invite codes are rejected');
select is((select group_name from public.join_group('partner-1')), 'Partners', 'join codes are normalised and accepted');
select is((select already_member from public.join_group('PARTNER1')), true, 'joining twice is idempotent');
select results_eq($$select slug from public.courses where slug in ('public-course', 'group-course', 'draft-course') order by slug$$, $$values ('group-course'), ('public-course')$$,
  'group members see the group course');

-- ---------------------------------------------------------------- module locks
select is((select unlocked from public.course_outline('10000000-0000-0000-0000-000000000001') where module_id = '30000000-0000-0000-0000-000000000002'),
  false, 'module 2 starts locked');
select throws_ok($$select public.start_lesson('40000000-0000-0000-0000-000000000003')$$, '42501', null,
  'lessons in a locked module cannot be opened');
select throws_ok($$select public.get_quiz('40000000-0000-0000-0000-000000000003')$$, '42501', null,
  'quiz questions of a locked module are not served');

-- ---------------------------------------------------------------- video completion validation
select lives_ok($$select public.start_lesson('40000000-0000-0000-0000-000000000001')$$, 'agent can start an unlocked lesson');
select is((select count(*)::int from public.enrollments where user_id = '00000000-0000-0000-0000-00000000000b'), 1,
  'starting a lesson enrolls the agent');
select throws_ok($$select public.complete_lesson('40000000-0000-0000-0000-000000000001')$$, '42501', null,
  'a video cannot be marked complete before the required watch percentage');
select is((select status::text from public.record_progress('40000000-0000-0000-0000-000000000001', 300, 50, 30)), 'in_progress',
  '50% watched is still in progress');
select is((select watch_pct from public.record_progress('40000000-0000-0000-0000-000000000001', 10, 20, 500)), 50.00::numeric,
  'watch percentage never goes down');
select is((select seconds_spent from public.lesson_progress where lesson_id = '40000000-0000-0000-0000-000000000001'), 150,
  'learning time deltas are capped at 120 s per heartbeat');
select is((select just_completed from public.record_progress('40000000-0000-0000-0000-000000000001', 500, 81, 10)), true,
  'crossing the required percentage completes the video');
select is((select progress_pct from public.enrollments where user_id = '00000000-0000-0000-0000-00000000000b' and course_id = '10000000-0000-0000-0000-000000000001'),
  33.33::numeric, 'course progress rolls up from required lessons');

select lives_ok($$select public.complete_lesson('40000000-0000-0000-0000-000000000002')$$, 'PDF lessons are completed by the learner');
select is((select unlocked from public.course_outline('10000000-0000-0000-0000-000000000001') where module_id = '30000000-0000-0000-0000-000000000002'),
  true, 'finishing module 1 unlocks module 2');

-- ---------------------------------------------------------------- quiz
select is(jsonb_array_length(public.get_quiz('40000000-0000-0000-0000-000000000003') -> 'questions'), 2, 'quiz questions are served');
select ok(not (public.get_quiz('40000000-0000-0000-0000-000000000003') -> 'questions' -> 0 ? 'correct'), 'served questions carry no answer key');
select is((public.submit_quiz('40000000-0000-0000-0000-000000000003',
  jsonb_build_object((public.get_quiz('40000000-0000-0000-0000-000000000003') -> 'questions' -> 0 ->> 'id'), '["b"]'::jsonb,
                     (public.get_quiz('40000000-0000-0000-0000-000000000003') -> 'questions' -> 1 ->> 'id'), '["a"]'::jsonb)) ->> 'passed'), 'false',
  'wrong answers fail the quiz');
select is((public.submit_quiz('40000000-0000-0000-0000-000000000003',
  jsonb_build_object((public.get_quiz('40000000-0000-0000-0000-000000000003') -> 'questions' -> 0 ->> 'id'), '["a"]'::jsonb,
                     (public.get_quiz('40000000-0000-0000-0000-000000000003') -> 'questions' -> 1 ->> 'id'), '["b","a"]'::jsonb)) ->> 'score')::numeric, 100::numeric,
  'multiple-answer questions ignore option order');

-- ---------------------------------------------------------------- completion + certificate
select isnt((select completed_at from public.enrollments where user_id = '00000000-0000-0000-0000-00000000000b' and course_id = '10000000-0000-0000-0000-000000000001'),
  null, 'completing every required lesson completes the course');
select matches((select code from public.certificates where user_id = '00000000-0000-0000-0000-00000000000b'),
  '^TXM-\d{4}-[A-Z2-9]{6}$', 'a certificate with a verifiable code is issued');

-- ---------------------------------------------------------------- anonymous verification
select set_config('test.cert_code', (select code from public.certificates limit 1), true);
reset role;
set local role anon;
select is((select recipient_name from public.verify_certificate(current_setting('test.cert_code'))), 'Mia Member',
  'anyone can verify a certificate code');

-- ---------------------------------------------------------------- staff analytics
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select is((public.course_funnel('10000000-0000-0000-0000-000000000001') ->> 'completed')::int, 1, 'staff can read the course funnel');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
select throws_ok($$select public.admin_overview(now() - interval '30 days', now())$$, '42501', null, 'agents cannot read analytics');

select is_empty($$select 1 from public.certificates$$, 'anonymous visitors cannot list certificates');

select * from finish();
rollback;
