-- Convert attendance.check_in / check_out from TIMETZ to TIMESTAMPTZ.
--
-- WHY: migration 030 created both as TIME WITH TIME ZONE. A timetz carries no
-- date, so PostgREST returns a bare "09:00:00+00". In the browser
-- `new Date("09:00:00+00")` is NaN, which rendered as "Invalid Date" on the
-- Attendance pages, and computeWorkingHours()/computeLateMinutes() silently
-- produced NaN for every machine-sourced row.
--
-- BACKFILL: punches were recorded as Pakistan wall-clock time (the devices are
-- on-site, and the app formats dates in the browser's local zone), so the
-- stored wall-clock time is reinterpreted in Asia/Karachi. That preserves the
-- time operators actually saw on the device while making the stored value a
-- correct absolute instant.
--
-- Both columns are converted in ONE statement on purpose: the USING
-- expressions are evaluated against the ORIGINAL tuple, so the check_out
-- clause can still compare against the old timetz check_in to detect a shift
-- that crossed midnight. Splitting them would leave check_in already
-- converted, and `check_in::time` would then read back in the session zone.

ALTER TABLE public.attendance
  ALTER COLUMN check_in TYPE TIMESTAMPTZ
    USING (
      CASE
        WHEN check_in IS NULL THEN NULL
        ELSE (date + check_in::time) AT TIME ZONE 'Asia/Karachi'
      END
    ),
  ALTER COLUMN check_out TYPE TIMESTAMPTZ
    USING (
      CASE
        WHEN check_out IS NULL THEN NULL
        -- Night shift: clocked out after midnight, so the punch belongs to the
        -- calendar day AFTER the attendance date.
        WHEN check_in IS NOT NULL AND check_out::time < check_in::time
          THEN (date + INTERVAL '1 day' + check_out::time) AT TIME ZONE 'Asia/Karachi'
        ELSE (date + check_out::time) AT TIME ZONE 'Asia/Karachi'
      END
    );

-- Guard the invariant that working-hours arithmetic depends on. Without a
-- date component this could not be expressed before; a violation now means
-- genuinely bad data rather than a night shift.
ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_check_out_after_check_in
  CHECK (check_out IS NULL OR check_in IS NULL OR check_out > check_in);

COMMENT ON COLUMN public.attendance.check_in IS
  'Absolute instant of the check-in punch (timestamptz). Render in the business timezone, Asia/Karachi.';
COMMENT ON COLUMN public.attendance.check_out IS
  'Absolute instant of the check-out punch (timestamptz). May fall on the day after `date` for night shifts.';
