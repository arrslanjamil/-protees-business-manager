-- Per-transaction Cash / Online records for courier collections and expenses.
-- Amounts are never changed; existing collections are classified from their courier's configured method.
alter table courier_collections add column if not exists payment_method text check (payment_method in ('cash', 'online'));
alter table courier_collections add column if not exists bank_account_id bigint references bank_accounts(id);
alter table courier_collections add column if not exists reference_number text;

update courier_collections cc
set payment_method = case when co.payment_method = 'bank_transfer' then 'online' else 'cash' end,
    bank_account_id = case when co.payment_method = 'bank_transfer' then co.bank_account_id else null end
from couriers co
where co.id = cc.courier_id and cc.payment_method is null;

alter table expenses add column if not exists bank_account_id bigint references bank_accounts(id);
