-- pgTAP suite: agents cannot set their own money.
--   npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000b1', 'seller@test.dev', now(), '{"full_name":"Sue Seller"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b2', 'content@test.dev', now(), '{"full_name":"Cam Content"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b3', 'boss@test.dev', now(), '{"full_name":"Ada Admin"}', 'authenticated', 'authenticated');
update public.profiles set role = 'content_manager' where id = '00000000-0000-0000-0000-0000000000b2';
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000b3';
insert into public.agent_verifications (user_id, status) values ('00000000-0000-0000-0000-0000000000b1', 'approved');
insert into public.packages (id, name, destination, description, price_per_person, duration_days, commission_rate, image_url, is_active) values
  (9101, 'Priced package', 'Costa Rica', 'A package', 1000, 5, 10, 'https://example.test/p.jpg', true),
  (9102, 'Retired package', 'Costa Rica', 'A package', 1000, 5, 10, 'https://example.test/p.jpg', false);
insert into public.customers (id, agent_id, first_name, last_name, email)
values (9101, '00000000-0000-0000-0000-0000000000b1', 'Client', 'One', 'client@test.dev');

-- ---------------------------------------------------------------- agent
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';

select lives_ok(
  $$ insert into public.bookings (id, customer_id, package_id, start_date, end_date, travelers, total_amount, commission_rate, status)
     values (9101, 9101, 9101, '2027-01-10', '2027-12-31', 2, 1, 99, 'completed') $$,
  'a booking with made-up money is accepted, then repriced');
select is((select total_amount from public.bookings where id = 9101), 2000.00::numeric, 'total comes from the package');
select is((select commission_rate from public.bookings where id = 9101), 10.00::numeric, 'rate comes from the package');
select is((select end_date from public.bookings where id = 9101), '2027-01-14'::date, 'end date comes from the package');
select is((select status::text from public.bookings where id = 9101), 'pending', 'new bookings start pending');
select is((select amount from public.commissions where booking_id = 9101), 200.00::numeric, 'commission follows the server total');

select throws_ok(
  $$ update public.bookings set commission_rate = 99 where id = 9101 $$,
  '42501', null, 'an agent cannot change the rate later');
select lives_ok($$ update public.bookings set status = 'confirmed' where id = 9101 $$, 'an agent can still move the status');
select throws_ok(
  $$ insert into public.bookings (customer_id, package_id, start_date, end_date, travelers, total_amount, commission_rate)
     values (9101, 9102, '2027-01-10', '2027-01-14', 2, 1, 1) $$,
  'P0001', null, 'a retired package cannot be booked');
select throws_ok(
  $$ insert into public.payment_transactions (amount_cents, description, customer_email, status)
     values (100, 'Fake', 'a@b.dev', 'succeeded') $$,
  '42501', null, 'an agent cannot record a paid payment');

-- ---------------------------------------------------------------- staff
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select is_empty('select id from public.commissions where booking_id = 9101', 'a content manager cannot see other agents'' commissions');

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000b3","role":"authenticated"}';
select isnt_empty('select id from public.bookings where id = 9101', 'an admin can see other agents'' bookings');

select * from finish();
rollback;
