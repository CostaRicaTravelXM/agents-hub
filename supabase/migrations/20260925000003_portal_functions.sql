-- TravelXM Agent Portal · dashboard aggregates and demo data
-- Every aggregate is SECURITY INVOKER and scoped to auth.uid(), so RLS and the
-- explicit agent filter both apply: staff see their own numbers here, not the
-- whole agency's.

-- Percentage change, null when there is no baseline to compare against.
create or replace function public.portal_pct_change(p_current numeric, p_previous numeric)
returns numeric language sql immutable as $$
  select case when coalesce(p_previous, 0) = 0 then null
              else round((p_current - p_previous) / p_previous * 100, 1) end;
$$;

-- ---------------------------------------------------------------- dashboard
create or replace function public.portal_dashboard()
returns jsonb language sql stable security invoker set search_path = public as $$
  with b as (
    select * from public.bookings where agent_id = auth.uid()
  ), live as (
    select * from b where status <> 'cancelled'
  ), com as (
    select c.* from public.commissions c join live on live.id = c.booking_id
  ), cust as (
    select * from public.customers where agent_id = auth.uid()
  ), months as (
    select generate_series(
      date_trunc('month', current_date) - interval '7 months',
      date_trunc('month', current_date),
      interval '1 month'
    )::date as m
  ), monthly as (
    select
      m,
      (select coalesce(sum(total_amount), 0) from live where date_trunc('month', booked_at)::date = m) as revenue,
      (select count(*) from live where date_trunc('month', booked_at)::date = m) as bookings,
      (select coalesce(sum(amount), 0) from com where date_trunc('month', earned_at)::date = m) as commissions,
      (select count(*) from cust where created_at < m + interval '1 month') as customers
    from months
  ), windows as (
    select
      (select coalesce(sum(total_amount), 0) from live where booked_at >= now() - interval '30 days') as rev_now,
      (select coalesce(sum(total_amount), 0) from live where booked_at >= now() - interval '60 days' and booked_at < now() - interval '30 days') as rev_prev,
      (select count(*) from live where booked_at >= now() - interval '30 days') as bk_now,
      (select count(*) from live where booked_at >= now() - interval '60 days' and booked_at < now() - interval '30 days') as bk_prev,
      (select coalesce(sum(amount), 0) from com where earned_at >= current_date - 30) as com_now,
      (select coalesce(sum(amount), 0) from com where earned_at >= current_date - 60 and earned_at < current_date - 30) as com_prev,
      (select count(*) from cust where created_at >= now() - interval '30 days') as cu_new,
      (select count(*) from cust where created_at < now() - interval '30 days') as cu_before
  )
  select jsonb_build_object(
    'totalRevenue', (select coalesce(sum(total_amount), 0) from live),
    'activeBookings', (select count(*) from b where status in ('pending', 'confirmed', 'active', 'traveling')),
    'totalCommissions', (select coalesce(sum(amount), 0) from com),
    'totalCustomers', (select count(*) from cust),
    'earningsThisMonth', (select coalesce(sum(amount), 0) from com where earned_at >= date_trunc('month', current_date)),
    'trends', jsonb_build_object(
      'revenue', public.portal_pct_change(w.rev_now, w.rev_prev),
      'bookings', public.portal_pct_change(w.bk_now, w.bk_prev),
      'commissions', public.portal_pct_change(w.com_now, w.com_prev),
      'customers', public.portal_pct_change(w.cu_new + w.cu_before, w.cu_before),
      'newCustomers', w.cu_new
    ),
    'sparklines', jsonb_build_object(
      'revenue', (select jsonb_agg(revenue order by m) from monthly),
      'bookings', (select jsonb_agg(bookings order by m) from monthly),
      'commissions', (select jsonb_agg(commissions order by m) from monthly),
      'customers', (select jsonb_agg(customers order by m) from monthly)
    )
  )
  from windows w;
$$;

-- Revenue buckets for the dashboard chart:
-- 7D and 30D are daily, 90D is weekly (weeks start Monday), 1Y is monthly.
create or replace function public.portal_revenue_series(p_range text)
returns table (bucket_start date, bucket_end date, revenue numeric, bookings int)
language sql stable security invoker set search_path = public as $$
  with cfg as (
    select
      case p_range when '7D' then 'day' when '30D' then 'day' when '90D' then 'week' else 'month' end as unit,
      case p_range when '7D' then 7 when '30D' then 30 when '90D' then 13 else 12 end as n
  ), buckets as (
    select (date_trunc(cfg.unit, current_date::timestamp) - (g || ' ' || cfg.unit)::interval)::date as s, cfg.unit
    from cfg, generate_series(0, cfg.n - 1) as g
  )
  select
    k.s,
    (k.s + ('1 ' || k.unit)::interval - interval '1 day')::date,
    coalesce(sum(b.total_amount), 0),
    count(b.id)::int
  from buckets k
  left join public.bookings b
    on b.agent_id = auth.uid()
   and b.status <> 'cancelled'
   and b.booked_at >= k.s
   and b.booked_at < k.s + ('1 ' || k.unit)::interval
  group by k.s, k.unit
  order by k.s;
$$;

-- Cumulative pipeline: a customer at "quoted" has also been a lead and an inquiry.
create or replace function public.portal_booking_funnel()
returns table (stage public.customer_stage, value int)
language sql stable security invoker set search_path = public as $$
  select s.stage, (
    select count(*) from public.customers c where c.agent_id = auth.uid() and c.stage >= s.stage
  )::int
  from unnest(enum_range(null::public.customer_stage)) as s (stage)
  order by s.stage;
$$;

-- Tier from trailing-12-month commission: Silver 10k, Gold 40k, Platinum 100k.
create or replace function public.portal_agent_standing()
returns jsonb language sql stable security invoker set search_path = public as $$
  with earned as (
    select coalesce(sum(c.amount), 0) as v
    from public.commissions c
    join public.bookings b on b.id = c.booking_id
    where c.agent_id = auth.uid() and b.status <> 'cancelled' and c.earned_at > current_date - 365
  ), t as (
    select
      v,
      case when v >= 100000 then 'Platinum' when v >= 40000 then 'Gold' when v >= 10000 then 'Silver' else 'Bronze' end as tier,
      case when v >= 100000 then null when v >= 40000 then 100000 when v >= 10000 then 40000 else 10000 end as next_at,
      case when v >= 100000 then 100000 when v >= 40000 then 40000 when v >= 10000 then 10000 else 0 end as floor_at
    from earned
  )
  select jsonb_build_object(
    'tier', tier,
    'nextTier', case tier when 'Bronze' then 'Silver' when 'Silver' then 'Gold' when 'Gold' then 'Platinum' end,
    'earned12m', v,
    'amountToNext', case when next_at is null then 0 else next_at - v end,
    'progressPct', case when next_at is null then 100 else floor((v - floor_at) / (next_at - floor_at) * 100) end
  )
  from t;
$$;

create or replace function public.portal_commission_analytics()
returns jsonb language sql stable security invoker set search_path = public as $$
  with com as (
    select c.* from public.commissions c
    join public.bookings b on b.id = c.booking_id
    where c.agent_id = auth.uid() and b.status <> 'cancelled'
  ), months as (
    select generate_series(
      date_trunc('month', current_date) - interval '5 months',
      date_trunc('month', current_date),
      interval '1 month'
    )::date as m
  )
  select jsonb_build_object(
    'totalEarned', (select coalesce(sum(amount), 0) from com),
    'pendingAmount', (select coalesce(sum(amount), 0) from com where status = 'pending'),
    'thisMonth', (select coalesce(sum(amount), 0) from com where earned_at >= date_trunc('month', current_date)),
    -- Payouts run on the 21st of each month.
    'nextPayoutDate', (
      case when extract(day from current_date) < 21
           then date_trunc('month', current_date)::date + 20
           else (date_trunc('month', current_date) + interval '1 month')::date + 20 end
    ),
    'monthlyBreakdown', (
      select jsonb_agg(jsonb_build_object(
        'month', to_char(m, 'Mon'),
        'amount', (select coalesce(sum(amount), 0) from com where date_trunc('month', earned_at)::date = m)
      ) order by m)
      from months
    )
  );
$$;

create or replace function public.portal_payments_dashboard()
returns jsonb language sql stable security invoker set search_path = public as $$
  with t as (select * from public.payment_transactions where agent_id = auth.uid())
  select jsonb_build_object(
    'availableBalance', (select coalesce(sum(amount_cents), 0) from t where status = 'succeeded' and created_at >= now() - interval '30 days'),
    'pendingBalance', (select coalesce(sum(amount_cents), 0) from t where status in ('processing', 'requires_action', 'requires_confirmation')),
    'currency', 'usd',
    'totalCollected', (select coalesce(sum(amount_cents), 0) from t where status = 'succeeded'),
    'successfulPayments', (select count(*) from t where status = 'succeeded'),
    'failedPayments', (select count(*) from t where status in ('canceled', 'requires_payment_method')),
    'pendingPayments', (select count(*) from t where status in ('processing', 'requires_action', 'requires_confirmation'))
  );
$$;

-- ---------------------------------------------------------------- demo data
-- Loads a realistic book of business for one agent: the eight named clients
-- and nine bookings the portal was designed around, plus a year of generated
-- history so every chart range has data. Dates are relative to today.
-- Idempotent (skips agents who already have customers). Service role, the
-- postgres superuser (SQL console) or an Academy admin only.
create or replace function public.portal_seed_demo(p_agent uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  shift int := current_date - date '2026-08-14';
  first_names text[] := array['Olivia','Liam','Ava','Noah','Mia','Lucas','Isla','Mateo','Zoe','Ethan',
                              'Chloe','Leo','Nora','Hugo','Elena','Omar','Hana','Felix','Lucia','Arjun'];
  last_names text[] := array['Bennett','Nakamura','Silva','Fischer','Laurent','Novak','Reyes','Haddad',
                              'Kowalski','Andersen','Moreau','Costa','Duarte','Ivanova','Brennan','Osei',
                              'Tanaka','Weber','Lindqvist','Varga'];
  named bigint[];            -- ids of the eight named customers, in design order
  gen bigint[] := '{}';      -- generated customers who get bookings
  v_id bigint;
  v_booking bigint;
  v_pkg record;
  v_h int;
  v_booked timestamptz;
  v_start date;
  v_status public.booking_status;
  v_travelers int;
  b1041 bigint; b1040 bigint; b1039 bigint; b1038 bigint; b1037 bigint;
  b1036 bigint; b1035 bigint; b1034 bigint; b1033 bigint;
  i int;
  d int;
begin
  if not (coalesce(auth.role(), '') = 'service_role' or session_user = 'postgres' or public.is_admin()) then
    raise exception 'portal_seed_demo is restricted to administrators';
  end if;
  if not exists (select 1 from public.profiles where id = p_agent) then
    raise exception 'No profile for %', p_agent;
  end if;
  if exists (select 1 from public.customers where agent_id = p_agent) then
    return;
  end if;

  -- ---------------------------------------------------------- generated history
  for i in 1..60 loop
    insert into public.customers (agent_id, first_name, last_name, email, country, stage, created_at)
    values (
      p_agent,
      first_names[1 + (i * 7) % 20],
      last_names[1 + (i * 13) % 20],
      lower(first_names[1 + (i * 7) % 20] || '.' || last_names[1 + (i * 13) % 20]) || i || '@example.com',
      (array['United States','Canada','United Kingdom','Germany','Mexico','Spain','Australia','Brazil'])[1 + i % 8],
      case when i % 10 < 3 then 'lead' when i % 10 < 5 then 'inquiry' when i % 10 < 7 then 'quoted' else 'booked' end::public.customer_stage,
      now() - ((400 - i * 6) || ' days')::interval
    )
    returning id into v_id;
    if i % 10 >= 7 then
      gen := gen || v_id;
    end if;
  end loop;

  for d in reverse 365..2 loop
    v_h := abs(hashtext(p_agent::text || ':' || d));
    -- Booking probability climbs from ~14% a year ago to ~40% today: a growing book.
    continue when v_h % 100 >= 14 + 26 * (365 - d) / 365;
    select * into v_pkg from public.packages where is_active order by id offset (v_h / 100) % 10 limit 1;
    continue when not found;
    v_travelers := 1 + (v_h / 1000) % 3;
    v_booked := date_trunc('day', now()) - (d || ' days')::interval + ((9 + (v_h / 7) % 9) || ' hours')::interval;
    v_start := v_booked::date + 20 + (v_h / 13) % 90;
    v_status := case
      when (v_h / 17) % 17 = 0 then 'cancelled'
      when v_start + v_pkg.duration_days - 1 < current_date then 'completed'
      when v_start <= current_date then 'traveling'
      when (v_h / 19) % 4 = 0 then 'pending'
      else 'confirmed' end;
    insert into public.bookings (agent_id, customer_id, package_id, start_date, end_date, travelers,
                                 total_amount, commission_rate, status, booked_at, created_at)
    values (p_agent, gen[1 + (v_h / 23) % array_length(gen, 1)], v_pkg.id, v_start,
            v_start + v_pkg.duration_days - 1, v_travelers, v_pkg.price_per_person * v_travelers,
            v_pkg.commission_rate, v_status, v_booked, v_booked)
    returning id into v_booking;
    if v_status <> 'cancelled' and v_booked < now() - interval '3 days' then
      insert into public.payment_transactions (agent_id, booking_id, amount_cents, status, description, customer_email, created_at)
      select p_agent, v_booking, (v_pkg.price_per_person * v_travelers * 100)::bigint, 'succeeded',
             v_pkg.name || ' — booking #' || v_booking, c.email, v_booked + interval '2 days'
      from public.customers c where c.id = gen[1 + (v_h / 23) % array_length(gen, 1)];
    end if;
  end loop;

  update public.customers c set stage = 'traveled'
  where c.agent_id = p_agent
    and exists (select 1 from public.bookings b where b.customer_id = c.id and b.status = 'completed');

  -- ---------------------------------------------------------- named clients
  with rows (ord, first_name, last_name, email, phone, country, notes, stage, created_at) as (
    values
      (1, 'Priya', 'Sharma', 'priya.sharma@example.com', '+91 98200 12345', 'India', 'Prefers beach destinations. Vegetarian meals. Anniversary in November.', 'booked', '2024-03-12T09:30:00Z'),
      (2, 'James', 'Whitfield', 'james.whitfield@example.com', '+44 7700 900123', 'United Kingdom', 'Frequent honeymoon referrer — owns a wedding planning studio.', 'booked', '2023-11-02T14:15:00Z'),
      (3, 'Aisha', 'Khan', 'aisha.khan@example.com', '+971 50 123 4567', 'UAE', null, 'traveled', '2024-06-21T11:00:00Z'),
      (4, 'Marco', 'Rossi', 'marco.rossi@example.com', '+39 320 555 0100', 'Italy', 'Adventure traveler. Asks for detailed day-by-day itineraries.', 'booked', '2024-01-18T16:45:00Z'),
      (5, 'Emily', 'Chen', 'emily.chen@example.com', '+1 415 555 0132', 'United States', null, 'traveled', '2025-02-05T10:20:00Z'),
      (6, 'Rahul', 'Mehta', 'rahul.mehta@example.com', '+91 99870 45678', 'India', 'Travels with extended family — needs connecting rooms.', 'booked', '2023-08-30T08:05:00Z'),
      (7, 'Sofia', 'Almeida', 'sofia.almeida@example.com', '+351 912 345 678', 'Portugal', null, 'booked', '2024-09-14T13:40:00Z'),
      (8, 'Daniel', 'Okafor', 'daniel.okafor@example.com', '+234 803 555 0190', 'Nigeria', 'Interested in safari packages for a company retreat.', 'booked', '2025-04-22T15:10:00Z')
  ), ins as (
    insert into public.customers (agent_id, first_name, last_name, email, phone, country, notes, stage, created_at)
    select p_agent, first_name, last_name, email, phone, country, notes, stage::public.customer_stage, created_at::timestamptz
    from rows order by ord
    returning id, email
  )
  select array_agg(ins.id order by r.ord) into named from ins join rows r on r.email = ins.email;

  -- The nine design bookings, shifted so "today" in the design is today.
  insert into public.bookings (agent_id, customer_id, package_id, start_date, end_date, travelers, total_amount, commission_rate, status, booked_at)
  values (p_agent, named[1], 9, date '2026-05-03' + shift, date '2026-05-11' + shift, 3, 6450, 11, 'cancelled', timestamptz '2026-04-20T10:00:00Z' + shift * interval '1 day')
  returning id into b1033;
  insert into public.bookings (agent_id, customer_id, package_id, start_date, end_date, travelers, total_amount, commission_rate, status, booked_at)
  values (p_agent, named[5], 2, date '2026-06-10' + shift, date '2026-06-15' + shift, 1, 5350, 15, 'completed', timestamptz '2026-05-28T12:00:00Z' + shift * interval '1 day')
  returning id into b1035;
  insert into public.bookings (agent_id, customer_id, package_id, start_date, end_date, travelers, total_amount, commission_rate, status, booked_at)
  values (p_agent, named[3], 6, date '2026-07-02' + shift, date '2026-07-07' + shift, 2, 5780, 12, 'completed', timestamptz '2026-06-20T09:00:00Z' + shift * interval '1 day')
  returning id into b1037;
  insert into public.bookings (agent_id, customer_id, package_id, start_date, end_date, travelers, total_amount, commission_rate, status, booked_at)
  values (p_agent, named[4], 3, date '2026-09-18' + shift, date '2026-09-27' + shift, 2, 7800, 10, 'confirmed', timestamptz '2026-07-27T09:40:00Z' + shift * interval '1 day')
  returning id into b1038;
  insert into public.bookings (agent_id, customer_id, package_id, start_date, end_date, travelers, total_amount, commission_rate, status, booked_at)
  values (p_agent, named[7], 4, date '2026-08-15' + shift, date '2026-08-23' + shift, 2, 6400, 11, 'traveling', timestamptz '2026-07-30T08:20:00Z' + shift * interval '1 day')
  returning id into b1034;
  insert into public.bookings (agent_id, customer_id, package_id, start_date, end_date, travelers, total_amount, commission_rate, status, booked_at)
  values (p_agent, named[1], 1, date '2026-08-22' + shift, date '2026-08-29' + shift, 2, 4900, 12, 'active', timestamptz '2026-08-05T12:00:00Z' + shift * interval '1 day')
  returning id into b1040;
  insert into public.bookings (agent_id, customer_id, package_id, start_date, end_date, travelers, total_amount, commission_rate, status, booked_at)
  values (p_agent, named[8], 7, date '2026-11-06' + shift, date '2026-11-13' + shift, 1, 4750, 14, 'pending', timestamptz '2026-08-12T18:30:00Z' + shift * interval '1 day')
  returning id into b1036;
  insert into public.bookings (agent_id, customer_id, package_id, start_date, end_date, travelers, total_amount, commission_rate, status, booked_at)
  values (p_agent, named[6], 5, date '2026-10-12' + shift, date '2026-10-18' + shift, 5, 20500, 13, 'pending', timestamptz '2026-08-13T11:10:00Z' + shift * interval '1 day')
  returning id into b1039;
  insert into public.bookings (agent_id, customer_id, package_id, start_date, end_date, travelers, total_amount, commission_rate, status, booked_at)
  values (p_agent, named[2], 2, date '2026-09-04' + shift, date '2026-09-09' + shift, 2, 10700, 15, 'confirmed', timestamptz '2026-08-13T16:40:00Z' + shift * interval '1 day')
  returning id into b1041;

  -- Commission status follows the booking: paid once travelled, earned once
  -- confirmed for a week, pending otherwise.
  update public.commissions c
     set status = case
       when b.status = 'completed' then 'paid'
       when b.status in ('confirmed', 'active', 'traveling') and b.booked_at < now() - interval '7 days' then 'earned'
       else 'pending' end::public.commission_status
    from public.bookings b
   where b.id = c.booking_id and c.agent_id = p_agent;

  insert into public.payment_transactions (id, agent_id, booking_id, amount_cents, status, description, customer_email, created_at)
  values
    ('pi_demo_' || b1041, p_agent, b1041, 1070000, 'succeeded', 'Papagayo Honeymoon Escape — booking #' || b1041, 'james.whitfield@example.com', timestamptz '2026-08-13T16:40:00Z' + shift * interval '1 day'),
    ('pi_demo_' || b1040, p_agent, b1040, 490000, 'succeeded', 'Arenal & Manuel Antonio Classic — booking #' || b1040, 'priya.sharma@example.com', timestamptz '2026-08-05T12:10:00Z' + shift * interval '1 day'),
    ('pi_demo_' || b1039, p_agent, b1039, 2050000, 'requires_action', 'Guanacaste Luxury Week — booking #' || b1039, 'rahul.mehta@example.com', timestamptz '2026-08-13T11:12:00Z' + shift * interval '1 day'),
    ('pi_demo_' || b1038, p_agent, b1038, 780000, 'succeeded', 'Volcanoes, Cloud Forest & Coast — booking #' || b1038, 'marco.rossi@example.com', timestamptz '2026-07-27T09:45:00Z' + shift * interval '1 day'),
    ('pi_demo_' || b1036, p_agent, b1036, 475000, 'processing', 'Osa Peninsula Wildlife Expedition — booking #' || b1036, 'daniel.okafor@example.com', timestamptz '2026-08-12T19:02:00Z' + shift * interval '1 day'),
    ('pi_demo_' || b1034, p_agent, b1034, 640000, 'succeeded', 'Central Valley Culture & Coffee — booking #' || b1034, 'sofia.almeida@example.com', timestamptz '2026-07-30T08:25:00Z' + shift * interval '1 day'),
    ('pi_demo_' || b1033, p_agent, b1033, 645000, 'requires_payment_method', 'Costa Rica Rainforest Trail — booking #' || b1033, 'priya.sharma@example.com', timestamptz '2026-05-01T15:35:00Z' + shift * interval '1 day');

  insert into public.support_tickets (agent_id, subject, message, priority, category, status, created_at)
  values
    (p_agent, 'Cannot upload passport scans', 'The upload spinner runs forever on the customer profile page. Tried Chrome and Safari.', 'low', 'technical', 'closed', timestamptz '2026-07-28T17:50:00Z' + shift * interval '1 day'),
    (p_agent, 'Commission rate on featured packages', 'The Papagayo package shows 15% but my statement calculated 12%. Which rate applies for Gold tier?', 'medium', 'payment', 'resolved', timestamptz '2026-08-04T09:15:00Z' + shift * interval '1 day'),
    (p_agent, 'Add a second traveler to booking #' || b1036, 'My client wants to bring a colleague on the Osa expedition. How do I add a traveler and re-quote without cancelling?', 'medium', 'booking', 'open', timestamptz '2026-08-09T14:05:00Z' + shift * interval '1 day'),
    (p_agent, 'Payment link expired before customer paid', 'I generated a payment link for booking #' || b1039 || ' but my client says it had expired when they opened it two days later. Can links be extended?', 'high', 'payment', 'in_progress', timestamptz '2026-08-11T10:30:00Z' + shift * interval '1 day');

  insert into public.crm_sync_records (agent_id, entity_type, portal_id, crm_id, sync_status, last_synced_at)
  select p_agent, 'customer', named[k], case when k = 8 then '' else 'zcrm_48765432100' || lpad(k::text, 2, '0') end,
         case when k = 8 then 'failed' else 'synced' end::public.crm_sync_status,
         now() - ((k / 3) || ' days')::interval
  from generate_series(1, 8) as k;
  insert into public.crm_sync_records (agent_id, entity_type, portal_id, crm_id, sync_status, last_synced_at)
  values
    (p_agent, 'booking', b1041, 'zcrm_deal_990001', 'synced', timestamptz '2026-08-13T16:46:00Z' + shift * interval '1 day'),
    (p_agent, 'booking', b1040, 'zcrm_deal_990002', 'synced', timestamptz '2026-08-05T12:15:00Z' + shift * interval '1 day'),
    (p_agent, 'booking', b1039, 'zcrm_deal_990003', 'pending', timestamptz '2026-08-13T11:20:00Z' + shift * interval '1 day'),
    (p_agent, 'booking', b1038, 'zcrm_deal_990004', 'synced', timestamptz '2026-07-27T09:50:00Z' + shift * interval '1 day'),
    (p_agent, 'booking', b1037, 'zcrm_deal_990005', 'synced', timestamptz '2026-07-10T08:30:00Z' + shift * interval '1 day'),
    (p_agent, 'booking', b1036, 'zcrm_deal_990006', 'synced', timestamptz '2026-08-12T19:05:00Z' + shift * interval '1 day'),
    (p_agent, 'booking', b1035, 'zcrm_deal_990007', 'synced', timestamptz '2026-06-18T14:00:00Z' + shift * interval '1 day');

  insert into public.activity_events (agent_id, description, customer_name, amount, created_at)
  values
    (p_agent, 'Payment link opened by customer', 'Rahul Mehta', null, timestamptz '2026-08-13T11:15:00Z' + shift * interval '1 day'),
    (p_agent, 'Itinerary sent for Volcanoes, Cloud Forest & Coast', 'Marco Rossi', null, timestamptz '2026-08-11T15:20:00Z' + shift * interval '1 day'),
    (p_agent, 'Support ticket resolved — seat upgrade request', 'Sofia Almeida', null, timestamptz '2026-08-10T12:55:00Z' + shift * interval '1 day');

  insert into public.notifications (agent_id, title, body, href, created_at)
  values
    (p_agent, 'Payment received', 'James Whitfield paid $10,700 for booking #' || b1041 || '.', '/payments', timestamptz '2026-08-13T16:41:00Z' + shift * interval '1 day'),
    (p_agent, 'Action needed on a payment', 'Rahul Mehta''s payment for booking #' || b1039 || ' needs verification.', '/payments', timestamptz '2026-08-13T11:13:00Z' + shift * interval '1 day');
end $$;

revoke execute on function public.portal_seed_demo(uuid) from public, anon;
