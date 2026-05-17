-- Customer portal helpers and indexes for customer-owned data access.

create index if not exists customers_user_business_idx
  on public.customers (user_id, business_id)
  where deleted_at is null;

create index if not exists payments_customer_created_at_idx
  on public.payments (customer_id, created_at desc)
  where deleted_at is null;

create index if not exists receipts_payment_id_idx
  on public.receipts (payment_id)
  where deleted_at is null;

create or replace function public.get_customer_portal_settings(target_business_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(bs.portal_settings, '{}'::jsonb)
  from public.business_settings bs
  where bs.business_id = target_business_id
    and (
      public.can_access_business(target_business_id)
      or exists (
        select 1
        from public.customers c
        where c.business_id = target_business_id
          and c.user_id = auth.uid()
          and c.deleted_at is null
      )
    )
  limit 1;
$$;

drop policy if exists "Business team can read membership plans" on public.membership_plans;
create policy "Business team and customers can read membership plans"
on public.membership_plans for select
to authenticated
using (
  public.can_read_module_record(business_id, branch_id, 'memberships')
  or (
    status = 'active'
    and public.has_module_enabled('memberships')
    and exists (
      select 1
      from public.customers c
      where c.business_id = membership_plans.business_id
        and c.user_id = auth.uid()
        and c.deleted_at is null
    )
  )
);

drop policy if exists "Business team can read services" on public.services;
create policy "Business team and customers can read services"
on public.services for select
to authenticated
using (
  public.can_read_module_record(business_id, branch_id, 'bookings')
  or (
    status = 'active'
    and public.has_module_enabled('bookings')
    and exists (
      select 1
      from public.customers c
      where c.business_id = services.business_id
        and c.user_id = auth.uid()
        and c.deleted_at is null
    )
  )
);

drop policy if exists "Business team can read bookable resources" on public.bookable_resources;
create policy "Business team and customers can read bookable resources"
on public.bookable_resources for select
to authenticated
using (
  public.can_read_module_record(business_id, branch_id, 'bookings')
  or (
    status = 'active'
    and public.has_module_enabled('bookings')
    and exists (
      select 1
      from public.customers c
      where c.business_id = bookable_resources.business_id
        and c.user_id = auth.uid()
        and c.deleted_at is null
    )
  )
);

drop policy if exists "Business team can read rewards" on public.rewards;
create policy "Business team and customers can read rewards"
on public.rewards for select
to authenticated
using (
  public.can_read_module_record(business_id, branch_id, 'loyalty')
  or (
    status = 'active'
    and public.has_module_enabled('loyalty')
    and exists (
      select 1
      from public.customers c
      where c.business_id = rewards.business_id
        and c.user_id = auth.uid()
        and c.deleted_at is null
    )
  )
);
