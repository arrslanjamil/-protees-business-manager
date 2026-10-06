-- Track if security deduction has been taken
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS security_deducted_date date;

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_employees_security_deducted ON public.employees(security_deducted_date);
