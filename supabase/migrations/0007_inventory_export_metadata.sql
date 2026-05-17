-- Luxantara Members - Phase 12 Inventory export metadata support.

alter table public.backup_exports
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists inventory_transactions_business_type_created_idx
  on public.inventory_transactions (business_id, transaction_type, created_at desc);

create index if not exists products_business_category_supplier_idx
  on public.products (business_id, category_id, supplier_id)
  where deleted_at is null;
