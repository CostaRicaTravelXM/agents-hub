-- pgTAP suite: quotes, option cards, the client link and admin corrections.
--   npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(64);

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000c1', 'one@test.dev', now(), '{"full_name":"Agent One"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c2', 'two@test.dev', now(), '{"full_name":"Agent Two"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c3', 'staff@test.dev', now(), '{"full_name":"Team Member"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c4', 'new@test.dev', now(), '{"full_name":"Not Verified"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c5', 'admin@test.dev', now(), '{"full_name":"The Admin"}', 'authenticated', 'authenticated');
update public.profiles set role = 'content_manager' where id = '00000000-0000-0000-0000-0000000000c3';
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000c5';
insert into public.agent_verifications (user_id, status) values
  ('00000000-0000-0000-0000-0000000000c1', 'approved'),
  ('00000000-0000-0000-0000-0000000000c2', 'approved');
insert into public.customers (id, agent_id, first_name, last_name, email) values
  (9201, '00000000-0000-0000-0000-0000000000c1', 'Client', 'One', 'c1@test.dev'),
  (9202, '00000000-0000-0000-0000-0000000000c2', 'Client', 'Two', 'c2@test.dev');
insert into public.packages (id, name, destination, description, price_per_person, duration_days, commission_rate, image_url) values
  (9201, 'Test package', 'Costa Rica', 'A test.', 1000, 5, 10, '/test.webp');

create temporary table shared (token text) on commit drop;
grant all on shared to authenticated, anon;
create temporary table latest (id bigint) on commit drop;
grant all on latest to authenticated;
create temporary table chosen (id bigint) on commit drop;
grant all on chosen to authenticated;

-- ---------------------------------------------------------------- agent asks
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';

select lives_ok(
  $$ insert into public.quote_requests (id, customer_id, destination, start_date, end_date, travelers, status)
     values (9201, 9201, 'Costa Rica', '2027-03-08', '2027-03-12', 2, 'accepted') $$,
  'an agent can ask for a quote');
select is((select status::text from public.quote_requests where id = 9201), 'requested', 'a new quote always starts as requested');
select lives_ok(
  $$ insert into public.quote_requests (id, customer_id, start_date, end_date, travelers)
     values (9203, 9201, '2027-05-01', '2027-06-30', 2) $$,
  'the destination is optional, and the dates can span months');
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
select is(public.quote_start_draft(9201), (select id from public.quote_proposals where quote_id = 9201), 'opening it again returns the same draft');
select is(
  (select start_date from public.quote_variants v join public.quote_proposals p on p.id = v.proposal_id where p.quote_id = 9201),
  '2027-03-08'::date, 'a new draft starts with one option on the requested dates');
select throws_ok(
  format('select public.quote_send_proposal(%s)', (select id from public.quote_proposals where quote_id = 9201)),
  'P0001', 'option 1 needs a title', 'an empty option cannot be sent');
select throws_ok($$ insert into public.quote_variants (proposal_id) select id from public.quote_proposals where quote_id = 9201 $$, '42501', null, 'options only change through the save function');

select lives_ok(
  format(
    $f$ select public.quote_save_draft(%s, $j$[
      {"title":"Volcano week","startDate":"2027-03-08","endDate":"2027-03-12","summary":"Your trip","totalPrice":5000,"commissionRate":12,
       "files":[{"path":"9201/a.pdf","name":"Volcano.pdf","contentType":"application/pdf","sizeBytes":10}]},
      {"title":"Beach week","startDate":"2027-03-09","endDate":"2027-03-14"}
    ]$j$::jsonb) $f$,
    (select id from public.quote_proposals where quote_id = 9201)),
  'the team saves several options at once, half finished');
select is((select count(*)::int from public.quote_variants v join public.quote_proposals p on p.id = v.proposal_id where p.quote_id = 9201), 2, 'a draft holds as many options as the team adds');
select throws_ok(
  format('select public.quote_send_proposal(%s)', (select id from public.quote_proposals where quote_id = 9201)),
  'P0001', 'option 2 needs a total price', 'nothing goes out until every option is complete');
select is((select status::text from public.quote_requests where id = 9201), 'requested', 'a failed send sends nothing');
select throws_ok(
  format($f$ select public.quote_save_draft(%s, '[]'::jsonb) $f$, (select id from public.quote_proposals where quote_id = 9201)),
  'P0001', 'keep at least one option', 'a draft keeps at least one option');

select public.quote_save_draft(
  (select id from public.quote_proposals where quote_id = 9201),
  (select jsonb_agg(jsonb_build_object(
      'id', v.id, 'title', v.title, 'startDate', v.start_date, 'endDate', v.end_date, 'summary', v.summary,
      'totalPrice', coalesce(v.total_price, 7000), 'commissionRate', coalesce(v.commission_rate, 10),
      'files', case when v.position = 0 then '[{"path":"9201/a.pdf","name":"Volcano.pdf","contentType":"application/pdf"}]'::jsonb else '[]'::jsonb end
    ) order by v.position)
   from public.quote_variants v join public.quote_proposals p on p.id = v.proposal_id where p.quote_id = 9201));

-- A draft stays hidden from the agent.
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select is_empty('select id from public.quote_proposals where quote_id = 9201', 'an agent cannot see a draft');
select is_empty($$ select id from public.quote_variants where title = 'Volcano week' $$, 'an agent cannot see a draft''s options');
select is_empty($$ select id from public.quote_variant_files where name = 'Volcano.pdf' $$, 'an agent cannot see a draft''s files');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
select lives_ok(
  format('select public.quote_send_proposal(%s)', (select id from public.quote_proposals where quote_id = 9201)),
  'the team sends the options together');
select is((select status::text from public.quote_requests where id = 9201), 'proposal_sent', 'the quote waits for the agent');
select throws_ok(
  format($f$ select public.quote_save_draft(%s, '[{"title":"Changed"}]'::jsonb) $f$, (select id from public.quote_proposals where quote_id = 9201)),
  'P0001', 'that draft does not exist', 'a sent proposal cannot be edited');

-- ---------------------------------------------------------------- agent reviews
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select is(
  (select count(*)::int from public.quote_variants v join public.quote_proposals p on p.id = v.proposal_id where p.quote_id = 9201),
  2, 'the agent sees every option');
select is((select name from public.quote_variant_files where path = '9201/a.pdf'), 'Volcano.pdf', 'the agent sees the files');
select throws_ok($$ update public.quote_variants set commission_rate = 99 where title = 'Volcano week' $$, '42501', null, 'an agent cannot set the commission');
select is(
  (select count(*)::int from public.notifications where agent_id = '00000000-0000-0000-0000-0000000000c1' and title = 'Your proposal is ready'),
  1, 'the agent is told the proposal is ready');

insert into shared select public.quote_share_create(9201, false);
reset role;
set local role anon;
select is((select public.get_shared_trip(token) ->> 'destination' from shared), 'Costa Rica', 'the client link works without an account');
select is((select jsonb_array_length(public.get_shared_trip(token) -> 'variants') from shared), 2, 'the client sees every option');
select is((select public.get_shared_trip(token) -> 'variants' -> 0 ->> 'price' from shared), null, 'the price stays hidden unless the agent shows it');
select ok(
  (select public.get_shared_trip(token)::text !~* 'commission|budget|notes' from shared),
  'the client link has no commission, budget or notes');
select is(public.get_shared_trip('not-a-real-token'), null, 'a wrong token returns nothing');
select throws_ok('select * from public.quote_variants', '42501', null, 'without an account the tables stay closed');

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select public.quote_share_update(9201, true, false);
select is((select (public.get_shared_trip(token) -> 'variants' -> 0 ->> 'price')::numeric from shared), 5000.00::numeric, 'the agent can choose to show the price');

insert into chosen select v.id from public.quote_variants v join public.quote_proposals p on p.id = v.proposal_id where p.quote_id = 9201 and v.title = 'Volcano week';
select lives_ok($$ select public.quote_request_changes(9201, 'Add a beach day') $$, 'an agent can ask for changes');
select throws_ok(
  format('select public.quote_accept(%s)', (select id from chosen)),
  'P0001', 'there is no proposal waiting for your review', 'an option under revision cannot be accepted');

-- The team starts from the options last sent, files included, then sends them again.
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
select public.quote_start_draft(9201);
insert into latest select id from public.quote_proposals where quote_id = 9201 and status = 'draft';
select is((select count(*)::int from public.quote_variants where proposal_id = (select id from latest)), 2, 'a new version starts as a copy of the options');
select is(
  (select count(*)::int from public.quote_variant_files f join public.quote_variants v on v.id = f.variant_id where v.proposal_id = (select id from latest)),
  1, 'the copy keeps the files');
select public.quote_save_draft(
  (select id from latest),
  (select jsonb_agg(jsonb_build_object(
      'id', v.id, 'title', v.title, 'startDate', v.start_date, 'endDate', v.end_date,
      'totalPrice', case when v.position = 0 then 6000 else v.total_price end,
      'commissionRate', case when v.position = 0 then 15 else v.commission_rate end
    ) order by v.position)
   from public.quote_variants v where v.proposal_id = (select id from latest)));
select public.quote_send_proposal((select id from latest));

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select throws_ok(
  format('select public.quote_accept(%s)', (select id from chosen)),
  'P0001', 'this option is no longer part of the latest proposal', 'an option from an older version cannot be accepted');
delete from chosen;
insert into chosen select id from public.quote_variants where proposal_id = (select id from latest) and position = 0;

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';
select throws_ok(
  format('select public.quote_accept(%s)', (select id from chosen)),
  'P0001', null, 'another agent cannot accept the option');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select lives_ok(format('select public.quote_accept(%s)', (select id from chosen)), 'the agent accepts one option');
select results_eq(
  $$ select total_amount, commission_rate, start_date, end_date, package_id is null from public.bookings where quote_id = 9201 $$,
  $$ values (6000.00::numeric(12, 2), 15.00::numeric(5, 2), '2027-03-08'::date, '2027-03-12'::date, true) $$,
  'the booking takes its money and dates from the option');
select is((select amount from public.commissions c join public.bookings b on b.id = c.booking_id where b.quote_id = 9201), 900.00::numeric, 'the commission follows the accepted option');
select is((select package_name from public.booking_details where quote_id = 9201), 'Volcano week', 'the booking is named after the option');
select is((select count(*)::int from public.quote_variants where proposal_id = (select id from latest) and accepted_at is not null), 1, 'only the chosen option is marked');

-- ---------------------------------------------------------------- admin
-- Agents and content managers can't reach these.
select throws_ok($$ select public.admin_delete_quote(9201) $$, '42501', null, 'an agent cannot delete a quote');
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
select throws_ok($$ select public.admin_delete_booking(1) $$, '42501', null, 'a content manager cannot delete a booking');
select is_empty('select id from public.bookings where quote_id = 9201', 'a content manager still cannot read other agents'' bookings');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c5","role":"authenticated"}';
select is((select count(*)::int from public.bookings where quote_id = 9201), 1, 'an admin reads every agent''s bookings');
select throws_ok(
  $$ select public.admin_save_quote(9203, '{"customerId":9202,"startDate":"2027-05-01","endDate":"2027-06-30","travelers":2,"status":"requested"}') $$,
  'P0001', 'that client does not belong to this agent', 'an admin cannot move a quote to another agent''s client');
select lives_ok(
  $$ select public.admin_save_quote(9203, '{"customerId":9201,"destination":"Osa","startDate":"2027-05-01","endDate":"2027-05-20","travelers":4,"status":"cancelled"}') $$,
  'an admin can edit any quote');
select is((select destination || travelers::text || status::text from public.quote_requests where id = 9203), 'Osa4cancelled', 'the edit is saved');
select lives_ok(
  $$ select public.admin_save_booking(
       (select id from public.bookings where quote_id = 9201),
       '{"customerId":9201,"startDate":"2027-03-08","endDate":"2027-03-13","travelers":2,"totalAmount":8000,"commissionRate":10,"status":"confirmed"}') $$,
  'an admin can edit any booking');
select is((select amount from public.commissions c join public.bookings b on b.id = c.booking_id where b.quote_id = 9201), 800.00::numeric, 'the commission follows the edit');
select lives_ok($$ select public.admin_delete_booking((select id from public.bookings where quote_id = 9201)) $$, 'an admin can delete a booking');
select is((select status::text from public.quote_requests where id = 9201), 'proposal_sent', 'deleting a quote''s booking reopens the quote');
select lives_ok($$ select public.admin_delete_quote(9203) $$, 'an admin can delete a quote');

select * from finish();
rollback;
