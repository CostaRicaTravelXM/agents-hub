-- TravelXM Agent Portal · access control
-- Catalogue (packages, reviews): readable by every signed-in user, written by
-- staff only. Agent-owned records: an agent sees and edits only their own rows;
-- staff (admin, content_manager) can read everything for support.
-- Helpers is_staff()/is_admin() come from 20260924000002_access.sql.

alter table public.packages enable row level security;
alter table public.package_reviews enable row level security;
alter table public.customers enable row level security;
alter table public.bookings enable row level security;
alter table public.commissions enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.support_tickets enable row level security;
alter table public.crm_sync_records enable row level security;
alter table public.activity_events enable row level security;
alter table public.notifications enable row level security;

-- ---------------------------------------------------------------- catalogue
create policy packages_read on public.packages
  for select to authenticated using (is_active or public.is_staff());
create policy packages_write on public.packages
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy package_reviews_read on public.package_reviews
  for select to authenticated using (true);
create policy package_reviews_write on public.package_reviews
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------- agent-owned
create policy customers_read on public.customers
  for select to authenticated using (agent_id = auth.uid() or public.is_staff());
create policy customers_insert on public.customers
  for insert to authenticated with check (agent_id = auth.uid());
create policy customers_update on public.customers
  for update to authenticated using (agent_id = auth.uid()) with check (agent_id = auth.uid());
create policy customers_delete on public.customers
  for delete to authenticated using (agent_id = auth.uid());

create policy bookings_read on public.bookings
  for select to authenticated using (agent_id = auth.uid() or public.is_staff());
create policy bookings_insert on public.bookings
  for insert to authenticated with check (
    agent_id = auth.uid()
    and exists (select 1 from public.customers c where c.id = customer_id and c.agent_id = auth.uid())
  );
create policy bookings_update on public.bookings
  for update to authenticated using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- Commissions are written by the booking trigger only.
create policy commissions_read on public.commissions
  for select to authenticated using (agent_id = auth.uid() or public.is_staff());

create policy payment_transactions_read on public.payment_transactions
  for select to authenticated using (agent_id = auth.uid() or public.is_staff());
create policy payment_transactions_insert on public.payment_transactions
  for insert to authenticated with check (agent_id = auth.uid());

create policy support_tickets_read on public.support_tickets
  for select to authenticated using (agent_id = auth.uid() or public.is_staff());
create policy support_tickets_insert on public.support_tickets
  for insert to authenticated with check (agent_id = auth.uid());
create policy support_tickets_update on public.support_tickets
  for update to authenticated using (agent_id = auth.uid() or public.is_staff())
  with check (agent_id = auth.uid() or public.is_staff());

create policy crm_sync_records_read on public.crm_sync_records
  for select to authenticated using (agent_id = auth.uid() or public.is_staff());

create policy activity_events_read on public.activity_events
  for select to authenticated using (agent_id = auth.uid());

create policy notifications_read on public.notifications
  for select to authenticated using (agent_id = auth.uid());
create policy notifications_update on public.notifications
  for update to authenticated using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- Portal tables are reached through PostgREST as `authenticated` only.
revoke all on
  public.packages, public.package_reviews, public.customers, public.bookings, public.commissions,
  public.payment_transactions, public.support_tickets, public.crm_sync_records,
  public.activity_events, public.notifications, public.customer_stats, public.booking_details
from anon;
