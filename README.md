# Luxantara Members

Luxantara Members is a private-use Membership + Booking + POS system for owner-managed businesses. It is not a SaaS, does not include pricing packages, does not include Super Admin, and does not include platform billing, reseller, or white-label flows.

## Production Status

The repository includes:

- React + TypeScript + Vite frontend
- Tailwind CSS and ShadCN-style UI primitives
- Supabase Auth client integration
- Supabase PostgreSQL schema migrations
- Supabase RLS policies and helper functions
- Seed/demo data
- Role-based route protection
- Module-aware route and sidebar protection
- Business setup wizard
- Business type and preset system
- Module settings system
- Booking, membership, loyalty, POS, inventory, branch, customer portal, settings, and backup/export foundations
- Owner-only Data Backup page with backup history and audit logging structure

## Core Rules

- Private-use only.
- No SaaS pricing.
- No package tiers.
- No upgrade prompts.
- No Super Admin.
- Owner controls the business.
- Business data is isolated by `business_id`.
- Branch-level records use `branch_id`.
- Disabled modules are hidden in the frontend and protected by database/RLS logic.
- Owner can backup/export business data anytime.
- Salon, Spa, and Event Space are supported business types but do not have presets.

## Quick Start

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Fill `.env.local` with:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

## Production Build

```powershell
npm.cmd run build
npm.cmd run preview
```

## Supabase Setup

Apply migrations in order from `supabase/migrations`, then run `supabase/seed.sql` if you want demo data.

Important files:

- `supabase/migrations/0001_initial_schema.sql`
- `supabase/migrations/0002_rls_security.sql`
- `supabase/migrations/0003_booking_public_and_export.sql`
- `supabase/migrations/0004_membership_export_metadata.sql`
- `supabase/migrations/0005_loyalty_export_metadata.sql`
- `supabase/migrations/0006_pos_export_metadata.sql`
- `supabase/migrations/0007_inventory_export_metadata.sql`
- `supabase/migrations/0008_branch_backup_metadata.sql`
- `supabase/migrations/0009_customer_portal_security.sql`
- `supabase/migrations/0010_settings_backup_audit.sql`
- `supabase/seed.sql`

## Documentation

- [Environment Setup](docs/ENVIRONMENT_SETUP.md)
- [Supabase Setup](docs/SUPABASE_SETUP.md)
- [Database Guide](docs/DATABASE_GUIDE.md)
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [User Guide](docs/USER_GUIDE.md)
- [Owner Guide](docs/OWNER_GUIDE.md)
- [Staff Guide](docs/STAFF_GUIDE.md)
- [Module Guide](docs/MODULE_GUIDE.md)
- [Business Type Guide](docs/BUSINESS_TYPE_GUIDE.md)
- [Business Preset Guide](docs/BUSINESS_PRESET_GUIDE.md)
- [Data Backup Guide](docs/DATA_BACKUP_GUIDE.md)
- [Data Export Guide](docs/DATA_EXPORT_GUIDE.md)
- [Data Ownership Guide](docs/DATA_OWNERSHIP_GUIDE.md)
- [Phase 23 Testing and Validation](docs/PHASE_23_TESTING_VALIDATION.md)

## Validation

```powershell
npm.cmd run build
npm.cmd run lint
```

`npm.cmd run lint` currently completes with warnings only. Remaining warnings are documented in the Phase 23 validation guide.
