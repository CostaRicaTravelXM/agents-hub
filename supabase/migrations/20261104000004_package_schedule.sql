-- A package's schedule, by trip day rather than by date: each item has
-- kind, title, startDay, startTime, endDay, endTime, location, description, imageUrl and highlights.
-- Read and write access follows the existing packages policies.

alter table public.packages
  add column schedule jsonb not null default '[]'::jsonb
  constraint packages_schedule_is_array check (jsonb_typeof(schedule) = 'array');
