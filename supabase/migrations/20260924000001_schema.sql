-- TravelXM Academy · Phase 1 schema
-- Tables, enums, indexes and bookkeeping triggers.
-- Access control lives in 20260924000002_access.sql, the progress engine in
-- 20260924000003_progress.sql and analytics in 20260924000004_metrics.sql.

create type public.app_role as enum ('agent', 'content_manager', 'admin');
create type public.course_status as enum ('draft', 'published', 'archived');
create type public.course_visibility as enum ('public', 'groups');
create type public.course_level as enum ('foundation', 'advanced', 'specialist');
create type public.lesson_type as enum ('video', 'pdf', 'document', 'link', 'reading', 'quiz');
create type public.progress_status as enum ('not_started', 'in_progress', 'completed');
create type public.question_type as enum ('single', 'multiple', 'true_false');

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  company text,
  job_title text,
  country text,
  phone text,
  avatar_url text,
  role public.app_role not null default 'agent',
  onboarded_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);
create index profiles_created_idx on public.profiles (created_at);
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- catalog
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  is_destination boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  cover_key text,
  category_id uuid references public.categories (id) on delete set null,
  level public.course_level not null default 'foundation',
  status public.course_status not null default 'draft',
  visibility public.course_visibility not null default 'public',
  estimated_minutes int,
  certificate_enabled boolean not null default true,
  featured boolean not null default false,
  sort_order int not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
create index courses_status_idx on public.courses (status, sort_order);
create index courses_category_idx on public.courses (category_id);
create trigger courses_touch before update on public.courses
  for each row execute function public.touch_updated_at();

create or replace function public.courses_set_published_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end $$;
create trigger courses_published_at before insert or update of status on public.courses
  for each row execute function public.courses_set_published_at();

-- ---------------------------------------------------------------- groups
create or replace function public.gen_join_code()
returns text language sql volatile as $$
  -- 8 characters without look-alikes (no 0/O, 1/I/L)
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
  from generate_series(1, 8);
$$;

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  join_code text not null unique default public.gen_join_code(),
  join_enabled boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  added_by uuid references public.profiles (id) on delete set null,
  joined_via text not null default 'admin' check (joined_via in ('code', 'admin')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);

create table public.course_groups (
  course_id uuid not null references public.courses (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  primary key (course_id, group_id)
);
create index course_groups_group_idx on public.course_groups (group_id);

-- ---------------------------------------------------------------- structure
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  description text,
  cover_key text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index modules_course_idx on public.modules (course_id, sort_order);
create trigger modules_touch before update on public.modules
  for each row execute function public.touch_updated_at();

create table public.module_requirements (
  module_id uuid not null references public.modules (id) on delete cascade,
  required_module_id uuid not null references public.modules (id) on delete cascade,
  primary key (module_id, required_module_id),
  constraint module_requirements_not_self check (module_id <> required_module_id)
);
create index module_requirements_required_idx on public.module_requirements (required_module_id);

create or replace function public.module_requirements_same_course()
returns trigger language plpgsql as $$
begin
  if (select course_id from public.modules where id = new.module_id)
     is distinct from (select course_id from public.modules where id = new.required_module_id) then
    raise exception 'A module can only require modules from the same course';
  end if;
  -- Reject cycles: the required module must not (transitively) require this module.
  if exists (
    with recursive chain(id) as (
      select required_module_id from public.module_requirements where module_id = new.required_module_id
      union
      select mr.required_module_id from public.module_requirements mr join chain on mr.module_id = chain.id
    )
    select 1 from chain where id = new.module_id
  ) then
    raise exception 'This requirement would create a circular dependency';
  end if;
  return new;
end $$;
create trigger module_requirements_check before insert or update on public.module_requirements
  for each row execute function public.module_requirements_same_course();

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  summary text,
  type public.lesson_type not null default 'video',
  sort_order int not null default 0,
  duration_seconds int check (duration_seconds is null or duration_seconds >= 0),
  video_key text,
  poster_key text,
  file_key text,
  file_name text,
  file_size bigint,
  file_mime text,
  external_url text,
  body jsonb,
  required_completion_pct int not null default 90 check (required_completion_pct between 1 and 100),
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lessons_module_idx on public.lessons (module_id, sort_order);
create index lessons_course_idx on public.lessons (course_id);
create trigger lessons_touch before update on public.lessons
  for each row execute function public.touch_updated_at();

-- lessons.course_id is denormalised from the module so RLS and progress
-- queries never need a join.
create or replace function public.lessons_set_course()
returns trigger language plpgsql as $$
begin
  select course_id into new.course_id from public.modules where id = new.module_id;
  return new;
end $$;
create trigger lessons_course before insert or update of module_id on public.lessons
  for each row execute function public.lessons_set_course();

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  title text not null,
  description text,
  file_key text,
  file_name text,
  file_size bigint,
  file_mime text,
  external_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint resources_has_target check (file_key is not null or external_url is not null)
);
create index resources_course_idx on public.resources (course_id, sort_order);

-- ---------------------------------------------------------------- quizzes
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references public.lessons (id) on delete cascade,
  passing_score int not null default 80 check (passing_score between 1 and 100),
  max_attempts int check (max_attempts is null or max_attempts > 0),
  shuffle_questions boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  prompt text not null,
  type public.question_type not null default 'single',
  -- [{ "id": "a", "text": "…" }]
  options jsonb not null default '[]'::jsonb,
  -- ["a"] — option ids that are correct
  correct jsonb not null default '[]'::jsonb,
  explanation text,
  sort_order int not null default 0
);
create index quiz_questions_quiz_idx on public.quiz_questions (quiz_id, sort_order);

-- ---------------------------------------------------------------- learning data
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  progress_pct numeric(5, 2) not null default 0,
  last_lesson_id uuid references public.lessons (id) on delete set null,
  last_activity_at timestamptz,
  unique (user_id, course_id)
);
create index enrollments_course_idx on public.enrollments (course_id);
create index enrollments_activity_idx on public.enrollments (user_id, last_activity_at desc);

create table public.lesson_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  status public.progress_status not null default 'in_progress',
  watch_pct numeric(5, 2) not null default 0,
  seconds_spent int not null default 0,
  last_position_seconds int not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index lesson_progress_course_idx on public.lesson_progress (user_id, course_id);
create index lesson_progress_lesson_idx on public.lesson_progress (lesson_id, status);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  answers jsonb not null,
  score numeric(5, 2) not null,
  passed boolean not null,
  created_at timestamptz not null default now()
);
create index quiz_attempts_user_idx on public.quiz_attempts (user_id, quiz_id, created_at desc);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  code text not null unique,
  recipient_name text not null,
  course_title text not null,
  issued_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table public.learning_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete set null,
  course_id uuid references public.courses (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  event text not null check (event in (
    'course_view', 'enroll', 'lesson_start', 'lesson_complete', 'quiz_submit',
    'course_complete', 'certificate_issued', 'resource_download', 'group_join'
  )),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index learning_events_time_idx on public.learning_events (created_at);
create index learning_events_course_idx on public.learning_events (course_id, event, created_at);
create index learning_events_lesson_idx on public.learning_events (lesson_id, event);

-- Seconds of active learning per learner, course and day. Fed by the player
-- heartbeat so "average learning time" can be measured for any date range.
create table public.learning_time_daily (
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  day date not null default current_date,
  seconds int not null default 0,
  primary key (user_id, course_id, day)
);
create index learning_time_daily_day_idx on public.learning_time_daily (day);
