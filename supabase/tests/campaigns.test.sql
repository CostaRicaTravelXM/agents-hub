-- pgTAP suite for public gift campaigns: who can read claims, the Zoho hand-off lease and the rate limiter.
--   npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- ---------------------------------------------------------------- fixtures
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000c1', 'agent@campaign.test', now(), '{"first_name":"Ana","last_name":"Agent","hub_signup":true}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c2', 'staff@campaign.test', now(), '{"first_name":"Sam","last_name":"Staff","hub_signup":true}', 'authenticated', 'authenticated');
update public.profiles set role = 'content_manager' where id = '00000000-0000-0000-0000-0000000000c2';

insert into public.hub_campaign_claims (id, campaign, email, channel, confirmed_at, version) values
  ('00000000-0000-0000-0000-0000000000f1', 'pgtap-campaign', 'new@campaign.test', 'email', now(), 1),
  ('00000000-0000-0000-0000-0000000000f2', 'pgtap-campaign', 'unconfirmed@campaign.test', 'whatsapp', null, 0);

-- ---------------------------------------------------------------- constraints
select throws_ok(
  $$ insert into public.hub_campaign_claims (campaign, email) values ('pgtap-campaign', 'new@campaign.test') $$,
  '23505', null, 'one claim per email and campaign');
select throws_ok(
  $$ insert into public.hub_campaign_claims (campaign, email) values ('pgtap-campaign', 'Upper@Campaign.test') $$,
  '23514', null, 'emails are stored in lower case');
select throws_ok(
  $$ insert into public.hub_campaign_claims (campaign, email, channel) values ('pgtap-campaign', 'x@campaign.test', 'not a slug!') $$,
  '23514', null, 'the channel must be a short slug');

-- ---------------------------------------------------------------- lease
select is(public.claim_hub_campaign_sync('00000000-0000-0000-0000-0000000000f2'), null, 'an unconfirmed claim is never sent');
select is(public.claim_hub_campaign_sync('00000000-0000-0000-0000-0000000000f1'), 1, 'the first caller takes the lease and learns the version');
select is(public.claim_hub_campaign_sync('00000000-0000-0000-0000-0000000000f1'), null, 'a second caller inside the lease is refused');
update public.hub_campaign_claims set sync_claimed_at = null, last_error = 'Zoho was down' where id = '00000000-0000-0000-0000-0000000000f1';
select is(public.claim_hub_campaign_sync('00000000-0000-0000-0000-0000000000f1'), 1, 'a failed send can be retried');
update public.hub_campaign_claims set synced_version = 1, sync_claimed_at = null where id = '00000000-0000-0000-0000-0000000000f1';
select is(public.claim_hub_campaign_sync('00000000-0000-0000-0000-0000000000f1'), null, 'once sent, nothing is waiting');
update public.hub_campaign_claims set version = 2, kit_downloaded_at = now() where id = '00000000-0000-0000-0000-0000000000f1';
select is(public.claim_hub_campaign_sync('00000000-0000-0000-0000-0000000000f1'), 2, 'a later change (kit downloaded) is sent again');
update public.hub_campaign_claims set sync_claimed_at = null, sync_attempts = 10 where id = '00000000-0000-0000-0000-0000000000f1';
select is(public.claim_hub_campaign_sync('00000000-0000-0000-0000-0000000000f1'), null, 'it gives up after ten failed tries');

-- ---------------------------------------------------------------- rate limiter
select ok(public.hub_rate_allow('pgtap', 'k1', 2, 3600), 'the first hit is allowed');
select ok(public.hub_rate_allow('pgtap', 'k1', 2, 3600), 'the second hit is allowed');
select ok(not public.hub_rate_allow('pgtap', 'k1', 2, 3600), 'the third hit inside the window is refused');
select ok(public.hub_rate_allow('pgtap', 'k2', 2, 3600), 'another key has its own allowance');

-- ---------------------------------------------------------------- access
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select is((select count(*)::int from public.hub_campaign_claims), 0, 'an agent cannot read gift claims');
select throws_ok(
  $$ select public.hub_rate_allow('pgtap', 'k3', 2, 3600) $$,
  '42501', null, 'an agent cannot call the rate limiter');
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';
select is((select count(*)::int from public.hub_campaign_claims where campaign = 'pgtap-campaign'), 2, 'staff can read gift claims');

-- ---------------------------------------------------------------- Hub invite
select has_column('public', 'hub_campaign_claims', 'hub_invited_at', 'a claim records when its Hub invite was sent');
select has_column('public', 'hub_campaign_claims', 'hub_invite_error', 'and why the last try failed');
select has_column('public', 'hub_campaign_claims', 'hub_member_emailed_at', 'and when an advisor with an account was emailed instead');

select * from finish();
rollback;
