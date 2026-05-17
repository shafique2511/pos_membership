-- Luxantara Members - Phase 10 Loyalty export metadata support.

alter table public.backup_exports
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists rewards_business_reward_type_idx
  on public.rewards (business_id, reward_type)
  where deleted_at is null;

create index if not exists reward_redemptions_business_status_idx
  on public.reward_redemptions (business_id, status);
