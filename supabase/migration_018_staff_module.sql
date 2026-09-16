-- Protees Business Manager — Staff Module improvements.
--
-- 1. employees.is_active — Active/Inactive status. Default true so every
--    existing employee stays active. This is NOT a delete: an inactive
--    employee keeps every advance, salary payment, and audit log entry —
--    the app filters them out of payroll/roster calculations in code,
--    the row itself is never touched by that filtering.
--
--    Who changed it and when is already captured for free by the
--    existing stamp_and_log_audit trigger on employees (it logs every
--    UPDATE with old/new values, including is_active) — no separate
--    audit mechanism needed.
--
--    Scoped to `employees` only, not `supervisors` — Protees Unit has a
--    single supervisor per unit (a config field, not a roster of staff
--    cards), so "Active/Inactive staff card" doesn't apply there.
--
-- 2. advances.payment_method / salary_payments.payment_method — how the
--    payment was made. Free text (like expense_categories), backed by
--    the 'payment_method' Master Data type from migration_016 so admin
--    can add new methods (Easypaisa, JazzCash, ...) without a deploy.
--    Nullable: existing rows have no recorded method (unknown, not
--    "Cash"), the app requires it going forward on new entries.
--
-- Safe to re-run.

alter table employees add column if not exists is_active boolean not null default true;

alter table advances add column if not exists payment_method text;
alter table salary_payments add column if not exists payment_method text;

insert into master_data_items (type_key, name, sort_order) values
  ('payment_method', 'Online Transfer', 40),
  ('payment_method', 'Easypaisa', 50),
  ('payment_method', 'JazzCash', 60)
on conflict (type_key, name) do nothing;
