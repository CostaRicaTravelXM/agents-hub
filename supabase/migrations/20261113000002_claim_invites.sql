-- Gift claims also invite the advisor to the Hub by email.
-- hub_invited_at: when the sign-in link was sent. hub_invite_error: why the last try failed, for retries.
alter table public.hub_campaign_claims
  add column hub_invited_at timestamptz,
  add column hub_invite_error text;
