-- Protees Business Manager — Contract / Piece-Rate employee type
--
-- Adds:
--   1. employees.employee_type ('monthly' | 'contract'), defaulting existing
--      rows to 'monthly' so current behavior is unchanged for everyone.
--   2. employees.rate_per_piece — only meaningful for contract employees.
--   3. salary_payments.pieces_completed / rate_per_piece — a snapshot of the
--      calculation inputs at payment time, so a later rate change never
--      alters historical payments (same "snapshot, don't recompute"
--      approach already used elsewhere in this schema).
--
-- Existing "monthly" flow (manual salary entry) is completely unchanged.
-- Audit trail needs no changes — the existing stamp_and_log_audit()
-- trigger on employees/salary_payments already captures every column via
-- to_jsonb(new)/to_jsonb(old), so these new columns are automatically
-- included in created/updated audit log entries.
--
-- Safe to re-run.

alter table employees add column if not exists employee_type text not null default 'monthly';
alter table employees drop constraint if exists employees_employee_type_check;
alter table employees add constraint employees_employee_type_check
  check (employee_type in ('monthly', 'contract'));

alter table employees add column if not exists rate_per_piece numeric(12,2);

alter table salary_payments add column if not exists pieces_completed int;
alter table salary_payments add column if not exists rate_per_piece numeric(12,2);
