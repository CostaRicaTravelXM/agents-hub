-- One TravelXM account for the Academy and the Agent Portal.
-- Sign-up asks only for name, email and password. The Academy is open to every
-- account; the Agent Portal requires an approved agent verification, decided by
-- TravelXM in Zoho CRM and applied here by the webhook (service role only).

-- ---------------------------------------------------------------- profile names
alter table public.profiles
  add column first_name text,
  add column last_name text;

update public.profiles
set first_name = split_part(trim(full_name), ' ', 1),
    last_name = nullif(trim(substr(trim(full_name), length(split_part(trim(full_name), ' ', 1)) + 1)), '')
where full_name is not null;

-- Sign-up no longer collects agency and country, so nobody waits on onboarding.
update public.profiles set onboarded_at = now() where onboarded_at is null;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_first text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'given_name')), '');
  v_last text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'last_name', new.raw_user_meta_data ->> 'family_name')), '');
  v_full text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')), '');
begin
  v_full := coalesce(v_full, nullif(trim(concat_ws(' ', v_first, v_last)), ''));
  if v_first is null and v_full is not null then
    v_first := split_part(v_full, ' ', 1);
    v_last := nullif(trim(substr(v_full, length(v_first) + 1)), '');
  end if;

  insert into public.profiles (id, email, full_name, first_name, last_name, company, country, avatar_url, onboarded_at)
  values (
    new.id,
    new.email,
    v_full,
    v_first,
    v_last,
    nullif(new.raw_user_meta_data ->> 'company', ''),
    nullif(new.raw_user_meta_data ->> 'country', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    now()
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- Accounts created before the trigger existed would otherwise loop between
-- /login and /dashboard: a session with no profile row.
insert into public.profiles (id, email, onboarded_at)
select u.id, u.email, now()
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- The Academy profile page edits full_name; keep the split columns in step.
create or replace function public.sync_profile_names()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.full_name is distinct from old.full_name
     and new.first_name is not distinct from old.first_name
     and new.last_name is not distinct from old.last_name then
    new.first_name := nullif(split_part(trim(coalesce(new.full_name, '')), ' ', 1), '');
    new.last_name := nullif(trim(substr(trim(coalesce(new.full_name, '')), length(coalesce(new.first_name, '')) + 1)), '');
  end if;
  return new;
end $$;
create trigger profiles_sync_names before update on public.profiles
  for each row execute function public.sync_profile_names();

-- ---------------------------------------------------------------- verification
create type public.agent_verification_status as enum
  ('draft', 'submitted', 'changes_requested', 'approved', 'rejected');

-- Separate from profiles on purpose: agents may update their own profile row,
-- and approval must never be reachable from there.
create table public.agent_verifications (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  status public.agent_verification_status not null default 'draft',
  answers jsonb not null default '{}' check (jsonb_typeof(answers) = 'object' and pg_column_size(answers) < 20000),
  current_step int not null default 1 check (current_step between 1 and 5),
  logo_path text,
  zoho_module text check (zoho_module in ('Leads', 'Contacts')),
  zoho_record_id text,
  crm_synced_at timestamptz,
  crm_sync_error text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index agent_verifications_status_idx on public.agent_verifications (status);
create index agent_verifications_zoho_idx on public.agent_verifications (zoho_record_id) where zoho_record_id is not null;
create index agent_verifications_crm_retry_idx on public.agent_verifications (submitted_at)
  where status = 'submitted' and crm_synced_at is null;
create trigger agent_verifications_touch before update on public.agent_verifications
  for each row execute function public.touch_updated_at();

alter table public.agent_verifications enable row level security;
create policy agent_verifications_read on public.agent_verifications
  for select to authenticated using (user_id = auth.uid() or public.is_staff());
-- No write policies: agents go through the RPCs below, the webhook through the service role.
revoke all on public.agent_verifications from anon;
revoke insert, update, delete, truncate on public.agent_verifications from authenticated;

create or replace function public.is_verified_agent()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff() or exists (
    select 1 from public.agent_verifications v
    where v.user_id = auth.uid() and v.status = 'approved'
  );
$$;

create or replace function public.save_verification_draft(p_answers jsonb, p_step int, p_logo_path text default null)
returns public.agent_verifications
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_row public.agent_verifications;
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if p_logo_path is not null and split_part(p_logo_path, '/', 1) <> v_uid::text then
    raise exception 'logo must be in your own folder' using errcode = '42501';
  end if;

  insert into public.agent_verifications (user_id) values (v_uid) on conflict (user_id) do nothing;
  select * into v_row from public.agent_verifications where user_id = v_uid for update;
  if v_row.status not in ('draft', 'changes_requested') then
    raise exception 'verification is %, it can no longer be edited', v_row.status using errcode = 'P0001';
  end if;

  update public.agent_verifications
  set answers = coalesce(p_answers, answers),
      current_step = coalesce(p_step, current_step),
      logo_path = coalesce(p_logo_path, logo_path)
  where user_id = v_uid
  returning * into v_row;
  return v_row;
end $$;

-- Required answers mirror the Zoho "TravelXM Agent Profile" form.
create or replace function public.submit_verification()
returns public.agent_verifications
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_row public.agent_verifications;
  v_key text;
  v_missing text[] := '{}';
begin
  if v_uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  -- Zoho links a record back to an account by email, so the address must be proven.
  if not exists (select 1 from auth.users u where u.id = v_uid and u.email_confirmed_at is not null) then
    raise exception 'confirm your email first' using errcode = '42501';
  end if;

  select * into v_row from public.agent_verifications where user_id = v_uid for update;
  if not found then raise exception 'nothing to submit' using errcode = 'P0001'; end if;
  if v_row.status not in ('draft', 'changes_requested') then
    raise exception 'verification is %, it cannot be submitted again', v_row.status using errcode = 'P0001';
  end if;

  foreach v_key in array array['partner_type', 'company', 'agency_model', 'host_affiliated',
                               'consortium_affiliated', 'seller_license_required', 'phone'] loop
    if coalesce(trim(v_row.answers ->> v_key), '') = '' then v_missing := v_missing || v_key; end if;
  end loop;
  if v_row.answers ->> 'host_affiliated' = 'yes' and coalesce(trim(v_row.answers ->> 'host_agency'), '') = '' then
    v_missing := v_missing || 'host_agency'::text;
  end if;
  if array_length(v_missing, 1) > 0 then
    raise exception 'missing answers: %', array_to_string(v_missing, ', ') using errcode = 'P0001';
  end if;

  update public.agent_verifications
  set status = 'submitted', submitted_at = now(), crm_synced_at = null, crm_sync_error = null
  where user_id = v_uid
  returning * into v_row;
  return v_row;
end $$;

-- Applies a decision made in Zoho CRM. Matches on the CRM record, then on a
-- confirmed email (a Lead's id changes when it converts to a Contact). A draft is
-- never approved: the agent must have submitted the form first.
create or replace function public.apply_verification_review(
  p_status public.agent_verification_status,
  p_zoho_module text default null,
  p_zoho_record_id text default null,
  p_email text default null,
  p_note text default null
)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_row public.agent_verifications;
begin
  if p_status = 'draft' then raise exception 'draft is not a review decision' using errcode = 'P0001'; end if;

  if p_zoho_record_id is not null then
    select * into v_row from public.agent_verifications where zoho_record_id = p_zoho_record_id for update;
  end if;
  if v_row.user_id is null and p_email is not null then
    select v.* into v_row
    from public.agent_verifications v
    join auth.users u on u.id = v.user_id
    where lower(u.email) = lower(trim(p_email)) and u.email_confirmed_at is not null
    for update of v;
  end if;

  if v_row.user_id is null then return 'not_found'; end if;
  if v_row.status = 'draft' then return 'not_submitted'; end if;
  if v_row.status = p_status and v_row.review_note is not distinct from p_note then return 'unchanged'; end if;

  update public.agent_verifications
  set status = p_status,
      reviewed_at = now(),
      review_note = p_note,
      zoho_module = coalesce(p_zoho_module, zoho_module),
      zoho_record_id = coalesce(p_zoho_record_id, zoho_record_id)
  where user_id = v_row.user_id;

  if v_row.status is distinct from p_status then
    insert into public.notifications (agent_id, title, body, href)
    select v_row.user_id, n.title, n.body, n.href
    from (values
      ('approved'::public.agent_verification_status, 'Your agent account is verified', 'Bookings, clients and the rest of the portal are now open.', '/dashboard'),
      ('changes_requested', 'We need a few changes to verify you', coalesce(p_note, 'Open your verification to see what to update.'), '/verification'),
      ('rejected', 'We could not verify your agent account', coalesce(p_note, 'Contact us if you think this is a mistake.'), '/verification')
    ) as n (status, title, body, href)
    where n.status = p_status;
  end if;
  return 'updated';
end $$;

revoke execute on function public.apply_verification_review(public.agent_verification_status, text, text, text, text) from public, anon, authenticated;
grant execute on function public.apply_verification_review(public.agent_verification_status, text, text, text, text) to service_role;
revoke execute on function public.save_verification_draft(jsonb, int, text) from public, anon;
revoke execute on function public.submit_verification() from public, anon;

-- ---------------------------------------------------------------- agency logos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('agent-logos', 'agent-logos', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy agent_logos_read on storage.objects for select to authenticated
  using (bucket_id = 'agent-logos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));
create policy agent_logos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'agent-logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy agent_logos_update on storage.objects for update to authenticated
  using (bucket_id = 'agent-logos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'agent-logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy agent_logos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'agent-logos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------- portal gate
-- Notifications stay readable: that is where an unverified agent hears back.
drop policy packages_read on public.packages;
create policy packages_read on public.packages
  for select to authenticated using ((is_active and public.is_verified_agent()) or public.is_staff());

drop policy package_reviews_read on public.package_reviews;
create policy package_reviews_read on public.package_reviews
  for select to authenticated using (public.is_verified_agent());

drop policy customers_read on public.customers;
create policy customers_read on public.customers
  for select to authenticated using ((agent_id = auth.uid() and public.is_verified_agent()) or public.is_staff());
drop policy customers_insert on public.customers;
create policy customers_insert on public.customers
  for insert to authenticated with check (agent_id = auth.uid() and public.is_verified_agent());
drop policy customers_update on public.customers;
create policy customers_update on public.customers
  for update to authenticated
  using (agent_id = auth.uid() and public.is_verified_agent())
  with check (agent_id = auth.uid() and public.is_verified_agent());
drop policy customers_delete on public.customers;
create policy customers_delete on public.customers
  for delete to authenticated using (agent_id = auth.uid() and public.is_verified_agent());

drop policy bookings_read on public.bookings;
create policy bookings_read on public.bookings
  for select to authenticated using ((agent_id = auth.uid() and public.is_verified_agent()) or public.is_staff());
drop policy bookings_insert on public.bookings;
create policy bookings_insert on public.bookings
  for insert to authenticated with check (
    agent_id = auth.uid()
    and public.is_verified_agent()
    and exists (select 1 from public.customers c where c.id = customer_id and c.agent_id = auth.uid())
  );
drop policy bookings_update on public.bookings;
create policy bookings_update on public.bookings
  for update to authenticated
  using (agent_id = auth.uid() and public.is_verified_agent())
  with check (agent_id = auth.uid() and public.is_verified_agent());

drop policy commissions_read on public.commissions;
create policy commissions_read on public.commissions
  for select to authenticated using ((agent_id = auth.uid() and public.is_verified_agent()) or public.is_staff());

drop policy payment_transactions_read on public.payment_transactions;
create policy payment_transactions_read on public.payment_transactions
  for select to authenticated using ((agent_id = auth.uid() and public.is_verified_agent()) or public.is_staff());
drop policy payment_transactions_insert on public.payment_transactions;
create policy payment_transactions_insert on public.payment_transactions
  for insert to authenticated with check (agent_id = auth.uid() and public.is_verified_agent());

drop policy support_tickets_read on public.support_tickets;
create policy support_tickets_read on public.support_tickets
  for select to authenticated using ((agent_id = auth.uid() and public.is_verified_agent()) or public.is_staff());
drop policy support_tickets_insert on public.support_tickets;
create policy support_tickets_insert on public.support_tickets
  for insert to authenticated with check (agent_id = auth.uid() and public.is_verified_agent());
drop policy support_tickets_update on public.support_tickets;
create policy support_tickets_update on public.support_tickets
  for update to authenticated
  using ((agent_id = auth.uid() and public.is_verified_agent()) or public.is_staff())
  with check ((agent_id = auth.uid() and public.is_verified_agent()) or public.is_staff());

drop policy crm_sync_records_read on public.crm_sync_records;
create policy crm_sync_records_read on public.crm_sync_records
  for select to authenticated using ((agent_id = auth.uid() and public.is_verified_agent()) or public.is_staff());

drop policy activity_events_read on public.activity_events;
create policy activity_events_read on public.activity_events
  for select to authenticated using (agent_id = auth.uid() and public.is_verified_agent());
