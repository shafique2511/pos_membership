# Module Guide

Modules control feature visibility and backend access.

Main modules:

- Core Business System
- Booking
- Membership
- Loyalty & Rewards
- POS
- Inventory
- Staff
- Staff Commission
- Payment
- Notification
- Reports
- Marketing
- Multi-Branch
- Customer Portal
- Settings
- Data Backup & Export

## Module Rules

- Core, Settings, and Owner backup access cannot be removed from the Owner.
- Disabled modules are hidden from sidebar navigation.
- Disabled modules are also protected by route guards and RLS helper functions.
- Owner can enable or disable modules anytime.
- Old disabled-module data remains exportable by Owner for data ownership and migration needs.

## No Upgrade Flow

There are no SaaS packages, no pricing tiers, no upgrade prompts, and no platform billing.
