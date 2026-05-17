# Phase 23 Testing and Validation

This checklist validates Luxantara Members as a private-use system. It assumes all migrations have been applied, `supabase/seed.sql` has been run, and test users exist for Owner, Manager, Staff, and Customer roles.

## Local Verification

| Check | Command | Result |
| --- | --- | --- |
| TypeScript and production build | `npm.cmd run build` | Passed |
| ESLint | `npm.cmd run lint` | Passed with warnings only |

Known warnings:
- React hook exhaustive dependency warnings remain in several pages.
- Fast Refresh warnings remain where context/helper files export non-component functions.
- Vite reports a large bundle warning. Add route-level lazy loading before final production release.

## Required Test Users

Create or link these Supabase Auth users to `user_profiles` and `customers`:

| Role | Expected Access |
| --- | --- |
| Owner | Full dashboard, module settings, full Data Backup |
| Manager | Assigned business/branch, reports export only if permission enabled |
| Staff | Assigned operational records only, no full backup |
| Customer | Customer portal only, own bookings/memberships/loyalty/payments/receipts |

## Authentication

| Test | Steps | Expected Result |
| --- | --- | --- |
| Owner login | Login through `/auth/login` | Redirects to `/dashboard` |
| Manager login | Login through `/auth/login` | Redirects to `/dashboard`, role shown as manager |
| Staff login | Login through `/auth/login` | Redirects to `/dashboard`, branch-scoped access |
| Customer login | Login through `/portal/login` | Redirects to `/portal` |
| Forgot password | Submit `/auth/forgot-password` | Supabase reset email is requested |
| Logout | Use topbar logout | Session clears and user returns to login |

## Role Permissions

| Test | Expected Result |
| --- | --- |
| Owner opens `/settings/modules` | Allowed |
| Manager opens `/settings/modules` | Denied |
| Staff opens `/settings/modules` | Denied |
| Owner opens `/settings/data-backup` | Allowed |
| Manager opens `/settings/data-backup` | Denied unless future Owner-level logic is explicitly changed |
| Staff opens `/settings/data-backup` | Denied |
| Customer opens `/settings/data-backup` | Denied |
| Customer opens `/dashboard` | Denied |

## Business Data Isolation

Create a second business with a separate Owner.

| Test | Expected Result |
| --- | --- |
| Owner A queries customers for Business B | No rows returned |
| Manager A queries bookings for Business B | No rows returned |
| Staff A queries inventory for another branch they cannot access | No rows returned |
| Customer A queries another customer profile | No rows returned |
| Backup export for Business A | Contains only Business A `business_id` rows |

## Module Settings and Sidebar

| Test | Steps | Expected Result |
| --- | --- | --- |
| Disable Bookings | Owner disables booking module | Booking sidebar item disappears |
| Open disabled route | Visit `/dashboard/bookings` | Frontend denies access |
| Backend module protection | Query booking module data as unauthorized role | RLS/helper policies block access |
| Re-enable module | Owner enables module | Sidebar item returns |
| Hide sidebar only | Owner hides Data Backup sidebar | Owner can still access `/settings/data-backup` |
| Old disabled module data backup | Disable POS, then export POS sales as Owner | Export job can still be created for old POS data |

## Business Type and Preset Validation

| Test | Expected Result |
| --- | --- |
| Select Barber Shop | Preset option is available |
| Select Coffee Shop | Preset option is available |
| Select Clinic | Preset option is available |
| Select Custom Business | Preset option is available |
| Select Salon | No preset is applied, manual customization required |
| Select Spa | No preset is applied, manual customization required |
| Select Event Space | No preset is applied, manual customization required |
| Change type and keep modules | Business type changes, module settings remain |
| Change type and apply preset | Only allowed if selected type has preset |
| Change type with no preset | Flow goes to manual customization |

SQL validation:

```sql
select bt.type_key, count(bp.id) as preset_count
from public.business_types bt
left join public.business_presets bp on bp.business_type_id = bt.id
group by bt.type_key
order by bt.type_key;
```

Expected:
- `barber_shop`, `coffee_shop`, `clinic`, `custom_business`: preset count >= 1
- `salon`, `spa`, `event_space`: preset count = 0

## Operational Flows

| Area | Test | Expected Result |
| --- | --- | --- |
| Booking | Create booking from dashboard | Booking row created with correct `business_id` and `branch_id` |
| Booking | Cancel/reschedule from customer portal | Only linked customer booking is updated |
| Membership | Assign membership | Membership row created and visible in customer portal |
| Membership | Deduct visit/credit | Usage row created |
| Loyalty | Earn/adjust/redeem points | Loyalty transactions and redemption records update |
| POS | Checkout with split payment | POS order, items, payment, receipt records created |
| Inventory | POS checkout for product | Inventory deduction transaction created |
| Payments | Record booking deposit/payment | Payment row scoped to business/customer/branch |
| Staff commission | Create/approve commission | Commission status updates and remains protected |
| Notifications | Create template and notification | Notification rows scoped to business/customer/profile |
| Reports | Open reports module | Only enabled-module data appears |

## Customer Portal

| Test | Expected Result |
| --- | --- |
| Public page `/public/:businessSlug` | Shows business public data and booking links |
| Customer dashboard | Shows linked customer metrics only |
| Customer bookings | Shows only own booking history |
| Customer membership | Shows only own membership and QR member card |
| Customer rewards | Shows own points and available rewards |
| Customer payments | Shows own payment history |
| Receipt download disabled | Receipt number visible, file download hidden |
| Receipt download enabled | Download link visible for own receipt |
| Customer profile update | Updates only linked `customers` row |

## Backup Testing

| Test | Steps | Expected Result |
| --- | --- | --- |
| Backup all data | Owner clicks Backup All Data | `backup_exports` row with `export_scope = 'full_business'` |
| Export by module | Owner selects Customers/Bookings/etc. | `backup_exports.export_type` matches selected scope |
| Export by branch | Owner selects branch | `backup_exports.branch_id` is set |
| Export by date range | Owner sets dates | `date_from` and `date_to` stored |
| CSV export | Select CSV | `export_format = 'csv'` |
| JSON export | Select JSON | `export_format = 'json'` |
| Report export | Select PDF/Excel/CSV | Report export job created |
| Download backup | Completed job has `file_url` | Download button appears |
| Backup history | Open Data Backup page | History table shows latest jobs |
| Audit logs | Create backup/export | `audit_logs.action` includes backup export action |
| Manager full backup | Manager opens `/settings/data-backup` | Denied |
| Manager report export | Enable manager report export permission | Manager can use report export path only where implemented |
| Staff backup | Staff opens `/settings/data-backup` | Denied |
| Customer backup | Customer opens `/settings/data-backup` | Denied |
| Business isolation | Create backup under Business A | Export metadata/items reference only Business A |

Audit SQL:

```sql
select action, entity_table, entity_id, created_at
from public.audit_logs
where business_id = '<business_id>'
  and action in ('backup_export_created', 'backup_export_requested')
order by created_at desc;
```

## RLS Policy Validation

Run these as authenticated users with different JWT sessions in Supabase SQL editor or through app requests.

| Role | Query Target | Expected Result |
| --- | --- | --- |
| Owner | Own business tables | Rows returned |
| Owner | Other business tables | No rows |
| Manager | Assigned branch records | Rows returned |
| Manager | Other branch if restricted | No rows |
| Staff | Assigned bookings/customers/POS | Rows returned as allowed |
| Staff | Backup exports | No full backup rows |
| Customer | Own customers row | Row returned |
| Customer | Staff/POS/inventory/reports | No rows |

## Mobile and Dark Mode

| Test | Expected Result |
| --- | --- |
| Dashboard at 390px width | Sidebar replaced by mobile navigation, no horizontal layout break |
| Customer portal at 390px width | Bottom navigation remains usable |
| POS page at mobile width | Cart and catalog stack cleanly |
| Data Backup mobile | Filters and export cards stack cleanly |
| Dark mode class on root | Components use CSS variables and remain readable |

## Current Validation Result

Passed locally:
- Build
- ESLint with zero errors
- Route guard/static access review
- Seed data rule review for no Salon/Spa/Event Space presets

Requires live Supabase project:
- RLS execution checks
- Auth login/session checks
- Real backup file generation/download
- Cross-business isolation proof
- Customer receipt storage download
- Mobile browser visual QA
