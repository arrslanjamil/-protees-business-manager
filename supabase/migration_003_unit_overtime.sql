-- Protees Business Manager — Unit module simplification
-- Adds the one column the new Unit workflow needs. Additive only — existing
-- unit_payments rows (period_start/period_end/unit_expenses_during_period)
-- are untouched; the new UI just stops surfacing those fields and defaults
-- them internally.

alter table unit_payments add column if not exists overtime_amount numeric(12,2) not null default 0;
