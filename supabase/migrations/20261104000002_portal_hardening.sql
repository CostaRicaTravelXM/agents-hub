-- Money is decided by the server. Until now the policies only checked who owned a
-- row, so an agent calling the API directly could set their own total and rate.

-- Prices a booking from its package when a signed-in agent creates it. Security
-- definer callers (seeds, future RPCs) run as another role and keep their values.
create or replace function public.portal_price_booking()
returns trigger language plpgsql set search_path = public as $$
declare
  v_price numeric;
  v_rate numeric;
  v_days int;
begin
  if current_user <> 'authenticated' then return new; end if;
  if not public.is_verified_agent() then
    raise exception 'agent is not verified' using errcode = '42501';
  end if;

  select p.price_per_person, p.commission_rate, p.duration_days into v_price, v_rate, v_days
  from public.packages p
  where p.id = new.package_id and p.is_active;
  if not found then
    raise exception 'that package is no longer available' using errcode = 'P0001';
  end if;

  new.total_amount := v_price * new.travelers;
  new.commission_rate := v_rate;
  new.end_date := new.start_date + (v_days - 1);
  new.status := 'pending';
  new.booked_at := now();
  return new;
end $$;

create trigger bookings_price before insert on public.bookings
  for each row execute function public.portal_price_booking();

-- After booking, an agent only moves the status and edits notes.
revoke update on public.bookings from authenticated;
grant update (status, notes) on public.bookings to authenticated;

-- A new payment record can only start unpaid.
drop policy payment_transactions_insert on public.payment_transactions;
create policy payment_transactions_insert on public.payment_transactions
  for insert to authenticated with check (
    agent_id = auth.uid()
    and public.is_verified_agent()
    and status = 'requires_payment_method'
  );

-- Other agents' money is for admins, not for content managers.
drop policy bookings_read on public.bookings;
create policy bookings_read on public.bookings
  for select to authenticated using ((agent_id = auth.uid() and public.is_verified_agent()) or public.is_admin());

drop policy commissions_read on public.commissions;
create policy commissions_read on public.commissions
  for select to authenticated using ((agent_id = auth.uid() and public.is_verified_agent()) or public.is_admin());

drop policy payment_transactions_read on public.payment_transactions;
create policy payment_transactions_read on public.payment_transactions
  for select to authenticated using ((agent_id = auth.uid() and public.is_verified_agent()) or public.is_admin());
