-- Outgoing payments no longer carry a Cash / Online payment source.
alter table expenses alter column payment_source drop default;
alter table expenses alter column payment_source drop not null;
alter table creditor_payments alter column payment_type drop not null;
