-- Luxantara Members - Phase 18 Multi-Branch backup metadata support.

alter table public.backup_exports
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists user_profiles_business_branch_role_idx
  on public.user_profiles (business_id, branch_id, role)
  where deleted_at is null;

create index if not exists branches_business_default_idx
  on public.branches (business_id, is_default)
  where deleted_at is null;
