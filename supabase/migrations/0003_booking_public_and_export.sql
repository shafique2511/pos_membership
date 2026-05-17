-- Luxantara Members - Phase 8 Booking public access and export metadata.

alter table public.backup_exports
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create policy "Public can read active businesses for booking pages"
on public.businesses for select
to anon
using (
  status = 'active'
  and deleted_at is null
  and exists (
    select 1
    from public.business_modules bm
    where bm.business_id = businesses.id
      and bm.module_key in ('bookings', 'customer_portal')
      and bm.is_enabled = true
  )
);

create policy "Public can read active booking branches"
on public.branches for select
to anon
using (
  status = 'active'
  and deleted_at is null
  and exists (
    select 1
    from public.business_modules bm
    where bm.business_id = branches.business_id
      and bm.module_key = 'bookings'
      and bm.is_enabled = true
  )
);

create policy "Public can read active booking services"
on public.services for select
to anon
using (
  status = 'active'
  and deleted_at is null
  and exists (
    select 1
    from public.business_modules bm
    where bm.business_id = services.business_id
      and bm.module_key = 'bookings'
      and bm.is_enabled = true
  )
);

create policy "Public can read active bookable resources"
on public.bookable_resources for select
to anon
using (
  status = 'active'
  and deleted_at is null
  and exists (
    select 1
    from public.business_modules bm
    where bm.business_id = bookable_resources.business_id
      and bm.module_key = 'bookings'
      and bm.is_enabled = true
  )
);

create policy "Public can create pending booking requests"
on public.bookings for insert
to anon
with check (
  source = 'public'
  and status = 'pending'
  and deleted_at is null
  and exists (
    select 1
    from public.business_modules bm
    where bm.business_id = bookings.business_id
      and bm.module_key = 'bookings'
      and bm.is_enabled = true
  )
);
