-- Add bank account tracking to advances
-- Supports non-cash advances (bank transfers) with bank account references
--
-- Safe to re-run.

alter table advances add column if not exists payment_method text;
alter table advances add column if not exists reference_number text;
alter table advances add column if not exists bank_account_id bigint references bank_accounts(id) on delete set null;

create index if not exists idx_advances_bank_account on advances(bank_account_id);
