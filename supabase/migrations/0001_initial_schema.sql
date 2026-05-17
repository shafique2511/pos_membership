-- Luxantara Members - Phase 2 Database Schema
-- Private-use Membership + Booking + POS system.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_updated_at(table_name text)
returns void
language plpgsql
as $$
begin
  execute format('drop trigger if exists set_updated_at on public.%I', table_name);
  execute format(
    'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
    table_name
  );
end;
$$;

create table public.business_types (
  id uuid primary key default gen_random_uuid(),
  type_key text not null unique,
  name text not null,
  description text,
  supports_preset boolean not null default false,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_presets (
  id uuid primary key default gen_random_uuid(),
  business_type_id uuid not null references public.business_types(id) on delete cascade,
  preset_key text not null unique,
  name text not null,
  description text,
  recommended_module_keys text[] not null default '{}',
  optional_module_keys text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  module_key text not null unique,
  module_name text not null,
  description text,
  category text not null default 'operations',
  is_core boolean not null default false,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  business_type_id uuid references public.business_types(id) on delete set null,
  name text not null,
  slug text not null unique,
  legal_name text,
  email text,
  phone text,
  website text,
  address text,
  logo_url text,
  timezone text not null default 'Asia/Singapore',
  currency text not null default 'MYR',
  status text not null default 'active' check (status in ('setup', 'active', 'inactive', 'archived')),
  owner_id uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  code text,
  email text,
  phone text,
  address text,
  is_default boolean not null default false,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, code)
);

create table public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  role text not null check (role in ('owner', 'manager', 'staff', 'customer')),
  full_name text not null,
  email text,
  phone text,
  avatar_url text,
  status text not null default 'active' check (status in ('active', 'invited', 'inactive', 'suspended')),
  permissions jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, business_id, role)
);

create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'staff', 'customer')),
  module_key text not null,
  can_view boolean not null default false,
  can_create boolean not null default false,
  can_update boolean not null default false,
  can_delete boolean not null default false,
  can_export boolean not null default false,
  permissions jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, role, module_key)
);

create table public.business_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  booking_rules jsonb not null default '{}'::jsonb,
  opening_hours jsonb not null default '{}'::jsonb,
  portal_settings jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id)
);

create table public.business_modules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  module_key text not null references public.modules(module_key) on delete restrict,
  is_enabled boolean not null default false,
  enabled_by uuid references auth.users(id) on delete set null,
  disabled_by uuid references auth.users(id) on delete set null,
  enabled_at timestamptz,
  disabled_at timestamptz,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, module_key)
);

create table public.module_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  module_key text not null references public.modules(module_key) on delete restrict,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, branch_id, module_key)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  customer_code text,
  full_name text not null,
  email text,
  phone text,
  date_of_birth date,
  gender text,
  notes text,
  tags text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'inactive', 'blocked')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, customer_code)
);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  user_profile_id uuid references public.user_profiles(id) on delete set null,
  staff_code text,
  full_name text not null,
  email text,
  phone text,
  role_title text,
  hire_date date,
  status text not null default 'active' check (status in ('active', 'inactive', 'terminated')),
  commission_enabled boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, staff_code)
);

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  description text,
  display_order integer not null default 0,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  category_id uuid references public.service_categories(id) on delete set null,
  name text not null,
  description text,
  duration_minutes integer not null default 30,
  price numeric(12,2) not null default 0,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bookable_resources (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  name text not null,
  resource_type text not null default 'room',
  capacity integer,
  status text not null default 'active' check (status in ('active', 'inactive', 'maintenance')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  staff_id uuid references public.staff(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  resource_id uuid references public.bookable_resources(id) on delete set null,
  booking_date date not null,
  start_time time not null,
  end_time time,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show', 'rescheduled')),
  source text not null default 'dashboard',
  notes text,
  internal_notes text,
  total_amount numeric(12,2) not null default 0,
  deposit_amount numeric(12,2) not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.booking_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  payment_id uuid,
  amount numeric(12,2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'paid', 'refunded', 'cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.booking_status_history (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  old_status text,
  new_status text not null,
  note text,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  description text,
  plan_type text not null default 'custom',
  price numeric(12,2) not null default 0,
  duration_days integer,
  visit_limit integer,
  credit_amount numeric(12,2),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  membership_plan_id uuid references public.membership_plans(id) on delete set null,
  membership_code text,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled', 'frozen')),
  starts_at date not null default current_date,
  expires_at date,
  remaining_visits integer,
  remaining_credit numeric(12,2),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, membership_code)
);

create table public.membership_usage (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  membership_id uuid not null references public.memberships(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  pos_order_id uuid,
  usage_type text not null default 'visit',
  quantity numeric(12,2) not null default 1,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  source_type text,
  source_id uuid,
  transaction_type text not null check (transaction_type in ('earn', 'redeem', 'adjust', 'expire')),
  points integer not null,
  balance_after integer,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  description text,
  points_required integer not null default 0,
  reward_type text not null default 'custom',
  value numeric(12,2),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  reward_id uuid not null references public.rewards(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete cascade,
  points_used integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'approved', 'used', 'cancelled', 'expired')),
  redeemed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  description text,
  display_order integer not null default 0,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  category_id uuid references public.product_categories(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  sku text,
  name text not null,
  description text,
  cost_price numeric(12,2) not null default 0,
  selling_price numeric(12,2) not null default 0,
  stock_quantity numeric(12,2) not null default 0,
  low_stock_threshold numeric(12,2) not null default 0,
  track_inventory boolean not null default true,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, sku)
);

create table public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  product_id uuid not null references public.products(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  transaction_type text not null check (transaction_type in ('stock_in', 'stock_out', 'adjustment', 'transfer_in', 'transfer_out', 'sale_return')),
  quantity numeric(12,2) not null,
  unit_cost numeric(12,2),
  reference_type text,
  reference_id uuid,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pos_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  staff_id uuid references public.staff(id) on delete set null,
  order_number text not null,
  status text not null default 'open' check (status in ('open', 'completed', 'voided', 'refunded')),
  subtotal numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  notes text,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, order_number)
);

create table public.pos_order_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  pos_order_id uuid not null references public.pos_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  membership_plan_id uuid references public.membership_plans(id) on delete set null,
  item_name text not null,
  item_type text not null default 'product',
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  method_type text not null default 'cash',
  instructions text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  source_type text,
  source_id uuid,
  amount numeric(12,2) not null default 0,
  currency text not null default 'MYR',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  proof_url text,
  paid_at timestamptz,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.booking_payments
  add constraint booking_payments_payment_id_fkey
  foreign key (payment_id) references public.payments(id) on delete set null;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  invoice_number text not null,
  status text not null default 'draft' check (status in ('draft', 'issued', 'paid', 'void', 'overdue')),
  subtotal numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  due_date date,
  issued_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, invoice_number)
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  pos_order_id uuid references public.pos_orders(id) on delete set null,
  receipt_number text not null,
  file_url text,
  issued_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, receipt_number)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  user_profile_id uuid references public.user_profiles(id) on delete set null,
  channel text not null default 'in_app',
  title text not null,
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'read')),
  sent_at timestamptz,
  read_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  template_key text not null,
  channel text not null default 'in_app',
  subject text,
  body text not null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, template_key, channel)
);

create table public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  campaign_type text not null default 'promo',
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'active', 'completed', 'cancelled')),
  audience_filter jsonb not null default '{}'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campaign_customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  marketing_campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'converted', 'opted_out')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (marketing_campaign_id, customer_id)
);

create table public.staff_commissions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  staff_id uuid not null references public.staff(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  commission_type text not null default 'percentage',
  base_amount numeric(12,2) not null default 0,
  commission_rate numeric(7,4),
  commission_amount numeric(12,2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'cancelled')),
  approved_by uuid references auth.users(id) on delete set null,
  paid_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_working_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  staff_id uuid not null references public.staff(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (staff_id, day_of_week, start_time)
);

create table public.staff_off_days (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  staff_id uuid not null references public.staff(id) on delete cascade,
  off_date date not null,
  reason text,
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (staff_id, off_date)
);

create table public.backup_exports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  export_type text not null,
  export_scope text not null,
  export_format text not null check (export_format in ('csv', 'json', 'excel', 'pdf', 'zip')),
  date_from date,
  date_to date,
  file_url text,
  file_size bigint,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'expired')),
  requested_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.backup_export_items (
  id uuid primary key default gen_random_uuid(),
  backup_export_id uuid not null references public.backup_exports(id) on delete cascade,
  table_name text not null,
  record_count integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.import_restore_jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  file_url text not null,
  restore_type text not null,
  status text not null default 'draft' check (status in ('draft', 'pending_confirmation', 'confirmed', 'processing', 'completed', 'failed', 'cancelled')),
  requested_by uuid references auth.users(id) on delete set null,
  confirmed_by uuid references auth.users(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null,
  entity_table text,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'business_types', 'business_presets', 'modules', 'businesses', 'branches', 'user_profiles',
    'role_permissions', 'business_settings', 'business_modules', 'module_settings', 'customers',
    'staff', 'services', 'service_categories', 'bookable_resources', 'bookings', 'booking_payments',
    'booking_status_history', 'membership_plans', 'memberships', 'membership_usage',
    'loyalty_transactions', 'rewards', 'reward_redemptions', 'products', 'product_categories',
    'inventory_transactions', 'suppliers', 'pos_orders', 'pos_order_items', 'payments',
    'payment_methods', 'invoices', 'receipts', 'notifications', 'notification_templates',
    'marketing_campaigns', 'campaign_customers', 'staff_commissions', 'staff_working_hours',
    'staff_off_days', 'backup_exports', 'backup_export_items', 'import_restore_jobs', 'audit_logs'
  ]
  loop
    perform public.touch_updated_at(table_name);
  end loop;
end;
$$;

drop function public.touch_updated_at(text);

-- Core lookup indexes.
create index business_types_type_key_idx on public.business_types (type_key);
create index business_presets_business_type_id_idx on public.business_presets (business_type_id);
create index modules_module_key_idx on public.modules (module_key);

-- High-traffic business isolation and dashboard indexes.
create index businesses_owner_id_idx on public.businesses (owner_id);
create index businesses_status_created_at_idx on public.businesses (status, created_at desc);
create index branches_business_id_idx on public.branches (business_id);
create index branches_business_id_status_idx on public.branches (business_id, status) where deleted_at is null;
create index user_profiles_user_id_idx on public.user_profiles (user_id);
create index user_profiles_business_id_idx on public.user_profiles (business_id);
create index user_profiles_business_id_role_idx on public.user_profiles (business_id, role) where deleted_at is null;
create index role_permissions_business_id_role_idx on public.role_permissions (business_id, role);
create index business_modules_business_id_idx on public.business_modules (business_id);
create index business_modules_module_key_idx on public.business_modules (module_key);
create index module_settings_business_id_module_key_idx on public.module_settings (business_id, module_key);

-- Customer, booking, membership, POS, and reporting indexes.
create index customers_business_id_created_at_idx on public.customers (business_id, created_at desc) where deleted_at is null;
create index customers_branch_id_idx on public.customers (branch_id) where deleted_at is null;
create index customers_status_idx on public.customers (status) where deleted_at is null;
create index staff_business_id_created_at_idx on public.staff (business_id, created_at desc) where deleted_at is null;
create index staff_branch_id_idx on public.staff (branch_id) where deleted_at is null;
create index services_business_id_status_idx on public.services (business_id, status) where deleted_at is null;
create index service_categories_business_id_idx on public.service_categories (business_id) where deleted_at is null;
create index bookable_resources_business_id_branch_id_idx on public.bookable_resources (business_id, branch_id) where deleted_at is null;
create index bookings_business_id_booking_date_idx on public.bookings (business_id, booking_date) where deleted_at is null;
create index bookings_branch_id_booking_date_idx on public.bookings (branch_id, booking_date) where deleted_at is null;
create index bookings_customer_id_idx on public.bookings (customer_id) where deleted_at is null;
create index bookings_staff_id_idx on public.bookings (staff_id) where deleted_at is null;
create index bookings_status_idx on public.bookings (status) where deleted_at is null;
create index bookings_created_at_idx on public.bookings (created_at desc);
create index booking_payments_business_id_idx on public.booking_payments (business_id);
create index booking_status_history_booking_id_idx on public.booking_status_history (booking_id, created_at desc);
create index membership_plans_business_id_status_idx on public.membership_plans (business_id, status) where deleted_at is null;
create index memberships_business_id_status_idx on public.memberships (business_id, status) where deleted_at is null;
create index memberships_customer_id_idx on public.memberships (customer_id) where deleted_at is null;
create index membership_usage_membership_id_idx on public.membership_usage (membership_id, created_at desc);
create index loyalty_transactions_customer_id_idx on public.loyalty_transactions (customer_id, created_at desc);
create index loyalty_transactions_business_id_created_at_idx on public.loyalty_transactions (business_id, created_at desc);
create index rewards_business_id_status_idx on public.rewards (business_id, status) where deleted_at is null;
create index reward_redemptions_customer_id_idx on public.reward_redemptions (customer_id, created_at desc);

-- Inventory, POS, payment, and finance indexes.
create index product_categories_business_id_idx on public.product_categories (business_id) where deleted_at is null;
create index products_business_id_status_idx on public.products (business_id, status) where deleted_at is null;
create index products_branch_id_idx on public.products (branch_id) where deleted_at is null;
create index products_sku_idx on public.products (sku) where sku is not null and deleted_at is null;
create index suppliers_business_id_idx on public.suppliers (business_id) where deleted_at is null;
create index inventory_transactions_business_id_created_at_idx on public.inventory_transactions (business_id, created_at desc);
create index inventory_transactions_branch_id_created_at_idx on public.inventory_transactions (branch_id, created_at desc);
create index inventory_transactions_product_id_idx on public.inventory_transactions (product_id);
create index pos_orders_business_id_created_at_idx on public.pos_orders (business_id, created_at desc) where deleted_at is null;
create index pos_orders_branch_id_created_at_idx on public.pos_orders (branch_id, created_at desc) where deleted_at is null;
create index pos_orders_customer_id_idx on public.pos_orders (customer_id) where deleted_at is null;
create index pos_orders_status_idx on public.pos_orders (status) where deleted_at is null;
create index pos_order_items_pos_order_id_idx on public.pos_order_items (pos_order_id);
create index payments_business_id_created_at_idx on public.payments (business_id, created_at desc) where deleted_at is null;
create index payments_branch_id_created_at_idx on public.payments (branch_id, created_at desc) where deleted_at is null;
create index payments_customer_id_idx on public.payments (customer_id) where deleted_at is null;
create index payments_status_idx on public.payments (status) where deleted_at is null;
create index payment_methods_business_id_idx on public.payment_methods (business_id);
create index invoices_business_id_created_at_idx on public.invoices (business_id, created_at desc) where deleted_at is null;
create index invoices_customer_id_idx on public.invoices (customer_id) where deleted_at is null;
create index receipts_business_id_created_at_idx on public.receipts (business_id, created_at desc) where deleted_at is null;

-- Communications, marketing, staff commission, backup, and audit indexes.
create index notifications_business_id_status_idx on public.notifications (business_id, status);
create index notifications_customer_id_idx on public.notifications (customer_id);
create index notification_templates_business_id_key_idx on public.notification_templates (business_id, template_key);
create index marketing_campaigns_business_id_status_idx on public.marketing_campaigns (business_id, status) where deleted_at is null;
create index campaign_customers_campaign_id_idx on public.campaign_customers (marketing_campaign_id);
create index campaign_customers_customer_id_idx on public.campaign_customers (customer_id);
create index staff_commissions_business_id_status_idx on public.staff_commissions (business_id, status);
create index staff_commissions_staff_id_idx on public.staff_commissions (staff_id, created_at desc);
create index staff_working_hours_staff_id_idx on public.staff_working_hours (staff_id);
create index staff_off_days_staff_id_date_idx on public.staff_off_days (staff_id, off_date);
create index backup_exports_business_id_created_at_idx on public.backup_exports (business_id, created_at desc);
create index backup_exports_branch_id_idx on public.backup_exports (branch_id);
create index backup_exports_status_idx on public.backup_exports (status);
create index backup_export_items_backup_export_id_idx on public.backup_export_items (backup_export_id);
create index import_restore_jobs_business_id_created_at_idx on public.import_restore_jobs (business_id, created_at desc);
create index import_restore_jobs_status_idx on public.import_restore_jobs (status);
create index audit_logs_business_id_created_at_idx on public.audit_logs (business_id, created_at desc);
create index audit_logs_branch_id_idx on public.audit_logs (branch_id);
create index audit_logs_actor_user_id_idx on public.audit_logs (actor_user_id);
create index audit_logs_action_idx on public.audit_logs (action);
