-- Luxantara Members - Phase 11 POS export metadata support.

alter table public.backup_exports
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists payments_business_method_created_idx
  on public.payments (business_id, payment_method_id, created_at desc)
  where deleted_at is null;

create index if not exists pos_orders_business_staff_created_idx
  on public.pos_orders (business_id, staff_id, created_at desc)
  where deleted_at is null;
