-- Luxantara Members - Phase 9 Membership export metadata support.

alter table public.backup_exports
  add column if not exists metadata jsonb not null default '{}'::jsonb;
