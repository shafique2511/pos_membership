-- Luxantara Members - Phase 3 Supabase RLS Security
-- Private-use role, module, branch, backup, and customer portal protection.

create or replace function public.get_current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

create or replace function public.get_current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select up.business_id
  from public.user_profiles up
  where up.user_id = auth.uid()
    and up.status = 'active'
    and up.business_id is not null
    and up.deleted_at is null
  order by
    case up.role
      when 'owner' then 1
      when 'manager' then 2
      when 'staff' then 3
      when 'customer' then 4
      else 5
    end,
    up.created_at
  limit 1;
$$;

create or replace function public.get_current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select up.role
  from public.user_profiles up
  where up.user_id = auth.uid()
    and up.business_id = public.get_current_business_id()
    and up.status = 'active'
    and up.deleted_at is null
  order by
    case up.role
      when 'owner' then 1
      when 'manager' then 2
      when 'staff' then 3
      when 'customer' then 4
      else 5
    end
  limit 1;
$$;

create or replace function public.get_current_user_role(target_business_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select up.role
  from public.user_profiles up
  where up.user_id = auth.uid()
    and up.business_id = target_business_id
    and up.status = 'active'
    and up.deleted_at is null
  order by
    case up.role
      when 'owner' then 1
      when 'manager' then 2
      when 'staff' then 3
      when 'customer' then 4
      else 5
    end
  limit 1;
$$;

create or replace function public.can_access_business(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles up
    where up.user_id = auth.uid()
      and up.business_id = target_business_id
      and up.status = 'active'
      and up.deleted_at is null
  )
  or exists (
    select 1
    from public.businesses b
    where b.id = target_business_id
      and b.owner_id = auth.uid()
      and b.deleted_at is null
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
as $$
  select public.get_current_user_role() = 'owner';
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
as $$
  select public.get_current_user_role() = 'manager';
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
as $$
  select public.get_current_user_role() = 'staff';
$$;

create or replace function public.is_customer()
returns boolean
language sql
stable
as $$
  select public.get_current_user_role() = 'customer';
$$;

create or replace function public.has_module_enabled(module_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_module_enabled(public.get_current_business_id(), module_key);
$$;

create or replace function public.has_module_enabled(target_business_id uuid, target_module_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_modules bm
    join public.modules m on m.module_key = bm.module_key
    where bm.business_id = target_business_id
      and bm.module_key = target_module_key
      and bm.is_enabled = true
      and m.is_active = true
  )
  or exists (
    select 1
    from public.modules m
    where m.module_key = target_module_key
      and m.is_core = true
      and m.is_active = true
  );
$$;

create or replace function public.can_access_branch(target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_branch_id is null
  or exists (
    select 1
    from public.branches b
    where b.id = target_branch_id
      and public.can_access_business(b.business_id)
      and (
        public.get_current_user_role(b.business_id) = 'owner'
        or exists (
          select 1
          from public.user_profiles up
          where up.user_id = auth.uid()
            and up.business_id = b.business_id
            and up.status = 'active'
            and up.deleted_at is null
            and (
              up.role = 'owner'
              or up.branch_id is null
              or up.branch_id = target_branch_id
            )
        )
      )
  );
$$;

create or replace function public.can_access_branch(target_business_id uuid, target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_branch_id is null
  or public.get_current_user_role(target_business_id) = 'owner'
  or exists (
    select 1
    from public.user_profiles up
    where up.user_id = auth.uid()
      and up.business_id = target_business_id
      and up.status = 'active'
      and up.deleted_at is null
      and (
        up.role = 'owner'
        or up.branch_id is null
        or up.branch_id = target_branch_id
      )
  );
$$;

create or replace function public.can_read_module_record(
  target_business_id uuid,
  target_branch_id uuid,
  target_module_key text
)
returns boolean
language sql
stable
as $$
  select public.can_access_business(target_business_id)
    and public.has_module_enabled(target_business_id, target_module_key)
    and public.can_access_branch(target_business_id, target_branch_id)
    and public.get_current_user_role(target_business_id) in ('owner', 'manager', 'staff');
$$;

create or replace function public.can_manage_module_record(
  target_business_id uuid,
  target_branch_id uuid,
  target_module_key text
)
returns boolean
language sql
stable
as $$
  select public.can_access_business(target_business_id)
    and public.has_module_enabled(target_business_id, target_module_key)
    and public.can_access_branch(target_business_id, target_branch_id)
    and public.get_current_user_role(target_business_id) in ('owner', 'manager');
$$;

create or replace function public.can_staff_operate(
  target_business_id uuid,
  target_branch_id uuid,
  target_module_key text
)
returns boolean
language sql
stable
as $$
  select public.can_access_business(target_business_id)
    and public.has_module_enabled(target_business_id, target_module_key)
    and public.can_access_branch(target_business_id, target_branch_id)
    and public.get_current_user_role(target_business_id) in ('owner', 'manager', 'staff');
$$;

create or replace function public.can_export_business_data()
returns boolean
language sql
stable
as $$
  select public.can_export_business_data(public.get_current_business_id());
$$;

create or replace function public.can_export_business_data(target_business_id uuid)
returns boolean
language sql
stable
as $$
  select public.can_access_business(target_business_id)
    and public.get_current_user_role(target_business_id) = 'owner'
    and public.has_module_enabled(target_business_id, 'data_backup');
$$;

create or replace function public.can_export_reports()
returns boolean
language sql
stable
as $$
  select public.can_export_reports(public.get_current_business_id());
$$;

create or replace function public.can_export_reports(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_export_business_data(target_business_id)
  or (
    public.can_access_business(target_business_id)
    and public.has_module_enabled(target_business_id, 'reports')
    and public.get_current_user_role(target_business_id) = 'manager'
    and exists (
      select 1
      from public.role_permissions rp
      where rp.business_id = target_business_id
        and rp.role = 'manager'
        and rp.module_key = 'reports'
        and rp.can_export = true
    )
  );
$$;

create or replace function public.can_download_backup(backup_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.backup_exports be
    where be.id = backup_id
      and be.status = 'completed'
      and (
        public.can_export_business_data(be.business_id)
        or (
          be.export_type = 'reports'
          and public.can_export_reports(be.business_id)
        )
      )
      and public.can_access_branch(be.business_id, be.branch_id)
  );
$$;

create or replace function public.is_current_customer(target_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.customers c
    where c.id = target_customer_id
      and c.user_id = auth.uid()
      and c.deleted_at is null
  );
$$;

create or replace function public.is_current_staff(target_staff_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff s
    join public.user_profiles up on up.id = s.user_profile_id
    where s.id = target_staff_id
      and up.user_id = auth.uid()
      and s.deleted_at is null
      and up.deleted_at is null
  );
$$;

-- Enable RLS.
alter table public.business_types enable row level security;
alter table public.business_presets enable row level security;
alter table public.modules enable row level security;
alter table public.businesses enable row level security;
alter table public.branches enable row level security;
alter table public.user_profiles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.business_settings enable row level security;
alter table public.business_modules enable row level security;
alter table public.module_settings enable row level security;
alter table public.customers enable row level security;
alter table public.staff enable row level security;
alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.bookable_resources enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_payments enable row level security;
alter table public.booking_status_history enable row level security;
alter table public.membership_plans enable row level security;
alter table public.memberships enable row level security;
alter table public.membership_usage enable row level security;
alter table public.loyalty_transactions enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.product_categories enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.pos_orders enable row level security;
alter table public.pos_order_items enable row level security;
alter table public.payment_methods enable row level security;
alter table public.payments enable row level security;
alter table public.invoices enable row level security;
alter table public.receipts enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_templates enable row level security;
alter table public.marketing_campaigns enable row level security;
alter table public.campaign_customers enable row level security;
alter table public.staff_commissions enable row level security;
alter table public.staff_working_hours enable row level security;
alter table public.staff_off_days enable row level security;
alter table public.backup_exports enable row level security;
alter table public.backup_export_items enable row level security;
alter table public.import_restore_jobs enable row level security;
alter table public.audit_logs enable row level security;

-- Public authenticated lookup tables.
create policy "Authenticated users can read business types"
on public.business_types for select
to authenticated
using (is_active = true);

create policy "Authenticated users can read modules"
on public.modules for select
to authenticated
using (is_active = true);

create policy "Authenticated users can read supported presets"
on public.business_presets for select
to authenticated
using (is_active = true);

-- Business, branch, profile, role, settings, and module controls.
create policy "Users can create owned businesses"
on public.businesses for insert
to authenticated
with check (owner_id = auth.uid() or created_by = auth.uid());

create policy "Users can read their businesses"
on public.businesses for select
to authenticated
using (public.can_access_business(id));

create policy "Owners can update their businesses"
on public.businesses for update
to authenticated
using (public.get_current_user_role(id) = 'owner')
with check (public.get_current_user_role(id) = 'owner');

create policy "Owners can delete their businesses"
on public.businesses for delete
to authenticated
using (public.get_current_user_role(id) = 'owner');

create policy "Business members can read accessible branches"
on public.branches for select
to authenticated
using (public.can_access_business(business_id) and public.can_access_branch(business_id, id));

create policy "Owners and managers can manage branches"
on public.branches for all
to authenticated
using (public.can_manage_module_record(business_id, id, 'branches') or public.get_current_user_role(business_id) = 'owner')
with check (public.can_manage_module_record(business_id, id, 'branches') or public.get_current_user_role(business_id) = 'owner');

create policy "Users can read their own profile"
on public.user_profiles for select
to authenticated
using (user_id = auth.uid() or (public.can_access_business(business_id) and public.get_current_user_role(business_id) in ('owner', 'manager')));

create policy "Owners and managers can manage business profiles"
on public.user_profiles for all
to authenticated
using (public.can_access_business(business_id) and public.get_current_user_role(business_id) in ('owner', 'manager'))
with check (public.can_access_business(business_id) and public.get_current_user_role(business_id) in ('owner', 'manager'));

create policy "Users can update their own profile"
on public.user_profiles for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Owners can manage role permissions"
on public.role_permissions for all
to authenticated
using (public.get_current_user_role(business_id) = 'owner')
with check (public.get_current_user_role(business_id) = 'owner');

create policy "Managers can read role permissions"
on public.role_permissions for select
to authenticated
using (public.get_current_user_role(business_id) in ('owner', 'manager'));

create policy "Owners and managers can read business settings"
on public.business_settings for select
to authenticated
using (public.get_current_user_role(business_id) in ('owner', 'manager'));

create policy "Owners can manage business settings"
on public.business_settings for all
to authenticated
using (public.get_current_user_role(business_id) = 'owner')
with check (public.get_current_user_role(business_id) = 'owner');

create policy "Business members can read enabled module state"
on public.business_modules for select
to authenticated
using (public.can_access_business(business_id));

create policy "Owners can manage business modules"
on public.business_modules for all
to authenticated
using (public.get_current_user_role(business_id) = 'owner')
with check (public.get_current_user_role(business_id) = 'owner');

create policy "Owners and managers can read module settings"
on public.module_settings for select
to authenticated
using (public.can_manage_module_record(business_id, branch_id, module_key));

create policy "Owners can manage module settings"
on public.module_settings for all
to authenticated
using (public.get_current_user_role(business_id) = 'owner' and public.has_module_enabled(business_id, module_key))
with check (public.get_current_user_role(business_id) = 'owner' and public.has_module_enabled(business_id, module_key));

-- Core customer and staff records.
create policy "Business team can read customers"
on public.customers for select
to authenticated
using (
  public.can_staff_operate(business_id, branch_id, 'core')
  or public.is_current_customer(id)
);

create policy "Business team can manage customers"
on public.customers for insert
to authenticated
with check (public.can_staff_operate(business_id, branch_id, 'core'));

create policy "Business team or customer can update customer profile"
on public.customers for update
to authenticated
using (public.can_staff_operate(business_id, branch_id, 'core') or public.is_current_customer(id))
with check (public.can_staff_operate(business_id, branch_id, 'core') or public.is_current_customer(id));

create policy "Owners and managers can delete customers"
on public.customers for delete
to authenticated
using (public.can_manage_module_record(business_id, branch_id, 'core'));

create policy "Business team can read staff"
on public.staff for select
to authenticated
using (public.can_read_module_record(business_id, branch_id, 'staff') or public.is_current_staff(id));

create policy "Owners and managers can manage staff"
on public.staff for all
to authenticated
using (public.can_manage_module_record(business_id, branch_id, 'staff'))
with check (public.can_manage_module_record(business_id, branch_id, 'staff'));

-- Service and booking module.
create policy "Business team can read service categories"
on public.service_categories for select
to authenticated
using (public.can_read_module_record(business_id, branch_id, 'bookings'));

create policy "Owners and managers can manage service categories"
on public.service_categories for all
to authenticated
using (public.can_manage_module_record(business_id, branch_id, 'bookings'))
with check (public.can_manage_module_record(business_id, branch_id, 'bookings'));

create policy "Business team can read services"
on public.services for select
to authenticated
using (public.can_read_module_record(business_id, branch_id, 'bookings'));

create policy "Owners and managers can manage services"
on public.services for all
to authenticated
using (public.can_manage_module_record(business_id, branch_id, 'bookings'))
with check (public.can_manage_module_record(business_id, branch_id, 'bookings'));

create policy "Business team can read bookable resources"
on public.bookable_resources for select
to authenticated
using (public.can_read_module_record(business_id, branch_id, 'bookings'));

create policy "Owners and managers can manage bookable resources"
on public.bookable_resources for all
to authenticated
using (public.can_manage_module_record(business_id, branch_id, 'bookings'))
with check (public.can_manage_module_record(business_id, branch_id, 'bookings'));

create policy "Business team and customers can read bookings"
on public.bookings for select
to authenticated
using (
  public.can_staff_operate(business_id, branch_id, 'bookings')
  or public.is_current_customer(customer_id)
);

create policy "Business team and customers can create bookings"
on public.bookings for insert
to authenticated
with check (
  public.can_staff_operate(business_id, branch_id, 'bookings')
  or public.is_current_customer(customer_id)
);

create policy "Business team and customers can update bookings"
on public.bookings for update
to authenticated
using (
  public.can_staff_operate(business_id, branch_id, 'bookings')
  or public.is_current_customer(customer_id)
)
with check (
  public.can_staff_operate(business_id, branch_id, 'bookings')
  or public.is_current_customer(customer_id)
);

create policy "Owners and managers can delete bookings"
on public.bookings for delete
to authenticated
using (public.can_manage_module_record(business_id, branch_id, 'bookings'));

create policy "Business team can read booking payments"
on public.booking_payments for select
to authenticated
using (public.can_staff_operate(business_id, branch_id, 'payments'));

create policy "Business team can manage booking payments"
on public.booking_payments for all
to authenticated
using (public.can_staff_operate(business_id, branch_id, 'payments'))
with check (public.can_staff_operate(business_id, branch_id, 'payments'));

create policy "Business team and customers can read booking status history"
on public.booking_status_history for select
to authenticated
using (
  public.can_staff_operate(business_id, branch_id, 'bookings')
  or exists (
    select 1 from public.bookings b
    where b.id = booking_id and public.is_current_customer(b.customer_id)
  )
);

create policy "Business team can create booking status history"
on public.booking_status_history for insert
to authenticated
with check (public.can_staff_operate(business_id, branch_id, 'bookings'));

-- Membership and loyalty modules.
create policy "Business team can read membership plans"
on public.membership_plans for select
to authenticated
using (public.can_read_module_record(business_id, branch_id, 'memberships'));

create policy "Owners and managers can manage membership plans"
on public.membership_plans for all
to authenticated
using (public.can_manage_module_record(business_id, branch_id, 'memberships'))
with check (public.can_manage_module_record(business_id, branch_id, 'memberships'));

create policy "Business team and customers can read memberships"
on public.memberships for select
to authenticated
using (public.can_staff_operate(business_id, branch_id, 'memberships') or public.is_current_customer(customer_id));

create policy "Business team can manage memberships"
on public.memberships for all
to authenticated
using (public.can_staff_operate(business_id, branch_id, 'memberships'))
with check (public.can_staff_operate(business_id, branch_id, 'memberships'));

create policy "Business team and customers can read membership usage"
on public.membership_usage for select
to authenticated
using (public.can_staff_operate(business_id, branch_id, 'memberships') or public.is_current_customer(customer_id));

create policy "Business team can create membership usage"
on public.membership_usage for insert
to authenticated
with check (public.can_staff_operate(business_id, branch_id, 'memberships'));

create policy "Business team and customers can read loyalty transactions"
on public.loyalty_transactions for select
to authenticated
using (public.can_staff_operate(business_id, branch_id, 'loyalty') or public.is_current_customer(customer_id));

create policy "Business team can manage loyalty transactions"
on public.loyalty_transactions for all
to authenticated
using (public.can_staff_operate(business_id, branch_id, 'loyalty'))
with check (public.can_staff_operate(business_id, branch_id, 'loyalty'));

create policy "Business team can read rewards"
on public.rewards for select
to authenticated
using (public.can_read_module_record(business_id, branch_id, 'loyalty'));

create policy "Owners and managers can manage rewards"
on public.rewards for all
to authenticated
using (public.can_manage_module_record(business_id, branch_id, 'loyalty'))
with check (public.can_manage_module_record(business_id, branch_id, 'loyalty'));

create policy "Business team and customers can read reward redemptions"
on public.reward_redemptions for select
to authenticated
using (public.can_staff_operate(business_id, branch_id, 'loyalty') or public.is_current_customer(customer_id));

create policy "Business team and customers can create reward redemptions"
on public.reward_redemptions for insert
to authenticated
with check (public.can_staff_operate(business_id, branch_id, 'loyalty') or public.is_current_customer(customer_id));

create policy "Business team can update reward redemptions"
on public.reward_redemptions for update
to authenticated
using (public.can_staff_operate(business_id, branch_id, 'loyalty'))
with check (public.can_staff_operate(business_id, branch_id, 'loyalty'));

-- Inventory module.
create policy "Business team can read product categories"
on public.product_categories for select
to authenticated
using (public.can_read_module_record(business_id, branch_id, 'inventory'));

create policy "Owners and managers can manage product categories"
on public.product_categories for all
to authenticated
using (public.can_manage_module_record(business_id, branch_id, 'inventory'))
with check (public.can_manage_module_record(business_id, branch_id, 'inventory'));

create policy "Business team can read suppliers"
on public.suppliers for select
to authenticated
using (public.can_read_module_record(business_id, branch_id, 'inventory'));

create policy "Owners and managers can manage suppliers"
on public.suppliers for all
to authenticated
using (public.can_manage_module_record(business_id, branch_id, 'inventory'))
with check (public.can_manage_module_record(business_id, branch_id, 'inventory'));

create policy "Business team can read products"
on public.products for select
to authenticated
using (public.can_read_module_record(business_id, branch_id, 'inventory') or public.can_read_module_record(business_id, branch_id, 'pos'));

create policy "Owners and managers can manage products"
on public.products for all
to authenticated
using (public.can_manage_module_record(business_id, branch_id, 'inventory'))
with check (public.can_manage_module_record(business_id, branch_id, 'inventory'));

create policy "Business team can read inventory transactions"
on public.inventory_transactions for select
to authenticated
using (public.can_read_module_record(business_id, branch_id, 'inventory'));

create policy "Owners and managers can manage inventory transactions"
on public.inventory_transactions for all
to authenticated
using (public.can_manage_module_record(business_id, branch_id, 'inventory'))
with check (public.can_manage_module_record(business_id, branch_id, 'inventory'));

-- POS and payment module.
create policy "Business team can read POS orders"
on public.pos_orders for select
to authenticated
using (public.can_staff_operate(business_id, branch_id, 'pos'));

create policy "Business team can create POS orders"
on public.pos_orders for insert
to authenticated
with check (public.can_staff_operate(business_id, branch_id, 'pos'));

create policy "Business team can update POS orders"
on public.pos_orders for update
to authenticated
using (public.can_staff_operate(business_id, branch_id, 'pos'))
with check (public.can_staff_operate(business_id, branch_id, 'pos'));

create policy "Owners and managers can delete POS orders"
on public.pos_orders for delete
to authenticated
using (public.can_manage_module_record(business_id, branch_id, 'pos'));

create policy "Business team can read POS order items"
on public.pos_order_items for select
to authenticated
using (public.can_staff_operate(business_id, branch_id, 'pos'));

create policy "Business team can manage POS order items"
on public.pos_order_items for all
to authenticated
using (public.can_staff_operate(business_id, branch_id, 'pos'))
with check (public.can_staff_operate(business_id, branch_id, 'pos'));

create policy "Business team can read payment methods"
on public.payment_methods for select
to authenticated
using (public.can_read_module_record(business_id, branch_id, 'payments'));

create policy "Owners and managers can manage payment methods"
on public.payment_methods for all
to authenticated
using (public.can_manage_module_record(business_id, branch_id, 'payments'))
with check (public.can_manage_module_record(business_id, branch_id, 'payments'));

create policy "Business team and customers can read payments"
on public.payments for select
to authenticated
using (public.can_staff_operate(business_id, branch_id, 'payments') or public.is_current_customer(customer_id));

create policy "Business team can manage payments"
on public.payments for all
to authenticated
using (public.can_staff_operate(business_id, branch_id, 'payments'))
with check (public.can_staff_operate(business_id, branch_id, 'payments'));

create policy "Business team and customers can read invoices"
on public.invoices for select
to authenticated
using (public.can_staff_operate(business_id, branch_id, 'payments') or public.is_current_customer(customer_id));

create policy "Owners and managers can manage invoices"
on public.invoices for all
to authenticated
using (public.can_manage_module_record(business_id, branch_id, 'payments'))
with check (public.can_manage_module_record(business_id, branch_id, 'payments'));

create policy "Business team and customers can read receipts"
on public.receipts for select
to authenticated
using (
  public.can_staff_operate(business_id, branch_id, 'payments')
  or exists (
    select 1 from public.payments p
    where p.id = payment_id and public.is_current_customer(p.customer_id)
  )
);

create policy "Business team can manage receipts"
on public.receipts for all
to authenticated
using (public.can_staff_operate(business_id, branch_id, 'payments'))
with check (public.can_staff_operate(business_id, branch_id, 'payments'));

-- Notifications and marketing.
create policy "Business team and customers can read notifications"
on public.notifications for select
to authenticated
using (
  public.can_staff_operate(business_id, branch_id, 'notifications')
  or user_profile_id in (select id from public.user_profiles where user_id = auth.uid())
  or public.is_current_customer(customer_id)
);

create policy "Business team can manage notifications"
on public.notifications for all
to authenticated
using (public.can_staff_operate(business_id, branch_id, 'notifications'))
with check (public.can_staff_operate(business_id, branch_id, 'notifications'));

create policy "Owners and managers can read notification templates"
on public.notification_templates for select
to authenticated
using (public.can_manage_module_record(business_id, branch_id, 'notifications'));

create policy "Owners and managers can manage notification templates"
on public.notification_templates for all
to authenticated
using (public.can_manage_module_record(business_id, branch_id, 'notifications'))
with check (public.can_manage_module_record(business_id, branch_id, 'notifications'));

create policy "Owners and managers can manage marketing campaigns"
on public.marketing_campaigns for all
to authenticated
using (public.can_manage_module_record(business_id, branch_id, 'marketing'))
with check (public.can_manage_module_record(business_id, branch_id, 'marketing'));

create policy "Owners and managers can manage campaign customers"
on public.campaign_customers for all
to authenticated
using (public.can_manage_module_record(business_id, branch_id, 'marketing'))
with check (public.can_manage_module_record(business_id, branch_id, 'marketing'));

-- Staff commission and schedules.
create policy "Owners managers and assigned staff can read commissions"
on public.staff_commissions for select
to authenticated
using (
  public.can_manage_module_record(business_id, branch_id, 'staff_commission')
  or public.is_current_staff(staff_id)
);

create policy "Owners and managers can manage commissions"
on public.staff_commissions for all
to authenticated
using (public.can_manage_module_record(business_id, branch_id, 'staff_commission'))
with check (public.can_manage_module_record(business_id, branch_id, 'staff_commission'));

create policy "Business team can read staff working hours"
on public.staff_working_hours for select
to authenticated
using (public.can_read_module_record(business_id, branch_id, 'staff') or public.is_current_staff(staff_id));

create policy "Owners managers and assigned staff can manage working hours"
on public.staff_working_hours for all
to authenticated
using (public.can_manage_module_record(business_id, branch_id, 'staff') or public.is_current_staff(staff_id))
with check (public.can_manage_module_record(business_id, branch_id, 'staff') or public.is_current_staff(staff_id));

create policy "Business team can read staff off days"
on public.staff_off_days for select
to authenticated
using (public.can_read_module_record(business_id, branch_id, 'staff') or public.is_current_staff(staff_id));

create policy "Owners managers and assigned staff can manage off days"
on public.staff_off_days for all
to authenticated
using (public.can_manage_module_record(business_id, branch_id, 'staff') or public.is_current_staff(staff_id))
with check (public.can_manage_module_record(business_id, branch_id, 'staff') or public.is_current_staff(staff_id));

-- Backup, restore, and audit logs.
create policy "Owners and report-export managers can create backup exports"
on public.backup_exports for insert
to authenticated
with check (
  (
    public.can_export_business_data(business_id)
    and public.can_access_branch(business_id, branch_id)
    and export_scope in ('full_business', 'module', 'branch', 'date_range')
  )
  or (
    export_type = 'reports'
    and export_scope = 'reports'
    and public.can_export_reports(business_id)
    and public.can_access_branch(business_id, branch_id)
  )
);

create policy "Authorized users can read backup exports"
on public.backup_exports for select
to authenticated
using (
  public.can_download_backup(id)
  or (
    status <> 'completed'
    and (
      public.can_export_business_data(business_id)
      or (export_type = 'reports' and public.can_export_reports(business_id))
    )
    and public.can_access_branch(business_id, branch_id)
  )
);

create policy "Authorized users can update backup exports"
on public.backup_exports for update
to authenticated
using (public.can_export_business_data(business_id) or (export_type = 'reports' and public.can_export_reports(business_id)))
with check (public.can_export_business_data(business_id) or (export_type = 'reports' and public.can_export_reports(business_id)));

create policy "Authorized users can read backup export items"
on public.backup_export_items for select
to authenticated
using (
  exists (
    select 1 from public.backup_exports be
    where be.id = backup_export_id
      and (
        public.can_download_backup(be.id)
        or public.can_export_business_data(be.business_id)
        or (be.export_type = 'reports' and public.can_export_reports(be.business_id))
      )
  )
);

create policy "Authorized users can create backup export items"
on public.backup_export_items for insert
to authenticated
with check (
  exists (
    select 1 from public.backup_exports be
    where be.id = backup_export_id
      and (
        public.can_export_business_data(be.business_id)
        or (be.export_type = 'reports' and public.can_export_reports(be.business_id))
      )
  )
);

create policy "Owners can manage restore jobs"
on public.import_restore_jobs for all
to authenticated
using (public.can_export_business_data(business_id))
with check (public.can_export_business_data(business_id));

create policy "Business owners and managers can read audit logs"
on public.audit_logs for select
to authenticated
using (public.can_access_business(business_id) and public.get_current_user_role(business_id) in ('owner', 'manager'));

create policy "Business team can create audit logs"
on public.audit_logs for insert
to authenticated
with check (public.can_access_business(business_id));
