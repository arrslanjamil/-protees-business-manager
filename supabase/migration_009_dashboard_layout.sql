-- Protees Business Manager — Dashboard widget layout persistence
--
-- Adds a single small table so each app user's drag-and-drop dashboard
-- widget order survives a page refresh (and follows them between devices,
-- since it's keyed by their app_users row, not the browser).
--
-- One row per user, upserted from the client whenever they reorder a
-- widget. Not part of the audit trail (stamp_and_log_audit) — this is a
-- personal UI preference, not a business record.
--
-- Safe to re-run.

create table if not exists dashboard_layouts (
  user_id uuid primary key references app_users(id) on delete cascade,
  widget_order text[] not null,
  updated_at timestamptz not null default now()
);

alter table dashboard_layouts enable row level security;

drop policy if exists "users manage their own dashboard layout" on dashboard_layouts;
create policy "users manage their own dashboard layout" on dashboard_layouts
  for all using (is_app_user() and user_id = auth.uid())
  with check (is_app_user() and user_id = auth.uid());
