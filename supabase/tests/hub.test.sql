-- pgTAP suite for the Agents Hub: sign-up metadata, module visibility and the CRM hand-off lease.
-- Counts stay on this file's own fixtures, so demo rows in a local database do not change them.
--   npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

-- ---------------------------------------------------------------- fixtures
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000b1', 'agency@hub.test', now(),
   '{"first_name":"Ana","last_name":"Agency","company":"Sunset Travel","is_independent":false,"hub_signup":true}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b2', 'solo@hub.test', now(),
   '{"first_name":"Sol","last_name":"Solo","company":"Ignored Inc","is_independent":true,"hub_signup":true}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b3', 'google@hub.test', now(),
   '{"given_name":"Gus","family_name":"Google","name":"Gus Google"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b4', 'staff@hub.test', now(),
   '{"first_name":"Sam","last_name":"Staff","hub_signup":true}', 'authenticated', 'authenticated');
update public.profiles set role = 'content_manager' where id = '00000000-0000-0000-0000-0000000000b4';

insert into public.hub_offers (id, slug, title, status, valid_until) values
  ('00000000-0000-0000-0000-0000000000d1', 'live-offer', 'Live offer', 'published', current_date + 10),
  ('00000000-0000-0000-0000-0000000000d2', 'old-offer', 'Expired offer', 'published', current_date - 1),
  ('00000000-0000-0000-0000-0000000000d3', 'open-offer', 'No end date', 'published', null);
insert into public.hub_books (id, slug, title, file_key, status) values
  ('00000000-0000-0000-0000-0000000000e1', 'pub-book', 'Published book', 'documents/books/x.pdf', 'published'),
  ('00000000-0000-0000-0000-0000000000e2', 'draft-book', 'Draft book', 'documents/books/y.pdf', 'draft');

-- ---------------------------------------------------------------- sign-up
select is((select company from public.profiles where id = '00000000-0000-0000-0000-0000000000b1'), 'Sunset Travel', 'agency stored from sign-up metadata');
select ok((select not is_independent from public.profiles where id = '00000000-0000-0000-0000-0000000000b1'), 'agency sign-up is not independent');
select ok((select hub_onboarded_at is not null from public.profiles where id = '00000000-0000-0000-0000-0000000000b1'), 'hub sign-up needs no welcome step');
select ok((select is_independent from public.profiles where id = '00000000-0000-0000-0000-0000000000b2'), 'independent flag stored');
select ok((select company is null from public.profiles where id = '00000000-0000-0000-0000-0000000000b2'), 'an independent agent has no agency, whatever was typed');
select ok((select hub_onboarded_at is null from public.profiles where id = '00000000-0000-0000-0000-0000000000b3'), 'a Google sign-up still has to answer the agency question');
select is((select first_name from public.profiles where id = '00000000-0000-0000-0000-0000000000b3'), 'Gus', 'Google names are still split');

-- ---------------------------------------------------------------- constraints
select throws_ok(
  $$ insert into public.hub_fam_trips (slug, title, timing_label, nights, segments, summary) values ('bad', 'Bad', 'Nov', 5, array['spa'], 'x') $$,
  '23514', null, 'an unknown FAM segment is rejected');
select throws_ok(
  $$ insert into public.hub_offers (slug, title, valid_from, valid_until) values ('backwards', 'Backwards', '2027-02-01', '2027-01-01') $$,
  '23514', null, 'an offer cannot end before it starts');
select ok((select count(*) = 13 from public.hub_fam_trips where status = 'published'), 'the 13 FAM departures are seeded');

-- ---------------------------------------------------------------- agent visibility
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';

select is((select count(*)::int from public.hub_books where slug in ('pub-book', 'draft-book')), 1, 'an agent sees only published books');
select is((select count(*)::int from public.hub_offers where slug in ('live-offer', 'old-offer', 'open-offer')), 2, 'an agent sees live and open-ended offers, never expired ones');
select ok(not exists (select 1 from public.hub_offers where slug = 'old-offer'), 'the expired offer is hidden');
select throws_ok(
  $$ insert into public.hub_offers (slug, title) values ('agent-offer', 'Agent offer') $$,
  '42501', null, 'an agent cannot create an offer');
-- Row-level security filters the update silently: nothing changes, no error.
update public.hub_fam_trips set title = 'Hacked' where slug = 'wellness';
select is((select title from public.hub_fam_trips where slug = 'wellness'), 'Wellness & Transformation', 'an agent cannot edit a FAM trip');
select is((select count(*)::int from public.hub_links where group_key = 'marketing'), 1, 'an agent can read the marketing links');
select is((select count(*)::int from public.hub_crm_leads), 0, 'an agent cannot read CRM hand-off rows');
select throws_ok(
  $$ select public.claim_hub_crm_lead('00000000-0000-0000-0000-0000000000b1', '{}'::jsonb) $$,
  '42501', null, 'an agent cannot claim the CRM lease');
select lives_ok(
  $$ insert into public.hub_book_progress (user_id, book_id, page) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000e1', 7) $$,
  'an agent saves their own reading position');

-- ---------------------------------------------------------------- staff
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000b4","role":"authenticated"}';
select is((select count(*)::int from public.hub_offers where slug in ('live-offer', 'old-offer', 'open-offer')), 3, 'staff see every offer, expired ones included');
select lives_ok(
  $$ insert into public.hub_offers (slug, title, status) values ('staff-offer', 'Staff offer', 'draft') $$,
  'staff can create an offer');

-- ---------------------------------------------------------------- CRM lease (service role)
reset role;
select ok(public.claim_hub_crm_lead('00000000-0000-0000-0000-0000000000b1', '{"email":"agency@hub.test"}'::jsonb), 'the first claim wins the lease');
select ok(not public.claim_hub_crm_lead('00000000-0000-0000-0000-0000000000b1', '{}'::jsonb), 'a second claim inside the lease is refused');
update public.hub_crm_leads set sent_at = now() where user_id = '00000000-0000-0000-0000-0000000000b1';
select ok(not public.claim_hub_crm_lead('00000000-0000-0000-0000-0000000000b1', '{}'::jsonb), 'once sent, the lead is never claimed again');

-- ---------------------------------------------------------------- verification fills the profile
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000f1', 'portal@hub.test', now(), '{"first_name":"Pat","last_name":"Portal"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000f2', 'typed@hub.test', now(), '{"first_name":"Tia","last_name":"Typed"}', 'authenticated', 'authenticated');
update public.profiles set company = 'Typed Agency', phone = '111' where id = '00000000-0000-0000-0000-0000000000f2';

select is((select hub_onboarded_at from public.profiles where id = '00000000-0000-0000-0000-0000000000f1'), null, 'a Portal sign-up has not answered the agency question');
insert into public.agent_verifications (user_id, answers) values
  ('00000000-0000-0000-0000-0000000000f1', '{"company":"Fora Travel","job_title":"Owner","phone":"555"}'),
  ('00000000-0000-0000-0000-0000000000f2', '{"company":"Other Agency","phone":"222","job_title":"Owner"}');
select is((select company from public.profiles where id = '00000000-0000-0000-0000-0000000000f1'), 'Fora Travel', 'the verification answer fills an empty agency');
select ok((select hub_onboarded_at is not null from public.profiles where id = '00000000-0000-0000-0000-0000000000f1'), 'so the Hub does not ask again');
select is((select company from public.profiles where id = '00000000-0000-0000-0000-0000000000f2'), 'Typed Agency', 'it never overwrites an agency the agent typed');
select is((select phone from public.profiles where id = '00000000-0000-0000-0000-0000000000f2'), '111', 'or a phone the agent typed');
select is((select job_title from public.profiles where id = '00000000-0000-0000-0000-0000000000f2'), 'Owner', 'but it fills the fields still empty');

-- ---------------------------------------------------------------- masterclasses are courses
select ok(exists (select 1 from public.categories where slug = 'masterclasses'), 'the Masterclasses category exists');
select is(to_regclass('public.hub_masterclasses'), null, 'the separate masterclass table is gone');

select * from finish();
rollback;
