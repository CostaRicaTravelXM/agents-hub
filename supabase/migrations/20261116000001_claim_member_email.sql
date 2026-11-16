-- Advisors who already have a Hub account get a sign-in email with the gift
-- wording instead of an invite. hub_member_emailed_at: when it was sent.
alter table public.hub_campaign_claims
  add column hub_member_emailed_at timestamptz;
