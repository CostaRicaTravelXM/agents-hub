-- FAM trips: dates can be "to be confirmed", trips can be reserved for groups
-- (one group per agency, managed in /admin/groups), and a trip can carry an
-- itinerary PDF like an offer does.

-- ---------------------------------------------------------------- dates
-- Empty timing_label means the dates aren't set; the app shows "Dates to be confirmed".
alter table public.hub_fam_trips alter column timing_label drop not null;

-- ---------------------------------------------------------------- itinerary PDF
alter table public.hub_fam_trips
  add column file_key text,
  add column file_name text,
  add column file_size bigint;

-- ---------------------------------------------------------------- group-only trips
-- Every agent can read a group trip. Only members of its groups can apply.
alter table public.hub_fam_trips
  add column audience text not null default 'open' check (audience in ('open', 'groups'));

create table public.hub_fam_trip_groups (
  fam_trip_id uuid not null references public.hub_fam_trips (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  primary key (fam_trip_id, group_id)
);
create index hub_fam_trip_groups_group_idx on public.hub_fam_trip_groups (group_id);

alter table public.hub_fam_trip_groups enable row level security;
create policy hub_fam_trip_groups_select on public.hub_fam_trip_groups
  for select to authenticated using (public.is_staff());
create policy hub_fam_trip_groups_write on public.hub_fam_trip_groups
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
grant select, insert, update, delete on public.hub_fam_trip_groups to authenticated;
revoke all on public.hub_fam_trip_groups from anon;
grant all on public.hub_fam_trip_groups to service_role;

-- Who may apply for a trip, and which groups it is reserved for. Agents can't
-- read groups under RLS, so the names come through here. Returns no row when
-- the viewer can't see the trip at all.
create or replace function public.fam_trip_access(p_trip uuid)
returns table (group_only boolean, can_apply boolean, group_names text[])
language sql stable security definer set search_path = public as $$
  select
    t.audience = 'groups',
    public.is_staff()
      or t.audience = 'open'
      or exists (
        select 1
        from public.hub_fam_trip_groups tg
        join public.group_members gm on gm.group_id = tg.group_id
        where tg.fam_trip_id = t.id and gm.user_id = auth.uid()
      ),
    coalesce(
      (select array_agg(g.name order by g.name)
         from public.hub_fam_trip_groups tg
         join public.groups g on g.id = tg.group_id
        where tg.fam_trip_id = t.id),
      '{}'
    )
  from public.hub_fam_trips t
  where t.id = p_trip and (t.status = 'published' or public.is_staff());
$$;
revoke all on function public.fam_trip_access(uuid) from public, anon;
grant execute on function public.fam_trip_access(uuid) to authenticated, service_role;
