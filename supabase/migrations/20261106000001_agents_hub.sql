-- TravelXM Agents Hub.
-- The Academy becomes one module of a hub that also holds masterclasses, FAM
-- trips, current offers, books and marketing links. Everything here is additive:
-- the Agent Portal shares this database and must keep working unchanged.

-- ---------------------------------------------------------------- profiles
alter table public.profiles
  add column is_independent boolean not null default false,
  -- Hub-only onboarding mark (agency question). onboarded_at stays for the Portal.
  add column hub_onboarded_at timestamptz;

update public.profiles set hub_onboarded_at = coalesce(onboarded_at, created_at);

-- Sign-up metadata now carries the agency, the independent flag and a
-- hub_signup marker. Google and Portal sign-ups do not send it, so the Hub
-- sends them through /welcome once.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_first text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'given_name')), '');
  v_last text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'last_name', new.raw_user_meta_data ->> 'family_name')), '');
  v_full text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')), '');
  v_independent boolean := coalesce((new.raw_user_meta_data ->> 'is_independent')::boolean, false);
  v_company text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'company', '')), '');
begin
  v_full := coalesce(v_full, nullif(trim(concat_ws(' ', v_first, v_last)), ''));
  if v_first is null and v_full is not null then
    v_first := split_part(v_full, ' ', 1);
    v_last := nullif(trim(substr(v_full, length(v_first) + 1)), '');
  end if;
  if v_independent then v_company := null; end if;

  insert into public.profiles (id, email, full_name, first_name, last_name, company, country, avatar_url, onboarded_at, is_independent, hub_onboarded_at)
  values (
    new.id,
    new.email,
    v_full,
    v_first,
    v_last,
    v_company,
    nullif(new.raw_user_meta_data ->> 'country', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    now(),
    v_independent,
    case when new.raw_user_meta_data ->> 'hub_signup' = 'true' then now() end
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- ---------------------------------------------------------------- CRM hand-off
-- One row per account: whether the Zoho lead (through the n8n Agents Hub
-- workflow) has been sent. Written only by the service role.
create table public.hub_crm_leads (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  claimed_at timestamptz,
  sent_at timestamptz,
  attempts int not null default 0,
  last_error text,
  payload jsonb,
  created_at timestamptz not null default now()
);
alter table public.hub_crm_leads enable row level security;
create policy hub_crm_leads_staff_read on public.hub_crm_leads
  for select to authenticated using (public.is_staff());
grant select on public.hub_crm_leads to authenticated;
revoke all on public.hub_crm_leads from anon;
grant all on public.hub_crm_leads to service_role;

-- Takes a 10-minute lease on the hand-off. Returns true when the caller should
-- POST now; false when it was already sent, is in flight, or gave up (5 tries).
create or replace function public.claim_hub_crm_lead(p_user uuid, p_payload jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  insert into public.hub_crm_leads (user_id, claimed_at, attempts, payload)
  values (p_user, now(), 1, p_payload)
  on conflict (user_id) do update
    set claimed_at = now(),
        attempts = public.hub_crm_leads.attempts + 1,
        payload = excluded.payload
    where public.hub_crm_leads.sent_at is null
      and public.hub_crm_leads.attempts < 5
      and (public.hub_crm_leads.claimed_at is null or public.hub_crm_leads.claimed_at < now() - interval '10 minutes')
  returning user_id into v_id;
  return v_id is not null;
end $$;
revoke execute on function public.claim_hub_crm_lead(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.claim_hub_crm_lead(uuid, jsonb) to service_role;

-- ---------------------------------------------------------------- masterclasses
create table public.hub_masterclasses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  speaker text,
  video_key text,
  embed_url text check (embed_url is null or embed_url ~ '^https://'),
  poster_key text,
  duration_seconds int check (duration_seconds is null or duration_seconds >= 0),
  status public.course_status not null default 'draft',
  sort_order int not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hub_masterclasses_published_has_video check (status <> 'published' or video_key is not null or embed_url is not null)
);
create index hub_masterclasses_status_idx on public.hub_masterclasses (status, sort_order);
create trigger hub_masterclasses_touch before update on public.hub_masterclasses
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- FAM trips
create table public.hub_fam_trips (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  timing_label text not null,
  starts_on date,
  nights int not null check (nights between 1 and 30),
  regions text[] not null default '{}',
  segments text[] not null default '{}'
    check (segments <@ array['classic', 'luxury', 'romance', 'wellness', 'adventure', 'family', 'groups', 'business']::text[]),
  summary text not null,
  expect text,
  body jsonb,
  image_key text,
  image_alt text,
  cta_url text check (cta_url is null or cta_url ~ '^https://'),
  cta_label text not null default 'Register interest',
  status public.course_status not null default 'draft',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index hub_fam_trips_status_idx on public.hub_fam_trips (status, sort_order);
create trigger hub_fam_trips_touch before update on public.hub_fam_trips
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- current offers
create table public.hub_offers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  body jsonb,
  image_key text,
  valid_from date,
  valid_until date,
  file_key text,
  file_name text,
  file_size bigint check (file_size is null or file_size >= 0),
  link_url text check (link_url is null or link_url ~ '^https?://'),
  cta_url text check (cta_url is null or cta_url ~ '^https://'),
  cta_label text,
  status public.course_status not null default 'draft',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hub_offers_valid_window check (valid_from is null or valid_until is null or valid_from <= valid_until)
);
create index hub_offers_status_idx on public.hub_offers (status, sort_order);
create trigger hub_offers_touch before update on public.hub_offers
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- books
create table public.hub_books (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  author text,
  description text,
  cover_key text,
  file_key text,
  file_name text,
  file_size bigint check (file_size is null or file_size >= 0),
  page_count int check (page_count is null or page_count > 0),
  -- Width / height of a rendered page, so the reader can size the stage before the first image arrives.
  page_aspect numeric(6, 4) check (page_aspect is null or page_aspect > 0),
  -- Bumped when the PDF changes, so cached page images are never stale.
  file_version int not null default 1,
  status public.course_status not null default 'draft',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hub_books_published_has_file check (status <> 'published' or file_key is not null)
);
create index hub_books_status_idx on public.hub_books (status, sort_order);
create trigger hub_books_touch before update on public.hub_books
  for each row execute function public.touch_updated_at();

-- Where each reader left off. Agents write their own row.
create table public.hub_book_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  book_id uuid not null references public.hub_books (id) on delete cascade,
  page int not null default 1 check (page >= 1),
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

-- ---------------------------------------------------------------- links
-- External links the hub points to (the marketing assets folder in Google Drive).
create table public.hub_links (
  id uuid primary key default gen_random_uuid(),
  group_key text not null check (group_key in ('marketing', 'home')),
  title text not null,
  description text,
  url text not null check (url ~ '^https?://'),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
insert into public.hub_links (group_key, title, description, url) values (
  'marketing',
  'Marketing assets folder',
  'Photos, videos, logos and ready-made materials for your clients and social media.',
  'https://drive.google.com/drive/folders/1XmCF1yyljdCODt0jISYm3nouBhR0Lyv7'
);

-- ---------------------------------------------------------------- access
alter table public.hub_masterclasses enable row level security;
alter table public.hub_fam_trips enable row level security;
alter table public.hub_offers enable row level security;
alter table public.hub_books enable row level security;
alter table public.hub_book_progress enable row level security;
alter table public.hub_links enable row level security;

create policy hub_masterclasses_select on public.hub_masterclasses
  for select to authenticated using (status = 'published' or public.is_staff());
create policy hub_masterclasses_write on public.hub_masterclasses
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy hub_fam_trips_select on public.hub_fam_trips
  for select to authenticated using (status = 'published' or public.is_staff());
create policy hub_fam_trips_write on public.hub_fam_trips
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Agents never see an expired offer. Upcoming ones (valid_from in the future)
-- are filtered in the query so staff can preview them.
create policy hub_offers_select on public.hub_offers
  for select to authenticated
  using ((status = 'published' and (valid_until is null or valid_until >= current_date)) or public.is_staff());
create policy hub_offers_write on public.hub_offers
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy hub_books_select on public.hub_books
  for select to authenticated using (status = 'published' or public.is_staff());
create policy hub_books_write on public.hub_books
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy hub_book_progress_own on public.hub_book_progress
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy hub_links_select on public.hub_links
  for select to authenticated using (true);
create policy hub_links_write on public.hub_links
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

grant select, insert, update, delete on
  public.hub_masterclasses, public.hub_fam_trips, public.hub_offers, public.hub_books,
  public.hub_book_progress, public.hub_links
to authenticated;
revoke all on
  public.hub_masterclasses, public.hub_fam_trips, public.hub_offers, public.hub_books,
  public.hub_book_progress, public.hub_links
from anon;
grant all on
  public.hub_masterclasses, public.hub_fam_trips, public.hub_offers, public.hub_books,
  public.hub_book_progress, public.hub_links
to service_role;
