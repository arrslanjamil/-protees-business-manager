-- Track when advances are paid/deducted from salary
ALTER TABLE public.advances ADD COLUMN IF NOT EXISTS paid_date date;

-- Index for filtering unpaid advances efficiently
CREATE INDEX IF NOT EXISTS idx_advances_paid_date ON public.advances(paid_date);
