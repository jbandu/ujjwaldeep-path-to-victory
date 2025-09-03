-- Premium subscriptions schema and policies

-- products
create table if not exists public.product_plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  amount_inr int not null check (amount_inr > 0),
  interval text not null check (interval in ('month')),
  active boolean default true,
  created_at timestamptz default now()
);

-- subscriptions
create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'razorpay',
  provider_subscription_id text,
  status text not null default 'incomplete',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  canceled_at timestamptz,
  trial_end timestamptz,
  autopay boolean default false,
  created_at timestamptz default now()
);

-- payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'razorpay',
  provider_payment_id text,
  provider_order_id text,
  amount_inr int not null,
  currency text not null default 'INR',
  status text not null,
  method text,
  raw jsonb,
  created_at timestamptz default now()
);

-- invoices
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.user_subscriptions(id) on delete set null,
  amount_inr int not null,
  period_start timestamptz,
  period_end timestamptz,
  status text not null default 'paid',
  invoice_no text,
  created_at timestamptz default now()
);

-- indices
create index if not exists idx_subs_user on public.user_subscriptions(user_id, status);
create index if not exists idx_payments_user on public.payments(user_id, created_at desc);
create index if not exists idx_invoices_user on public.invoices(user_id, created_at desc);

-- RLS enable
alter table public.user_subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.invoices enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select (coalesce((auth.jwt() ->> 'role'),'') = 'service_role')
      or (current_user = 'postgres')
      or exists (
        select 1 from public.profiles p
        where p.user_id = auth.uid() and p.is_admin = true
      );
$$;

create policy subs_owner_read on public.user_subscriptions
  for select using ( auth.uid() = user_id or public.is_admin() );
create policy subs_owner_write on public.user_subscriptions
  for insert with check ( auth.uid() = user_id or public.is_admin() );
create policy subs_owner_upd on public.user_subscriptions
  for update using ( auth.uid() = user_id or public.is_admin() ) with check ( auth.uid() = user_id or public.is_admin() );

create policy pay_owner_read on public.payments
  for select using ( auth.uid() = user_id or public.is_admin() );
create policy pay_owner_write on public.payments
  for insert with check ( auth.uid() = user_id or public.is_admin() );

create policy inv_owner_read on public.invoices
  for select using ( auth.uid() = user_id or public.is_admin() );
create policy inv_owner_write on public.invoices
  for insert with check ( auth.uid() = user_id or public.is_admin() );

-- Premium helper with 3-day grace
create or replace function public.is_premium(p_user uuid default auth.uid())
returns boolean language sql stable as $$
  with s as (
    select 1 from public.user_subscriptions
    where user_id = p_user
      and status in ('active','past_due')
      and coalesce(current_period_end, now()) >= (now() - interval '3 days')
    limit 1
  )
  select exists(select 1 from s);
$$;

-- enforce premium at DB level
drop policy if exists attempts_insert_premium on public.attempts;
create policy attempts_insert_premium
  on public.attempts for insert
  with check ( public.is_premium(auth.uid()) );

drop policy if exists pu_owner_ins on public.print_uploads;
create policy pu_owner_ins on public.print_uploads
  for insert with check ( auth.uid() = user_id and public.is_premium(auth.uid()) );

-- seed plan
insert into public.product_plans (code, name, amount_inr, interval, active)
values ('premium_monthly','Premium (Monthly)',999,'month',true)
on conflict (code) do update set amount_inr = excluded.amount_inr, active = true;
