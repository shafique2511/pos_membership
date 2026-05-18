# Data Ownership Guide

The business Owner owns the business data.

Business-owned data includes:

- Business profile
- Branches
- Staff
- Customers
- Bookings
- Memberships
- Loyalty records
- POS orders
- Products and inventory
- Payments, invoices, receipts
- Reports
- Uploaded files
- Settings
- Audit logs related to the business

## Platform Responsibility

The system stores, processes, and protects data. It does not create a SaaS resale or platform billing model.

## Isolation

All business data must be isolated by `business_id`. Branch data must use `branch_id` where applicable.

No business can access another business data.

## Export Rights

Owner can export data anytime from Data Backup. Customer portal users can access their own portal data and receipts when enabled, but cannot export full business data.
