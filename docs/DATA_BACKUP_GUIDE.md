# Data Backup Guide

Data Backup is Owner-only.

Open:

`Settings > Data Backup`

## Backup Options

- Backup All Data
- Export by Module
- Export by Date Range
- Export by Branch
- Optional report export: PDF, Excel, CSV

## Supported Export Formats

- CSV
- JSON
- ZIP for full business backup structure
- PDF, Excel, CSV for reports

## Security

Backup must:

- Filter by `business_id`
- Filter by `branch_id` when selected
- Respect RLS
- Create `backup_exports`
- Create `backup_export_items`
- Create audit logs
- Use signed or access-controlled URLs for stored files

## Storage

If backup output is generated as files, store files in a private Supabase Storage bucket such as `backup-exports`.

Use signed URLs with expiration. Do not make full backup files public.

## Restore Preparation

`import_restore_jobs` supports optional restore/import preparation. Restore must require explicit Owner confirmation before data is changed.
