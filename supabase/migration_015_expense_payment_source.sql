-- Protees Business Manager — Expense Payment Source.
--
-- Tracks whether each expense was paid from Office Cash or Online/Bank.
-- Only 'cash' expenses post a linked cash_transactions cash-out entry
-- (see addExpense/updateExpense in DataContext.tsx) — 'online' expenses
-- are recorded and reportable but never touch the Office Cash balance.
--
-- NOT NULL DEFAULT 'cash' on ADD COLUMN backfills every existing expense
-- as Office Cash automatically — no separate backfill step needed, and
-- existing reports/totals are unaffected since 'cash' was already the
-- only behavior before this column existed.
--
-- Safe to re-run.

alter table expenses add column if not exists payment_source text not null default 'cash' check (payment_source in ('cash', 'online'));
