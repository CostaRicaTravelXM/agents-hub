-- Public gift campaigns (Thanksgiving 2026 first).
-- An advisor opens a public page, says who they are and gets a download. The Hub
-- keeps the claim here and sends it to Zoho CRM in the background, so the page
-- never waits on Zoho and nothing is lost while Zoho is down or not connected.
-- Additive only: the Agent Portal shares this database.

-- ---------------------------------------------------------------- registration lead
-- The Hub can now write the sign-up Lead to Zoho itself; keep the record it got back.
alter table public.hub_crm_leads add column zoho_record_id text;

-- ---------------------------------------------------------------- claims
create table public.hub_campaign_claims (
  id uuid primary key default gen_random_uuid(),
  campaign text not null check (campaign ~ '^[a-z0-9-]{3,40}$'),
  email text not null check (email = lower(email) and length(email) <= 254),
  first_name text check (length(first_name) <= 80),
  last_name text check (length(last_name) <= 80),
  company text check (length(company) <= 120),
  phone text check (length(phone) <= 40),
  is_independent boolean not null default false,
  -- Where the link was opened from: email, whatsapp, instagram…
  channel text not null default 'direct' check (channel ~ '^[a-z0-9_-]{1,24}$'),
  -- Zoho already had this email when the advisor looked it up.
  known boolean not null default false,
  zoho_module text check (zoho_module in ('Leads', 'Contacts')),
  zoho_record_id text,
  -- Null until the advisor confirms "yes, this is me" or sends their details.
  confirmed_at timestamptz,
  kit_downloaded_at timestamptz,
  fam_opened_at timestamptz,
  -- Zoho hand-off. version goes up with every change worth sending; synced_version
  -- is the last one Zoho has. They differ while something is waiting.
  version int not null default 0,
  synced_version int not null default 0,
  sync_claimed_at timestamptz,
  sync_attempts int not null default 0,
  synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign, email)
);
create index hub_campaign_claims_pending_idx on public.hub_campaign_claims (campaign, created_at)
  where confirmed_at is not null and version > synced_version;
create trigger hub_campaign_claims_touch before update on public.hub_campaign_claims
  for each row execute function public.touch_updated_at();

alter table public.hub_campaign_claims enable row level security;
create policy hub_campaign_claims_staff_read on public.hub_campaign_claims
  for select to authenticated using (public.is_staff());
grant select on public.hub_campaign_claims to authenticated;
revoke all on public.hub_campaign_claims from anon;
grant all on public.hub_campaign_claims to service_role;

-- Takes a 2-minute lease on sending one claim to Zoho. Returns the version being
-- sent, or null when there is nothing to send, another request is sending it,
-- or it failed too often (10 tries; a new change by the advisor starts over).
create or replace function public.claim_hub_campaign_sync(p_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_version int;
begin
  update public.hub_campaign_claims
     set sync_claimed_at = now(),
         sync_attempts = sync_attempts + 1
   where id = p_id
     and confirmed_at is not null
     and version > synced_version
     and sync_attempts < 10
     and (sync_claimed_at is null or sync_claimed_at < now() - interval '2 minutes')
  returning version into v_version;
  return v_version;
end $$;
revoke execute on function public.claim_hub_campaign_sync(uuid) from public, anon, authenticated;
grant execute on function public.claim_hub_campaign_sync(uuid) to service_role;

-- ---------------------------------------------------------------- rate limits
-- Small sliding-window counter for public forms. Keys are hashes, never a raw
-- IP address or email.
create table public.hub_rate_hits (
  bucket text not null,
  key text not null,
  at timestamptz not null default now()
);
create index hub_rate_hits_idx on public.hub_rate_hits (bucket, key, at);
alter table public.hub_rate_hits enable row level security;
revoke all on public.hub_rate_hits from anon, authenticated;
grant all on public.hub_rate_hits to service_role;

-- Records one hit and answers whether it is still inside the allowance.
create or replace function public.hub_rate_allow(p_bucket text, p_key text, p_max int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  delete from public.hub_rate_hits
   where bucket = p_bucket and key = p_key and at < now() - make_interval(secs => p_window_seconds);
  select count(*) into v_count from public.hub_rate_hits where bucket = p_bucket and key = p_key;
  if v_count >= p_max then
    return false;
  end if;
  insert into public.hub_rate_hits (bucket, key) values (p_bucket, p_key);
  return true;
end $$;
revoke execute on function public.hub_rate_allow(text, text, int, int) from public, anon, authenticated;
grant execute on function public.hub_rate_allow(text, text, int, int) to service_role;
