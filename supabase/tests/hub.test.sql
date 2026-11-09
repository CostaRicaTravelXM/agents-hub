-- pgTAP suite for the Agents Hub: sign-up metadata, module visibility and the CRM hand-off lease.
-- Counts stay on this file's own fixtures, so demo rows in a local database do not change them.
--   npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(42);

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
-- A group-only trip with no dates yet, for one agency group that only Sol (b2) belongs to.
insert into public.groups (id, name) values ('00000000-0000-0000-0000-0000000000a1', 'Sunset Travel');
insert into public.group_members (group_id, user_id) values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2');
insert into public.hub_fam_trips (id, slug, title, timing_label, nights, summary, audience, status) values
  ('00000000-0000-0000-0000-0000000000c1', 'group-trip', 'Group trip', null, 5, 'For one agency', 'groups', 'published'),
  ('00000000-0000-0000-0000-0000000000c2', 'draft-trip', 'Draft trip', null, 5, 'Not yet', 'open', 'draft');
insert into public.hub_fam_trip_groups (fam_trip_id, group_id) values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1');

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
select ok((select count(*) = 13 from public.hub_fam_trips where status = 'published' and slug <> 'group-trip'), 'the 13 FAM departures are seeded');
select throws_ok(
  $$ insert into public.hub_fam_trips (slug, title, nights, summary, audience) values ('who', 'Who', 5, 'x', 'agents') $$,
  '23514', null, 'a FAM trip audience is open or groups');
select is((select timing_label from public.hub_fam_trips where slug = 'group-trip'), null, 'a FAM trip can have no dates yet');

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

-- Group-only FAM trips: everyone reads them, only the groups' members may apply.
select ok(exists (select 1 from public.hub_fam_trips where slug = 'group-trip'), 'an agent outside the group still sees a group trip');
select results_eq(
  $$ select group_only, can_apply, group_names from public.fam_trip_access('00000000-0000-0000-0000-0000000000c1') $$,
  $$ values (true, false, array['Sunset Travel']) $$,
  'an agent outside the group cannot apply, and is told which agency it is for');
select is((select can_apply from public.fam_trip_access((select id from public.hub_fam_trips where slug = 'wellness'))), true, 'anyone can apply for an open trip');
select is((select count(*)::int from public.fam_trip_access('00000000-0000-0000-0000-0000000000c2')), 0, 'a draft trip tells an agent nothing');
select is((select count(*)::int from public.hub_fam_trip_groups), 0, 'an agent cannot read which groups a trip is for');
select throws_ok(
  $$ insert into public.hub_fam_trip_groups (fam_trip_id, group_id) values ((select id from public.hub_fam_trips where slug = 'wellness'), '00000000-0000-0000-0000-0000000000a1') $$,
  '42501', null, 'an agent cannot reserve a trip for a group');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select is((select can_apply from public.fam_trip_access('00000000-0000-0000-0000-0000000000c1')), true, 'a member of the group can apply');
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';

-- ---------------------------------------------------------------- staff
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000b4","role":"authenticated"}';
select is((select count(*)::int from public.hub_offers where slug in ('live-offer', 'old-offer', 'open-offer')), 3, 'staff see every offer, expired ones included');
select lives_ok(
  $$ insert into public.hub_offers (slug, title, status) values ('staff-offer', 'Staff offer', 'draft') $$,
  'staff can create an offer');
select is((select can_apply from public.fam_trip_access('00000000-0000-0000-0000-0000000000c1')), true, 'staff can always open the form');

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
