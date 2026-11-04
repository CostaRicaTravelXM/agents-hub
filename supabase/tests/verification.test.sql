-- pgTAP suite for the shared account and the agent verification gate.
--   npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

-- ---------------------------------------------------------------- fixtures
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'pending@test.dev', now(), '{"first_name":"Pat","last_name":"Pending Lee"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a2', 'verified@test.dev', now(), '{"full_name":"Vera Verified"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a3', 'unconfirmed@test.dev', null, '{"first_name":"Una","last_name":"Unconfirmed"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a4', 'staff@test.dev', now(), '{"full_name":"Sam Staff"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a5', 'google@test.dev', now(), '{"given_name":"Gia","family_name":"Google","name":"Gia Google"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a6', 'mononym@test.dev', now(), '{"name":"Madonna"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a7', 'link@test.dev', now(), '{}', 'authenticated', 'authenticated');
update public.profiles set role = 'content_manager' where id = '00000000-0000-0000-0000-0000000000a4';

insert into public.agent_verifications (user_id, status) values
  ('00000000-0000-0000-0000-0000000000a2', 'approved');
insert into public.packages (id, name, destination, description, price_per_person, duration_days, commission_rate, image_url)
values (9001, 'Test package', 'Costa Rica', 'A package', 100, 5, 10, 'https://example.test/p.jpg');
insert into public.customers (id, agent_id, first_name, last_name, email)
values (9001, '00000000-0000-0000-0000-0000000000a2', 'Client', 'One', 'client@test.dev');

-- ---------------------------------------------------------------- sign-up
select is((select first_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'), 'Pat', 'first name stored');
select is((select last_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'), 'Pending Lee', 'last name stored');
select is((select full_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'), 'Pat Pending Lee', 'full name composed');
select is((select first_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a2'), 'Vera', 'a full name alone is split');
select ok((select onboarded_at is not null from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'), 'name-only sign-up needs no onboarding');
select is((select first_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a5'), 'Gia', 'Google given name stored');
select is((select last_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a5'), 'Google', 'Google family name stored');
select is((select first_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a6'), 'Madonna', 'a single Google name is the first name');
select ok((select last_name is null from public.profiles where id = '00000000-0000-0000-0000-0000000000a6'), 'a missing last name stays empty, so /welcome asks for it');
select ok((select first_name is null and last_name is null from public.profiles where id = '00000000-0000-0000-0000-0000000000a7'), 'an email link without a name leaves both empty');

-- ---------------------------------------------------------------- unverified agent
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select ok(not public.is_verified_agent(), 'a new account is not verified');
select is_empty('select id from public.packages', 'unverified agent cannot read packages');
select throws_ok(
  $$ insert into public.customers (agent_id, first_name, last_name, email)
     values ('00000000-0000-0000-0000-0000000000a1', 'A', 'B', 'a@b.dev') $$,
  '42501', null, 'unverified agent cannot add clients');
select throws_ok(
  $$ insert into public.agent_verifications (user_id, status)
     values ('00000000-0000-0000-0000-0000000000a1', 'approved') $$,
  '42501', null, 'no self-approval by insert');

select lives_ok(
  $$ select public.save_verification_draft('{"partner_type":"independent"}'::jsonb, 2) $$,
  'agent can save a draft');
select throws_ok(
  $$ update public.agent_verifications set status = 'approved'
     where user_id = '00000000-0000-0000-0000-0000000000a1' $$,
  '42501', null, 'no self-approval by update');
select throws_ok($$ select public.submit_verification() $$, 'P0001', null, 'cannot submit with required answers missing');
select throws_ok(
  $$ select public.apply_verification_review('approved', null, null, 'pending@test.dev') $$,
  '42501', null, 'agents cannot call the review function');
select throws_ok(
  $$ select public.save_verification_draft('{}'::jsonb, 1, '00000000-0000-0000-0000-0000000000a2/logo.png') $$,
  '42501', null, 'logo path must be in the agent''s own folder');

select lives_ok(
  $$ select public.save_verification_draft(
       '{"partner_type":"independent","company":"Blue Travel","agency_model":"Homebased","host_affiliated":"no",
         "consortium_affiliated":"no","seller_license_required":"no","phone":"+1 555 0100"}'::jsonb, 5) $$,
  'agent can complete the draft');

-- A draft is never approved, even if someone marks the CRM record first.
reset role;
select is(
  public.apply_verification_review('approved', 'Leads', 'zcrm_1', 'pending@test.dev'),
  'not_submitted', 'a draft cannot be approved');

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is((public.submit_verification()).status, 'submitted'::public.agent_verification_status, 'complete form submits');
select throws_ok(
  $$ select public.save_verification_draft('{}'::jsonb, 1) $$,
  'P0001', null, 'submitted answers are locked');

-- ---------------------------------------------------------------- decision from Zoho
reset role;
select is(
  public.apply_verification_review('approved', 'Contacts', 'zcrm_2', 'PENDING@test.dev'),
  'updated', 'approval applies by confirmed email, ignoring case');
select is(
  public.apply_verification_review('approved', 'Contacts', 'zcrm_2', 'pending@test.dev'),
  'unchanged', 'a repeated webhook changes nothing');
select is(
  (select count(*)::int from public.notifications where agent_id = '00000000-0000-0000-0000-0000000000a1'),
  1, 'the agent is notified once');

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select ok(public.is_verified_agent(), 'approval opens the portal');
select isnt_empty('select id from public.packages', 'verified agent can read packages');
select is_empty('select id from public.customers', 'verified agent still sees only their own clients');

-- ---------------------------------------------------------------- unconfirmed email
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}';
select lives_ok(
  $$ select public.save_verification_draft(
       '{"partner_type":"independent","company":"X","agency_model":"Storefront","host_affiliated":"no",
         "consortium_affiliated":"no","seller_license_required":"no","phone":"1"}'::jsonb, 5) $$,
  'unconfirmed account can save');
select throws_ok($$ select public.submit_verification() $$, '42501', null, 'unconfirmed email cannot submit');

select * from finish();
rollback;
