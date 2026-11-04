-- TravelXM Academy · access control
-- Roles: agent (default), content_manager (content + analytics), admin (everything).
-- Course visibility: 'public' courses are visible to every signed-in agent,
-- 'groups' courses only to members of at least one assigned group.
-- Modules can require other modules; a locked module's lessons cannot be
-- played, progressed or have media URLs issued.

-- ---------------------------------------------------------------- role helpers
create or replace function public.current_app_role()
returns public.app_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('admin', 'content_manager') from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------- new users
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, company, country, avatar_url, onboarded_at)
  values (
    new.id,
    new.email,
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), ''),
    nullif(new.raw_user_meta_data ->> 'company', ''),
    nullif(new.raw_user_meta_data ->> 'country', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    -- Email sign-ups collect company and country up front; Google sign-ups go through onboarding.
    case when nullif(new.raw_user_meta_data ->> 'company', '') is not null
          and nullif(new.raw_user_meta_data ->> 'country', '') is not null then now() end
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Agents may edit their own profile but never their role or email.
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.email := old.email;
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ---------------------------------------------------------------- course access
create or replace function public.can_access_course(p_course uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.courses c
    where c.id = p_course
      and (
        public.is_staff()
        or (
          c.status = 'published'
          and (
            c.visibility = 'public'
            or exists (
              select 1
              from public.course_groups cg
              join public.group_members gm on gm.group_id = cg.group_id
              where cg.course_id = c.id and gm.user_id = auth.uid()
            )
          )
        )
      )
  );
$$;

-- A module is complete when every required lesson in it is completed.
create or replace function public.module_completed(p_user uuid, p_module uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.lessons l
    where l.module_id = p_module and l.is_required
      and not exists (
        select 1 from public.lesson_progress lp
        where lp.lesson_id = l.id and lp.user_id = p_user and lp.status = 'completed'
      )
  );
$$;

-- A module is unlocked when all of its required modules are complete.
create or replace function public.module_unlocked(p_user uuid, p_module uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.module_requirements r
    where r.module_id = p_module and not public.module_completed(p_user, r.required_module_id)
  );
$$;

-- Can the current user open this lesson right now?
create or replace function public.lesson_available(p_lesson uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.lessons l
    where l.id = p_lesson
      and public.can_access_course(l.course_id)
      and (public.is_staff() or public.module_unlocked(auth.uid(), l.module_id))
  );
$$;

-- Per-module lock state for the course page and module page.
create or replace function public.course_outline(p_course uuid)
returns table (
  module_id uuid,
  unlocked boolean,
  completed boolean,
  missing_module_ids uuid[]
) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.can_access_course(p_course) then
    return;
  end if;
  return query
    select
      m.id,
      public.module_unlocked(auth.uid(), m.id),
      public.module_completed(auth.uid(), m.id),
      coalesce(
        array(
          select r.required_module_id from public.module_requirements r
          where r.module_id = m.id and not public.module_completed(auth.uid(), r.required_module_id)
        ),
        '{}'::uuid[]
      )
    from public.modules m
    where m.course_id = p_course
    order by m.sort_order;
end $$;

-- Groups the current user belongs to (join codes stay private to admins).
create or replace function public.my_groups()
returns table (id uuid, name text, description text, joined_at timestamptz)
language sql stable security definer set search_path = public as $$
  select g.id, g.name, g.description, gm.created_at
  from public.group_members gm join public.groups g on g.id = gm.group_id
  where gm.user_id = auth.uid()
  order by gm.created_at;
$$;

-- Invite landing page: show which group a code belongs to before joining.
create or replace function public.peek_group(p_code text)
returns table (name text, description text)
language sql stable security definer set search_path = public as $$
  select g.name, g.description from public.groups g
  where g.join_enabled
    and g.join_code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

create or replace function public.join_group(p_code text)
returns table (group_id uuid, group_name text, already_member boolean)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  g public.groups;
  existed boolean;
begin
  if auth.uid() is null then
    raise exception 'You need to sign in first' using errcode = '28000';
  end if;
  select * into g from public.groups
  where join_code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if g.id is null or not g.join_enabled then
    raise exception 'This invite code is not valid or has been turned off' using errcode = 'P0002';
  end if;
  select exists (select 1 from public.group_members where group_members.group_id = g.id and user_id = auth.uid())
    into existed;
  if not existed then
    insert into public.group_members (group_id, user_id, added_by, joined_via)
    values (g.id, auth.uid(), auth.uid(), 'code');
    insert into public.learning_events (user_id, event, payload)
    values (auth.uid(), 'group_join', jsonb_build_object('group_id', g.id));
  end if;
  return query select g.id, g.name, existed;
end $$;

-- ---------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.courses enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.course_groups enable row level security;
alter table public.modules enable row level security;
alter table public.module_requirements enable row level security;
alter table public.lessons enable row level security;
alter table public.resources enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.certificates enable row level security;
alter table public.learning_events enable row level security;
alter table public.learning_time_daily enable row level security;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy profiles_delete_admin on public.profiles for delete to authenticated
  using (public.is_admin());

-- categories: readable by anyone signed in, writable by staff
create policy categories_select on public.categories for select to anon, authenticated using (true);
create policy categories_write on public.categories for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- courses
create policy courses_select on public.courses for select to authenticated
  using (public.can_access_course(id));
create policy courses_write on public.courses for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- groups (admins only; members use my_groups())
create policy groups_select on public.groups for select to authenticated
  using (public.is_staff());
create policy groups_insert on public.groups for insert to authenticated
  with check (public.is_admin());
create policy groups_update on public.groups for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy groups_delete on public.groups for delete to authenticated
  using (public.is_admin());
create policy group_members_select on public.group_members for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
create policy group_members_write on public.group_members for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy course_groups_select on public.course_groups for select to authenticated
  using (public.is_staff());
create policy course_groups_write on public.course_groups for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- modules, requirements, lessons, resources, quizzes
create policy modules_select on public.modules for select to authenticated
  using (public.can_access_course(course_id));
create policy modules_write on public.modules for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy module_requirements_select on public.module_requirements for select to authenticated
  using (exists (select 1 from public.modules m where m.id = module_id and public.can_access_course(m.course_id)));
create policy module_requirements_write on public.module_requirements for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy lessons_select on public.lessons for select to authenticated
  using (public.can_access_course(course_id));
create policy lessons_write on public.lessons for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy resources_select on public.resources for select to authenticated
  using (public.can_access_course(course_id));
create policy resources_write on public.resources for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy quizzes_select on public.quizzes for select to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id and public.can_access_course(l.course_id)));
create policy quizzes_write on public.quizzes for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Questions carry the answer key: staff only. Agents read them through get_quiz().
create policy quiz_questions_staff on public.quiz_questions for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- learner data: read own rows, staff read all; writes go through functions
create policy enrollments_select on public.enrollments for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
create policy enrollments_admin_delete on public.enrollments for delete to authenticated
  using (public.is_admin());
create policy lesson_progress_select on public.lesson_progress for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
create policy lesson_progress_admin_delete on public.lesson_progress for delete to authenticated
  using (public.is_admin());
create policy quiz_attempts_select on public.quiz_attempts for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
create policy certificates_select on public.certificates for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
create policy certificates_admin_delete on public.certificates for delete to authenticated
  using (public.is_admin());
create policy learning_events_select on public.learning_events for select to authenticated
  using (public.is_staff());

create policy learning_time_select on public.learning_time_daily for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

-- ---------------------------------------------------------------- grants
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.categories to anon;
revoke all on public.learning_events from anon;
