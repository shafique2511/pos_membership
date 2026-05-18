# Supabase Setup

## Project Services

Enable:

- Supabase Auth
- PostgreSQL
- Row Level Security
- Storage, if backups or receipts are stored as files

## Apply SQL

Run migrations in order:

1. `0001_initial_schema.sql`
2. `0002_rls_security.sql`
3. `0003_booking_public_and_export.sql`
4. `0004_membership_export_metadata.sql`
5. `0005_loyalty_export_metadata.sql`
6. `0006_pos_export_metadata.sql`
7. `0007_inventory_export_metadata.sql`
8. `0008_branch_backup_metadata.sql`
9. `0009_customer_portal_security.sql`
10. `0010_settings_backup_audit.sql`

Then optionally run `supabase/seed.sql`.

## Auth Roles

Roles are stored in `user_profiles.role`:

- `owner`
- `manager`
- `staff`
- `customer`

Create the Supabase Auth user first, then link it to `user_profiles.user_id`. Customers should also be linked to `customers.user_id` for customer portal access.

## Storage

Recommended buckets:

- `receipts`
- `backup-exports`
- `uploads`

Backup files should use signed URLs or access-controlled downloads. Do not expose permanent public backup URLs in production.

## RLS

RLS must remain enabled. Do not bypass RLS from the frontend. Backend jobs that use service-role access must explicitly filter by `business_id` and log actions in `audit_logs`.
