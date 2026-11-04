-- pgTAP suite: quotes, itineraries and the client link.
--   npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(37);

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000c1', 'one@test.dev', now(), '{"full_name":"Agent One"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c2', 'two@test.dev', now(), '{"full_name":"Agent Two"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c3', 'staff@test.dev', now(), '{"full_name":"Team Member"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c4', 'new@test.dev', now(), '{"full_name":"Not Verified"}', 'authenticated', 'authenticated');
update public.profiles set role = 'content_manager' where id = '00000000-0000-0000-0000-0000000000c3';
insert into public.agent_verifications (user_id, status) values
  ('00000000-0000-0000-0000-0000000000c1', 'approved'),
  ('00000000-0000-0000-0000-0000000000c2', 'approved');
insert into public.customers (id, agent_id, first_name, last_name, email) values
  (9201, '00000000-0000-0000-0000-0000000000c1', 'Client', 'One', 'c1@test.dev'),
  (9202, '00000000-0000-0000-0000-0000000000c2', 'Client', 'Two', 'c2@test.dev');

create temporary table shared (token text) on commit drop;
grant all on shared to authenticated, anon;
create temporary table latest (id bigint) on commit drop;
grant all on latest to authenticated;

-- ---------------------------------------------------------------- agent asks
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';

select lives_ok(
  $$ insert into public.quote_requests (id, customer_id, destination, start_date, end_date, travelers, status)
     values (9201, 9201, 'Costa Rica', '2027-03-08', '2027-03-12', 2, 'accepted') $$,
  'an agent can ask for a quote');
select is((select status::text from public.quote_requests where id = 9201), 'requested', 'a new quote always starts as requested');
select throws_ok(
  $$ insert into public.quote_requests (customer_id, destination, start_date, end_date, travelers)
     values (9202, 'Costa Rica', '2027-03-08', '2027-03-12', 2) $$,
  '42501', null, 'an agent cannot ask for a quote for another agent''s client');
select throws_ok($$ update public.quote_requests set status = 'accepted' where id = 9201 $$, '42501', null, 'an agent cannot change the status directly');
select lives_ok($$ insert into public.quote_messages (quote_id, body, from_staff, kind) values (9201, 'Hello', true, 'event') $$, 'an agent can write in the conversation');
select is((select from_staff from public.quote_messages where body = 'Hello'), false, 'an agent cannot pose as TravelXM');
select is((select kind from public.quote_messages where body = 'Hello'), 'message', 'an agent cannot write system lines');
select throws_ok($$ select public.quote_start_draft(9201) $$, '42501', null, 'an agent cannot open a draft');
select throws_ok($$ select public.quote_share_create(9201, false) $$, 'P0001', null, 'nothing can be shared before a proposal exists');

-- ---------------------------------------------------------------- other accounts
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';
select is_empty('select id from public.quote_requests where id = 9201', 'another agent cannot see the quote');
select is_empty('select id from public.quote_messages where quote_id = 9201', 'another agent cannot read the conversation');
select throws_ok($$ insert into public.quote_messages (quote_id, body) values (9201, 'Hi') $$, '42501', null, 'another agent cannot write in the conversation');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c4","role":"authenticated"}';
select throws_ok(
  $$ insert into public.quote_requests (customer_id, destination, start_date, end_date, travelers)
     values (9201, 'Costa Rica', '2027-03-08', '2027-03-12', 2) $$,
  '42501', null, 'an unverified account cannot ask for a quote');

-- ---------------------------------------------------------------- team answers
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
select lives_ok($$ select public.quote_start_draft(9201) $$, 'the team opens a draft');
select is(public.quote_start_draft(9201), (select id from public.itinerary_versions where quote_id = 9201), 'opening it again returns the same draft');
select throws_ok(
  format('select public.quote_publish_version(%s)', (select id from public.itinerary_versions where quote_id = 9201)),
  'P0001', 'add at least one item to the itinerary', 'an empty itinerary cannot be sent');

insert into public.itinerary_items (version_id, kind, title, start_at, end_at)
select id, 'hotel', 'Lodge', '2027-03-08 15:00', '2027-03-12 11:00' from public.itinerary_versions where quote_id = 9201;
select throws_ok(
  format('select public.quote_publish_version(%s)', (select id from public.itinerary_versions where quote_id = 9201)),
  'P0001', 'set the total price and the commission rate', 'a proposal needs a price');
update public.itinerary_versions set total_price = 5000, commission_rate = 12, summary = 'Your trip' where quote_id = 9201;

-- A draft stays hidden from the agent.
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select is_empty('select id from public.itinerary_versions where quote_id = 9201', 'an agent cannot see a draft');
select is_empty('select i.id from public.itinerary_items i where i.title = ''Lodge''', 'an agent cannot see a draft''s items');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
select lives_ok(
  format('select public.quote_publish_version(%s)', (select id from public.itinerary_versions where quote_id = 9201)),
  'the team sends the proposal');
select is((select status::text from public.quote_requests where id = 9201), 'proposal_sent', 'the quote waits for the agent');
update public.itinerary_versions set total_price = 1 where quote_id = 9201;
select is(
  (select count(*)::int from public.itinerary_versions where quote_id = 9201 and status = 'published' and total_price = 5000),
  1, 'a sent version cannot be edited');

-- ---------------------------------------------------------------- agent reviews
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select is((select total_price from public.itinerary_versions where quote_id = 9201), 5000.00::numeric, 'the agent sees the proposal');
update public.itinerary_versions set commission_rate = 99 where quote_id = 9201;
select is((select commission_rate from public.itinerary_versions where quote_id = 9201), 12.00::numeric, 'an agent cannot set the commission');
select is(
  (select count(*)::int from public.notifications where agent_id = '00000000-0000-0000-0000-0000000000c1' and title = 'Your itinerary is ready'),
  1, 'the agent is told the itinerary is ready');

insert into shared select public.quote_share_create(9201, false);
reset role;
set local role anon;
select is((select public.get_shared_trip(token) ->> 'destination' from shared), 'Costa Rica', 'the client link works without an account');
select is((select public.get_shared_trip(token) ->> 'price' from shared), null, 'the price stays hidden unless the agent shows it');
select ok(
  (select public.get_shared_trip(token)::text !~* 'commission|budget|notes' from shared),
  'the client link has no commission, budget or notes');
select is(public.get_shared_trip('not-a-real-token'), null, 'a wrong token returns nothing');
select throws_ok('select * from public.itinerary_versions', '42501', null, 'without an account the tables stay closed');

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select public.quote_share_update(9201, true, false);
select is((select (public.get_shared_trip(token) ->> 'price')::numeric from shared), 5000.00::numeric, 'the agent can choose to show the price');

select lives_ok($$ select public.quote_request_changes(9201, 'Add a beach day') $$, 'an agent can ask for changes');
select throws_ok(
  format('select public.quote_accept(%s)', (select id from public.itinerary_versions where quote_id = 9201)),
  'P0001', 'there is no itinerary waiting for your review', 'a version under revision cannot be accepted');

-- The team starts from the last version sent, then sends it again.
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
select public.quote_start_draft(9201);
update public.itinerary_versions set total_price = 6000, commission_rate = 15 where quote_id = 9201 and status = 'draft';
insert into latest select id from public.itinerary_versions where quote_id = 9201 and status = 'draft';
select public.quote_publish_version((select id from latest));

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';
select throws_ok(
  format('select public.quote_accept(%s)', (select id from latest)),
  'P0001', null, 'another agent cannot accept the proposal');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select lives_ok(
  format('select public.quote_accept(%s)', (select id from latest)),
  'the agent accepts');
select results_eq(
  $$ select total_amount, commission_rate, start_date, end_date, package_id is null from public.bookings where quote_id = 9201 $$,
  $$ values (6000.00::numeric(12, 2), 15.00::numeric(5, 2), '2027-03-08'::date, '2027-03-12'::date, true) $$,
  'the booking takes its money and dates from the server');
select is((select amount from public.commissions c join public.bookings b on b.id = c.booking_id where b.quote_id = 9201), 900.00::numeric, 'the commission follows the accepted version');

select * from finish();
rollback;
