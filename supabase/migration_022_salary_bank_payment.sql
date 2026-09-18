-- Protees Business Manager — Salary payments: Online payment method deducts
-- from a specific bank account (previously any non-Cash payment method just
-- recorded a manual reference number and never touched any ledger).
--
-- salary_payments.bank_account_id records which bank account an Online
-- payment was deducted from, mirroring how couriers.bank_account_id already
-- links a bank-transfer courier to its receiving account.

alter table salary_payments add column if not exists bank_account_id bigint references bank_accounts(id);

-- Allow salary_payment as a reference_type on bank_transactions (widening
-- the existing constraint, not replacing its earlier additions) — an Online
-- salary payment posts a linked 'debit' row here.
alter table bank_transactions drop constraint if exists bank_transactions_reference_type_check;
alter table bank_transactions add constraint bank_transactions_reference_type_check
  check (reference_type in ('courier_payment', 'cash_withdrawal', 'manual', 'courier_collection', 'cash_transfer', 'creditor_payment', 'salary_payment'));
