-- Protees Business Manager — Employee Increment History: store the
-- increment percentage as its own field on every row, not just when the
-- admin entered the raise as a percentage in the first place.
--
-- salary_increments already captured increment_type + increment_value,
-- which only carries a percentage when increment_type = 'percentage' — a
-- 'fixed' Rs raise had no percentage recorded anywhere. increment_percentage
-- is always populated going forward (computed from increment_amount /
-- previous_salary for 'fixed' rows, copied from increment_value for
-- 'percentage' rows), so the full timeline can always show "how much, and
-- what % that was" regardless of how the raise was entered.
--
-- Existing rows are backfilled the same way. Safe to re-run.

alter table salary_increments add column if not exists increment_percentage numeric(6,2);

update salary_increments
set increment_percentage = case
  when increment_type = 'percentage' then increment_value
  when previous_salary > 0 then round((increment_amount / previous_salary) * 100, 2)
  else 0
end
where increment_percentage is null;
