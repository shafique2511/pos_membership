-- Luxantara Members - Phase 22 Seed Data
-- Private-use demo seed. No SaaS packages, no Super Admin, no billing tiers.

-- Supported business types. Salon, Spa, and Event Space intentionally do not support presets.
insert into public.business_types (type_key, name, description, supports_preset, display_order)
values
  ('barber_shop', 'Barber Shop', 'Appointments, staff, loyalty, memberships, and service checkout.', true, 10),
  ('coffee_shop', 'Coffee Shop', 'POS, loyalty, inventory, table booking, and customer membership workflows.', true, 20),
  ('salon', 'Salon', 'Manual module selection for salon services, memberships, POS, and bookings.', false, 30),
  ('spa', 'Spa', 'Manual module selection for treatment booking, memberships, staff, and payments.', false, 40),
  ('clinic', 'Clinic', 'Appointments, patient-style customer records, staff, payments, and reports.', true, 50),
  ('event_space', 'Event Space', 'Manual module selection for resource booking, payments, and customer portal.', false, 60),
  ('custom_business', 'Custom Business', 'Flexible setup for future private-use business types.', true, 70)
on conflict (type_key) do update set
  name = excluded.name,
  description = excluded.description,
  supports_preset = excluded.supports_preset,
  display_order = excluded.display_order,
  updated_at = now();

-- Private-use modules, including Owner-only Data Backup & Export.
insert into public.modules (module_key, module_name, description, category, is_core, display_order)
values
  ('core', 'Core Business System', 'Business profile, customers, services, and base operations.', 'core', true, 10),
  ('bookings', 'Booking Module', 'Appointments, table bookings, resources, staff schedules, and booking statuses.', 'operations', false, 20),
  ('memberships', 'Membership Module', 'Membership plans, renewals, usage, credits, visits, and member cards.', 'growth', false, 30),
  ('loyalty', 'Loyalty & Rewards Module', 'Points, rewards, redemptions, referrals, and loyalty history.', 'growth', false, 40),
  ('pos', 'POS Module', 'Checkout for products, services, memberships, discounts, and receipts.', 'sales', false, 50),
  ('inventory', 'Inventory Module', 'Products, suppliers, stock transactions, branch stock, and low stock alerts.', 'operations', false, 60),
  ('staff', 'Staff Module', 'Staff profiles, working hours, assignments, and staff dashboards.', 'team', false, 70),
  ('staff_commission', 'Staff Commission Module', 'Commission tracking for services, products, and memberships.', 'team', false, 80),
  ('payments', 'Payment Module', 'Cash, QR, card, bank transfer records, invoices, receipts, deposits, and refunds.', 'finance', false, 90),
  ('notifications', 'Notification Module', 'In-app, email, WhatsApp, and Telegram template preparation.', 'communication', false, 100),
  ('reports', 'Reports Module', 'Sales, booking, membership, customer, inventory, staff, and payment reporting.', 'analytics', false, 110),
  ('marketing', 'Marketing Module', 'Promos, campaigns, customer segmentation, and broadcasts.', 'growth', false, 120),
  ('branches', 'Multi-Branch Module', 'Branch management, branch permissions, transfers, and branch reporting.', 'operations', false, 130),
  ('customer_portal', 'Customer Portal Module', 'Mobile-first customer portal for bookings, memberships, loyalty, and receipts.', 'portal', false, 140),
  ('settings', 'Settings Module', 'Business settings, module settings, roles, branch settings, and security.', 'core', true, 150),
  ('data_backup', 'Data Backup & Export Module', 'Owner-only backups, module exports, report exports, audit logs, and restore preparation.', 'core', true, 160)
on conflict (module_key) do update set
  module_name = excluded.module_name,
  description = excluded.description,
  category = excluded.category,
  is_core = excluded.is_core,
  display_order = excluded.display_order,
  updated_at = now();

-- Presets are starting suggestions only and are seeded only for supported preset business types.
insert into public.business_presets (business_type_id, preset_key, name, description, recommended_module_keys, optional_module_keys)
select
  bt.id,
  'barber_shop_default',
  'Barber Shop Default',
  'Suggested starting modules for appointments, memberships, loyalty, staff, payments, reports, and customer portal.',
  array['core', 'bookings', 'memberships', 'loyalty', 'pos', 'staff', 'payments', 'reports', 'customer_portal', 'settings', 'data_backup'],
  array['inventory', 'staff_commission', 'marketing', 'branches', 'notifications']
from public.business_types bt
where bt.type_key = 'barber_shop'
on conflict (preset_key) do update set
  recommended_module_keys = excluded.recommended_module_keys,
  optional_module_keys = excluded.optional_module_keys,
  updated_at = now();

insert into public.business_presets (business_type_id, preset_key, name, description, recommended_module_keys, optional_module_keys)
select
  bt.id,
  'coffee_shop_default',
  'Coffee Shop Default',
  'Suggested starting modules for POS, loyalty, membership, inventory, payments, reports, and customer portal.',
  array['core', 'pos', 'loyalty', 'memberships', 'inventory', 'payments', 'reports', 'customer_portal', 'settings', 'data_backup'],
  array['bookings', 'staff', 'staff_commission', 'marketing', 'branches', 'notifications']
from public.business_types bt
where bt.type_key = 'coffee_shop'
on conflict (preset_key) do update set
  recommended_module_keys = excluded.recommended_module_keys,
  optional_module_keys = excluded.optional_module_keys,
  updated_at = now();

insert into public.business_presets (business_type_id, preset_key, name, description, recommended_module_keys, optional_module_keys)
select
  bt.id,
  'clinic_default',
  'Clinic Default',
  'Suggested starting modules for appointments, staff, payments, notifications, reports, and customer portal.',
  array['core', 'bookings', 'staff', 'payments', 'notifications', 'reports', 'customer_portal', 'settings', 'data_backup'],
  array['memberships', 'loyalty', 'pos', 'inventory', 'marketing', 'branches']
from public.business_types bt
where bt.type_key = 'clinic'
on conflict (preset_key) do update set
  recommended_module_keys = excluded.recommended_module_keys,
  optional_module_keys = excluded.optional_module_keys,
  updated_at = now();

insert into public.business_presets (business_type_id, preset_key, name, description, recommended_module_keys, optional_module_keys)
select
  bt.id,
  'custom_business_default',
  'Custom Business Default',
  'Minimal starting point. Owner manually enables the modules needed for the business.',
  array['core', 'settings', 'data_backup'],
  array['bookings', 'memberships', 'loyalty', 'pos', 'inventory', 'staff', 'staff_commission', 'payments', 'notifications', 'reports', 'marketing', 'branches', 'customer_portal']
from public.business_types bt
where bt.type_key = 'custom_business'
on conflict (preset_key) do update set
  recommended_module_keys = excluded.recommended_module_keys,
  optional_module_keys = excluded.optional_module_keys,
  updated_at = now();

-- Guardrail: never seed preset mappings for Salon, Spa, or Event Space.
delete from public.business_presets bp
using public.business_types bt
where bp.business_type_id = bt.id
  and bt.type_key in ('salon', 'spa', 'event_space');

-- Demo private-use business. Assign owner_id/user_profiles after creating a Supabase Auth user if you want this visible in-app.
insert into public.businesses (
  id, business_type_id, name, slug, legal_name, email, phone, website, address, timezone, currency, status
)
select
  '10000000-0000-4000-8000-000000000001'::uuid,
  bt.id,
  'Luxantara Demo Coffee',
  'luxantara-demo-coffee',
  'Luxantara Demo Coffee',
  'owner@luxantara.local',
  '+60 12-000 0001',
  'https://luxantara.local',
  '88 Jalan Demo, Kuala Lumpur',
  'Asia/Kuala_Lumpur',
  'MYR',
  'active'
from public.business_types bt
where bt.type_key = 'coffee_shop'
on conflict (id) do update set
  business_type_id = excluded.business_type_id,
  name = excluded.name,
  slug = excluded.slug,
  legal_name = excluded.legal_name,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  address = excluded.address,
  timezone = excluded.timezone,
  currency = excluded.currency,
  status = excluded.status,
  updated_at = now();

insert into public.branches (id, business_id, name, code, email, phone, address, is_default, status)
values
  ('10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000001', 'Main Branch', 'MAIN', 'main@luxantara.local', '+60 12-000 0101', '88 Jalan Demo, Kuala Lumpur', true, 'active'),
  ('10000000-0000-4000-8000-000000000102', '10000000-0000-4000-8000-000000000001', 'Event Corner', 'EVENT', 'event@luxantara.local', '+60 12-000 0102', 'Level 2, Event Corner', false, 'active')
on conflict (id) do update set
  name = excluded.name,
  code = excluded.code,
  email = excluded.email,
  phone = excluded.phone,
  address = excluded.address,
  is_default = excluded.is_default,
  status = excluded.status,
  updated_at = now();

insert into public.business_settings (business_id, settings, opening_hours, booking_rules, portal_settings)
values (
  '10000000-0000-4000-8000-000000000001',
  jsonb_build_object(
    'setup_completed', true,
    'data_ownership_acknowledged', true,
    'low_stock_threshold', 8,
    'auto_deduct_inventory', true,
    'membership_manual_purchase', true
  ),
  jsonb_build_object(
    'timezone', 'Asia/Kuala_Lumpur',
    'weekly_hours', 'Mon-Sun 08:00-22:00'
  ),
  jsonb_build_object(
    'advance_booking_days', 30,
    'cancellation_hours', 12,
    'booking_approval_required', true
  ),
  jsonb_build_object(
    'allow_receipt_download', true,
    'allow_customer_reschedule', true
  )
)
on conflict (business_id) do update set
  settings = excluded.settings,
  opening_hours = excluded.opening_hours,
  booking_rules = excluded.booking_rules,
  portal_settings = excluded.portal_settings,
  updated_at = now();

insert into public.business_modules (business_id, module_key, is_enabled, enabled_at, settings)
select
  '10000000-0000-4000-8000-000000000001'::uuid,
  m.module_key,
  true,
  now(),
  jsonb_build_object('sidebar_visible', true, 'seeded_demo', true)
from public.modules m
where m.module_key in (
  'core', 'bookings', 'memberships', 'loyalty', 'pos', 'inventory', 'staff',
  'staff_commission', 'payments', 'notifications', 'reports', 'marketing',
  'branches', 'customer_portal', 'settings', 'data_backup'
)
on conflict (business_id, module_key) do update set
  is_enabled = excluded.is_enabled,
  enabled_at = coalesce(public.business_modules.enabled_at, excluded.enabled_at),
  settings = excluded.settings,
  updated_at = now();

insert into public.role_permissions (business_id, role, module_key, can_view, can_create, can_update, can_delete, can_export)
select
  '10000000-0000-4000-8000-000000000001'::uuid,
  role_name,
  module_key,
  role_name in ('owner', 'manager', 'staff', 'customer'),
  role_name in ('owner', 'manager', 'staff') and module_key not in ('data_backup', 'settings'),
  role_name in ('owner', 'manager', 'staff') and module_key not in ('data_backup'),
  role_name in ('owner', 'manager'),
  (role_name = 'owner') or (role_name = 'manager' and module_key = 'reports')
from unnest(array['owner', 'manager', 'staff', 'customer']) as roles(role_name)
cross join unnest(array['core', 'bookings', 'memberships', 'loyalty', 'pos', 'inventory', 'staff', 'staff_commission', 'payments', 'notifications', 'reports', 'marketing', 'branches', 'customer_portal', 'settings', 'data_backup']) as modules(module_key)
on conflict (business_id, role, module_key) do update set
  can_view = excluded.can_view,
  can_create = excluded.can_create,
  can_update = excluded.can_update,
  can_delete = excluded.can_delete,
  can_export = excluded.can_export,
  updated_at = now();

insert into public.staff (id, business_id, branch_id, staff_code, full_name, email, phone, role_title, hire_date, status, commission_enabled)
values
  ('10000000-0000-4000-8000-000000000201', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', 'STF-001', 'Alya Barista', 'alya@luxantara.local', '+60 12-100 0201', 'Lead Barista', current_date - 240, 'active', true),
  ('10000000-0000-4000-8000-000000000202', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000102', 'STF-002', 'Rafi Floor Lead', 'rafi@luxantara.local', '+60 12-100 0202', 'Event Lead', current_date - 180, 'active', true)
on conflict (id) do update set
  branch_id = excluded.branch_id,
  full_name = excluded.full_name,
  email = excluded.email,
  phone = excluded.phone,
  role_title = excluded.role_title,
  status = excluded.status,
  commission_enabled = excluded.commission_enabled,
  updated_at = now();

insert into public.customers (id, business_id, branch_id, customer_code, full_name, email, phone, date_of_birth, gender, notes, tags, status)
values
  ('10000000-0000-4000-8000-000000000301', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', 'CUS-001', 'Maya Tan', 'maya@example.com', '+60 12-200 0301', '1994-04-12', 'female', 'Prefers oat milk.', array['vip', 'coffee'], 'active'),
  ('10000000-0000-4000-8000-000000000302', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000102', 'CUS-002', 'Daniel Lee', 'daniel@example.com', '+60 12-200 0302', '1988-09-25', 'male', 'Books event corner monthly.', array['event', 'member'], 'active'),
  ('10000000-0000-4000-8000-000000000303', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', 'CUS-003', 'Nora Aziz', 'nora@example.com', '+60 12-200 0303', '1991-01-18', 'female', 'Loyalty active.', array['loyalty'], 'active')
on conflict (id) do update set
  branch_id = excluded.branch_id,
  full_name = excluded.full_name,
  email = excluded.email,
  phone = excluded.phone,
  notes = excluded.notes,
  tags = excluded.tags,
  status = excluded.status,
  updated_at = now();

insert into public.service_categories (id, business_id, branch_id, name, description, display_order, status)
values
  ('10000000-0000-4000-8000-000000000401', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', 'Coffee Bar', 'Coffee tasting and bar service bookings.', 10, 'active'),
  ('10000000-0000-4000-8000-000000000402', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000102', 'Event Space', 'Resource and event corner reservations.', 20, 'active')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  display_order = excluded.display_order,
  status = excluded.status,
  updated_at = now();

insert into public.services (id, business_id, branch_id, category_id, name, description, duration_minutes, price, status)
values
  ('10000000-0000-4000-8000-000000000411', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000401', 'Coffee Tasting Session', 'Guided tasting for members and guests.', 45, 38.00, 'active'),
  ('10000000-0000-4000-8000-000000000412', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000102', '10000000-0000-4000-8000-000000000402', 'Event Space Booking', 'Two-hour table/resource reservation.', 120, 180.00, 'active')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  duration_minutes = excluded.duration_minutes,
  price = excluded.price,
  status = excluded.status,
  updated_at = now();

insert into public.bookable_resources (id, business_id, branch_id, name, resource_type, capacity, status)
values
  ('10000000-0000-4000-8000-000000000421', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', 'Window Table', 'table', 4, 'active'),
  ('10000000-0000-4000-8000-000000000422', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000102', 'Event Corner Room', 'room', 20, 'active')
on conflict (id) do update set
  name = excluded.name,
  resource_type = excluded.resource_type,
  capacity = excluded.capacity,
  status = excluded.status,
  updated_at = now();

insert into public.bookings (id, business_id, branch_id, customer_id, staff_id, service_id, resource_id, booking_date, start_time, end_time, status, source, notes, internal_notes, total_amount, deposit_amount)
values
  ('10000000-0000-4000-8000-000000000501', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000301', '10000000-0000-4000-8000-000000000201', '10000000-0000-4000-8000-000000000411', '10000000-0000-4000-8000-000000000421', current_date, '10:00', '10:45', 'confirmed', 'dashboard', 'Oat milk tasting.', 'Prepare tasting tray.', 38.00, 10.00),
  ('10000000-0000-4000-8000-000000000502', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000102', '10000000-0000-4000-8000-000000000302', '10000000-0000-4000-8000-000000000202', '10000000-0000-4000-8000-000000000412', '10000000-0000-4000-8000-000000000422', current_date + 2, '15:00', '17:00', 'pending', 'portal', 'Planning team meetup.', null, 180.00, 50.00),
  ('10000000-0000-4000-8000-000000000503', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000303', null, null, '10000000-0000-4000-8000-000000000421', current_date - 1, '09:30', '10:30', 'completed', 'walk_in', 'Table booking completed.', null, 24.00, 0.00)
on conflict (id) do update set
  booking_date = excluded.booking_date,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  status = excluded.status,
  notes = excluded.notes,
  internal_notes = excluded.internal_notes,
  total_amount = excluded.total_amount,
  deposit_amount = excluded.deposit_amount,
  updated_at = now();

insert into public.booking_status_history (id, business_id, branch_id, booking_id, old_status, new_status, note)
values
  ('10000000-0000-4000-8000-000000000511', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000501', 'pending', 'confirmed', 'Demo confirmation.'),
  ('10000000-0000-4000-8000-000000000512', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000503', 'checked_in', 'completed', 'Demo completed booking.')
on conflict (id) do update set
  old_status = excluded.old_status,
  new_status = excluded.new_status,
  note = excluded.note,
  updated_at = now();

insert into public.membership_plans (id, business_id, branch_id, name, description, plan_type, price, duration_days, visit_limit, credit_amount, status)
values
  ('10000000-0000-4000-8000-000000000601', '10000000-0000-4000-8000-000000000001', null, 'Monthly Coffee Club', 'Monthly member benefits and reward boost.', 'monthly', 88.00, 30, null, null, 'active'),
  ('10000000-0000-4000-8000-000000000602', '10000000-0000-4000-8000-000000000001', null, 'Visit Pack 10', 'Ten prepaid cafe visits.', 'visit_package', 180.00, 120, 10, null, 'active')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  plan_type = excluded.plan_type,
  price = excluded.price,
  duration_days = excluded.duration_days,
  visit_limit = excluded.visit_limit,
  credit_amount = excluded.credit_amount,
  status = excluded.status,
  updated_at = now();

insert into public.memberships (id, business_id, branch_id, customer_id, membership_plan_id, membership_code, status, starts_at, expires_at, remaining_visits, remaining_credit)
values
  ('10000000-0000-4000-8000-000000000611', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000301', '10000000-0000-4000-8000-000000000601', 'MEM-001', 'active', current_date - 5, current_date + 25, null, null),
  ('10000000-0000-4000-8000-000000000612', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000102', '10000000-0000-4000-8000-000000000302', '10000000-0000-4000-8000-000000000602', 'MEM-002', 'active', current_date - 20, current_date + 100, 8, null)
on conflict (id) do update set
  status = excluded.status,
  starts_at = excluded.starts_at,
  expires_at = excluded.expires_at,
  remaining_visits = excluded.remaining_visits,
  remaining_credit = excluded.remaining_credit,
  updated_at = now();

insert into public.membership_usage (id, business_id, branch_id, membership_id, customer_id, booking_id, usage_type, quantity, note)
values
  ('10000000-0000-4000-8000-000000000621', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000611', '10000000-0000-4000-8000-000000000301', '10000000-0000-4000-8000-000000000501', 'visit', 1, 'Demo tasting usage.')
on conflict (id) do update set
  quantity = excluded.quantity,
  note = excluded.note,
  updated_at = now();

insert into public.product_categories (id, business_id, branch_id, name, description, display_order, status)
values
  ('10000000-0000-4000-8000-000000000701', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', 'Beverages', 'Coffee and cafe drinks.', 10, 'active'),
  ('10000000-0000-4000-8000-000000000702', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', 'Retail Beans', 'Packaged beans and retail items.', 20, 'active')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  display_order = excluded.display_order,
  status = excluded.status,
  updated_at = now();

insert into public.products (id, business_id, branch_id, category_id, sku, name, description, cost_price, selling_price, stock_quantity, low_stock_threshold, track_inventory, status)
values
  ('10000000-0000-4000-8000-000000000711', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000701', 'LATTE-001', 'Signature Latte', 'Demo latte POS item.', 4.20, 12.00, 80, 12, true, 'active'),
  ('10000000-0000-4000-8000-000000000712', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000702', 'BEANS-001', 'House Beans 250g', 'Retail coffee beans.', 18.00, 38.00, 14, 8, true, 'active')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  cost_price = excluded.cost_price,
  selling_price = excluded.selling_price,
  stock_quantity = excluded.stock_quantity,
  low_stock_threshold = excluded.low_stock_threshold,
  status = excluded.status,
  updated_at = now();

insert into public.inventory_transactions (id, business_id, branch_id, product_id, transaction_type, quantity, unit_cost, reference_type, note)
values
  ('10000000-0000-4000-8000-000000000721', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000711', 'stock_in', 80, 4.20, 'seed', 'Opening demo stock.'),
  ('10000000-0000-4000-8000-000000000722', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000712', 'stock_in', 14, 18.00, 'seed', 'Opening demo stock.')
on conflict (id) do update set
  quantity = excluded.quantity,
  unit_cost = excluded.unit_cost,
  note = excluded.note,
  updated_at = now();

insert into public.payment_methods (id, business_id, branch_id, name, method_type, instructions, is_active)
values
  ('10000000-0000-4000-8000-000000000801', '10000000-0000-4000-8000-000000000001', null, 'Cash', 'cash', 'Cash at counter.', true),
  ('10000000-0000-4000-8000-000000000802', '10000000-0000-4000-8000-000000000001', null, 'QR Pay', 'qr', 'Upload or verify QR payment manually.', true)
on conflict (id) do update set
  name = excluded.name,
  method_type = excluded.method_type,
  instructions = excluded.instructions,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.pos_orders (id, business_id, branch_id, customer_id, staff_id, order_number, status, subtotal, discount_amount, tax_amount, total_amount, paid_amount, notes, completed_at)
values
  ('10000000-0000-4000-8000-000000000811', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000301', '10000000-0000-4000-8000-000000000201', 'POS-0001', 'completed', 50.00, 0.00, 0.00, 50.00, 50.00, 'Demo member checkout.', now() - interval '2 hours'),
  ('10000000-0000-4000-8000-000000000812', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000303', '10000000-0000-4000-8000-000000000201', 'POS-0002', 'completed', 24.00, 2.00, 0.00, 22.00, 22.00, 'Demo loyalty checkout.', now() - interval '1 day')
on conflict (id) do update set
  status = excluded.status,
  subtotal = excluded.subtotal,
  discount_amount = excluded.discount_amount,
  tax_amount = excluded.tax_amount,
  total_amount = excluded.total_amount,
  paid_amount = excluded.paid_amount,
  notes = excluded.notes,
  completed_at = excluded.completed_at,
  updated_at = now();

insert into public.pos_order_items (id, business_id, branch_id, pos_order_id, product_id, item_name, item_type, quantity, unit_price, discount_amount, total_amount)
values
  ('10000000-0000-4000-8000-000000000821', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000811', '10000000-0000-4000-8000-000000000711', 'Signature Latte', 'product', 1, 12.00, 0.00, 12.00),
  ('10000000-0000-4000-8000-000000000822', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000811', '10000000-0000-4000-8000-000000000712', 'House Beans 250g', 'product', 1, 38.00, 0.00, 38.00),
  ('10000000-0000-4000-8000-000000000823', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000812', '10000000-0000-4000-8000-000000000711', 'Signature Latte', 'product', 2, 12.00, 2.00, 22.00)
on conflict (id) do update set
  quantity = excluded.quantity,
  unit_price = excluded.unit_price,
  discount_amount = excluded.discount_amount,
  total_amount = excluded.total_amount,
  updated_at = now();

insert into public.payments (id, business_id, branch_id, customer_id, payment_method_id, source_type, source_id, amount, currency, status, paid_at, note)
values
  ('10000000-0000-4000-8000-000000000831', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000301', '10000000-0000-4000-8000-000000000801', 'pos_order', '10000000-0000-4000-8000-000000000811', 50.00, 'MYR', 'paid', now() - interval '2 hours', 'Demo cash payment.'),
  ('10000000-0000-4000-8000-000000000832', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000303', '10000000-0000-4000-8000-000000000802', 'pos_order', '10000000-0000-4000-8000-000000000812', 22.00, 'MYR', 'paid', now() - interval '1 day', 'Demo QR payment.'),
  ('10000000-0000-4000-8000-000000000833', '10000000-0000-4000-8000-000000000102', '10000000-0000-4000-8000-000000000302', '10000000-0000-4000-8000-000000000802', 'booking', '10000000-0000-4000-8000-000000000502', 50.00, 'MYR', 'pending', null, 'Demo booking deposit pending.')
on conflict (id) do update set
  amount = excluded.amount,
  status = excluded.status,
  paid_at = excluded.paid_at,
  note = excluded.note,
  updated_at = now();

insert into public.receipts (id, business_id, branch_id, payment_id, pos_order_id, receipt_number, file_url, issued_at)
values
  ('10000000-0000-4000-8000-000000000841', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000831', '10000000-0000-4000-8000-000000000811', 'RCT-0001', 'https://example.com/demo/receipt-rct-0001.pdf', now() - interval '2 hours'),
  ('10000000-0000-4000-8000-000000000842', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000832', '10000000-0000-4000-8000-000000000812', 'RCT-0002', 'https://example.com/demo/receipt-rct-0002.pdf', now() - interval '1 day')
on conflict (id) do update set
  file_url = excluded.file_url,
  issued_at = excluded.issued_at,
  updated_at = now();

insert into public.loyalty_transactions (id, business_id, branch_id, customer_id, source_type, source_id, transaction_type, points, balance_after, note)
values
  ('10000000-0000-4000-8000-000000000901', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000301', 'pos_order', '10000000-0000-4000-8000-000000000811', 'earn', 50, 150, 'Demo POS earn.'),
  ('10000000-0000-4000-8000-000000000902', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000303', 'pos_order', '10000000-0000-4000-8000-000000000812', 'earn', 22, 72, 'Demo QR earn.'),
  ('10000000-0000-4000-8000-000000000903', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000301', 'manual', null, 'adjust', 100, 100, 'Welcome bonus.')
on conflict (id) do update set
  points = excluded.points,
  balance_after = excluded.balance_after,
  note = excluded.note,
  updated_at = now();

insert into public.rewards (id, business_id, branch_id, name, description, points_required, reward_type, value, status)
values
  ('10000000-0000-4000-8000-000000000911', '10000000-0000-4000-8000-000000000001', null, 'Free Latte', 'Redeem one signature latte.', 120, 'free_product', 12.00, 'active'),
  ('10000000-0000-4000-8000-000000000912', '10000000-0000-4000-8000-000000000001', null, 'RM10 Voucher', 'Discount voucher for next purchase.', 200, 'voucher', 10.00, 'active')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  points_required = excluded.points_required,
  reward_type = excluded.reward_type,
  value = excluded.value,
  status = excluded.status,
  updated_at = now();

insert into public.reward_redemptions (id, business_id, branch_id, reward_id, customer_id, points_used, status, redeemed_at)
values
  ('10000000-0000-4000-8000-000000000921', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000911', '10000000-0000-4000-8000-000000000301', 120, 'approved', now() - interval '3 days')
on conflict (id) do update set
  points_used = excluded.points_used,
  status = excluded.status,
  redeemed_at = excluded.redeemed_at,
  updated_at = now();

insert into public.notification_templates (id, business_id, branch_id, template_key, channel, subject, body, is_active)
values
  ('10000000-0000-4000-8000-000000000931', '10000000-0000-4000-8000-000000000001', null, 'booking_confirmation', 'in_app', 'Booking confirmed', 'Your booking is confirmed. Thank you.', true),
  ('10000000-0000-4000-8000-000000000932', '10000000-0000-4000-8000-000000000001', null, 'membership_expiry', 'email', 'Membership expiry reminder', 'Your membership is expiring soon.', true),
  ('10000000-0000-4000-8000-000000000933', '10000000-0000-4000-8000-000000000001', null, 'backup_ready', 'in_app', 'Backup ready', 'Your backup export is ready to download.', true)
on conflict (id) do update set
  template_key = excluded.template_key,
  channel = excluded.channel,
  subject = excluded.subject,
  body = excluded.body,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.notifications (id, business_id, branch_id, customer_id, channel, title, message, status, sent_at)
values
  ('10000000-0000-4000-8000-000000000941', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000301', 'in_app', 'Booking confirmed', 'Your demo booking is confirmed.', 'sent', now() - interval '1 hour')
on conflict (id) do update set
  title = excluded.title,
  message = excluded.message,
  status = excluded.status,
  sent_at = excluded.sent_at,
  updated_at = now();

insert into public.staff_commissions (id, business_id, branch_id, staff_id, source_type, source_id, commission_type, base_amount, commission_rate, commission_amount, status)
values
  ('10000000-0000-4000-8000-000000000951', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000201', 'pos_order', '10000000-0000-4000-8000-000000000811', 'percentage', 50.00, 0.0500, 2.50, 'approved')
on conflict (id) do update set
  base_amount = excluded.base_amount,
  commission_rate = excluded.commission_rate,
  commission_amount = excluded.commission_amount,
  status = excluded.status,
  updated_at = now();

-- Owner-only backup/export demo history. RLS allows only the Owner to access the full backup page and download completed full backups.
insert into public.backup_exports (id, business_id, branch_id, export_type, export_scope, export_format, date_from, date_to, file_url, file_size, status, completed_at, error_message, metadata)
values
  ('10000000-0000-4000-8000-000000001001', '10000000-0000-4000-8000-000000000001', null, 'full_business', 'full_business', 'zip', current_date - 30, current_date, 'https://example.com/demo/luxantara-full-business-backup.zip', 4288000, 'completed', now() - interval '1 day', null, jsonb_build_object('seeded_demo', true, 'owner_only', true, 'tables', array['businesses', 'branches', 'customers', 'bookings', 'memberships', 'loyalty_transactions', 'pos_orders', 'inventory_transactions', 'payments', 'settings'])),
  ('10000000-0000-4000-8000-000000001002', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', 'bookings', 'module', 'csv', current_date - 7, current_date, 'https://example.com/demo/luxantara-bookings-export.csv', 148000, 'completed', now() - interval '8 hours', null, jsonb_build_object('seeded_demo', true, 'module', 'bookings')),
  ('10000000-0000-4000-8000-000000001003', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000102', 'branch_data', 'branch', 'json', current_date - 14, current_date, null, null, 'processing', null, null, jsonb_build_object('seeded_demo', true, 'branch_scope', 'Event Corner')),
  ('10000000-0000-4000-8000-000000001004', '10000000-0000-4000-8000-000000000001', null, 'reports', 'module', 'pdf', current_date - 30, current_date, null, null, 'failed', null, 'Demo failed report export for status testing.', jsonb_build_object('seeded_demo', true, 'module', 'reports'))
on conflict (id) do update set
  export_type = excluded.export_type,
  export_scope = excluded.export_scope,
  export_format = excluded.export_format,
  date_from = excluded.date_from,
  date_to = excluded.date_to,
  file_url = excluded.file_url,
  file_size = excluded.file_size,
  status = excluded.status,
  completed_at = excluded.completed_at,
  error_message = excluded.error_message,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.backup_export_items (id, backup_export_id, table_name, record_count, status)
values
  ('10000000-0000-4000-8000-000000001101', '10000000-0000-4000-8000-000000001001', 'customers', 3, 'completed'),
  ('10000000-0000-4000-8000-000000001102', '10000000-0000-4000-8000-000000001001', 'bookings', 3, 'completed'),
  ('10000000-0000-4000-8000-000000001103', '10000000-0000-4000-8000-000000001001', 'memberships', 2, 'completed'),
  ('10000000-0000-4000-8000-000000001104', '10000000-0000-4000-8000-000000001001', 'pos_orders', 2, 'completed'),
  ('10000000-0000-4000-8000-000000001105', '10000000-0000-4000-8000-000000001002', 'bookings', 3, 'completed'),
  ('10000000-0000-4000-8000-000000001106', '10000000-0000-4000-8000-000000001003', 'branches', 1, 'processing'),
  ('10000000-0000-4000-8000-000000001107', '10000000-0000-4000-8000-000000001004', 'reports', 0, 'failed')
on conflict (id) do update set
  record_count = excluded.record_count,
  status = excluded.status,
  updated_at = now();

insert into public.audit_logs (id, business_id, branch_id, actor_role, action, entity_table, entity_id, new_values, metadata)
values
  ('10000000-0000-4000-8000-000000001201', '10000000-0000-4000-8000-000000000001', null, 'owner', 'seed_demo_data_created', 'businesses', '10000000-0000-4000-8000-000000000001', jsonb_build_object('demo_business', 'Luxantara Demo Coffee'), jsonb_build_object('seeded_demo', true)),
  ('10000000-0000-4000-8000-000000001202', '10000000-0000-4000-8000-000000000001', null, 'owner', 'backup_export_created', 'backup_exports', '10000000-0000-4000-8000-000000001001', jsonb_build_object('export_type', 'full_business', 'status', 'completed'), jsonb_build_object('seeded_demo', true, 'owner_only', true))
on conflict (id) do update set
  new_values = excluded.new_values,
  metadata = excluded.metadata,
  updated_at = now();
