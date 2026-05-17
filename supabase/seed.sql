-- Luxantara Members - Phase 2 Seed Data
-- Seeds business types, private-use modules, and presets.

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

insert into public.business_presets (
  business_type_id,
  preset_key,
  name,
  description,
  recommended_module_keys,
  optional_module_keys
)
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

insert into public.business_presets (
  business_type_id,
  preset_key,
  name,
  description,
  recommended_module_keys,
  optional_module_keys
)
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

insert into public.business_presets (
  business_type_id,
  preset_key,
  name,
  description,
  recommended_module_keys,
  optional_module_keys
)
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

insert into public.business_presets (
  business_type_id,
  preset_key,
  name,
  description,
  recommended_module_keys,
  optional_module_keys
)
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

-- Intentionally no preset records for Salon, Spa, or Event Space.
