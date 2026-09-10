-- Protees Business Manager — Zakat opening balance + cumulative outstanding
--
-- Reworks Zakat tracking from a per-month-reset budget into a running
-- outstanding balance:
--
--   Outstanding Balance = Opening Balance
--                        + (months elapsed since opening_month × Monthly Target)
--                        - (Zakat distributed since opening_month)
--
-- Adds two columns to the existing zakat_settings singleton row:
--   - opening_balance: the pending unpaid Zakat carried in from before this
--     tracking started. Set to Rs 326,500 per the current backlog.
--   - opening_month: the first-of-month date the opening balance is
--     effective as of. Monthly Target accrues once for every calendar
--     month from this date onward (computed in the app — no cron/trigger
--     needed, since it's a pure function of "today's date").
--
-- Safe to re-run — the UPDATE only seeds these on first run (via the
-- WHERE guard) so re-running this script won't clobber a later manual
-- correction to the opening balance.

alter table zakat_settings add column if not exists opening_balance numeric(12,2) not null default 0;
alter table zakat_settings add column if not exists opening_month date not null default date_trunc('month', current_date)::date;

update zakat_settings
set opening_balance = 326500,
    opening_month = date_trunc('month', current_date)::date,
    updated_at = now()
where id = 1 and opening_balance = 0;
