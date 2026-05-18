# Database Guide

## Core Design

All business-owned data is scoped with `business_id`. Branch-level records also use `branch_id`.

Important security helpers are defined in `0002_rls_security.sql`, including:

- `get_current_user_id()`
- `get_current_business_id()`
- `get_current_user_role()`
- `is_owner()`
- `is_manager()`
- `is_staff()`
- `is_customer()`
- `has_module_enabled(module_key text)`
- `can_access_branch(...)`
- `can_export_business_data(...)`
- `can_export_reports(...)`
- `can_download_backup(...)`

## Schema Coverage

The schema includes:

- Businesses and branches
- User profiles and role permissions
- Business types and presets
- Module catalog, business modules, module settings
- Customers, staff, services, resources, bookings
- Memberships and loyalty
- POS, inventory, payments, invoices, receipts
- Notifications and marketing
- Backup exports, export items, restore jobs, audit logs

## Indexing

Indexes cover common production filters:

- `business_id`
- `branch_id`
- `customer_id`
- `staff_id`
- `booking_date`
- `status`
- `created_at`
- `module_key`

## Audit Logs

Sensitive actions must write to `audit_logs`. Backup export creation is also audited by the `backup_exports_audit_insert` trigger.

## Restore/Import

`import_restore_jobs` is prepared for optional restore workflows. Restore must never run automatically. Require Owner confirmation before any import modifies production data.
