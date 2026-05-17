-- Settings and backup hardening for Phase 20.

create index if not exists backup_exports_business_created_at_idx
  on public.backup_exports (business_id, created_at desc);

create index if not exists backup_exports_business_scope_status_idx
  on public.backup_exports (business_id, export_scope, status);

create index if not exists payment_methods_business_active_idx
  on public.payment_methods (business_id, is_active);

create index if not exists notification_templates_business_channel_idx
  on public.notification_templates (business_id, channel);

create or replace function public.audit_backup_export_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (
    business_id,
    branch_id,
    actor_user_id,
    actor_role,
    action,
    entity_table,
    entity_id,
    new_values,
    metadata
  )
  values (
    new.business_id,
    new.branch_id,
    new.requested_by,
    public.get_current_user_role(new.business_id),
    'backup_export_created',
    'backup_exports',
    new.id,
    to_jsonb(new),
    jsonb_build_object(
      'export_type', new.export_type,
      'export_scope', new.export_scope,
      'export_format', new.export_format,
      'date_from', new.date_from,
      'date_to', new.date_to
    )
  );

  return new;
end;
$$;

drop trigger if exists backup_exports_audit_insert on public.backup_exports;
create trigger backup_exports_audit_insert
after insert on public.backup_exports
for each row
execute function public.audit_backup_export_created();
