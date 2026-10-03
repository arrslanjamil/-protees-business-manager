-- Enable RLS on grand_advances and grand_advance_recoveries
ALTER TABLE public.grand_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grand_advance_recoveries ENABLE ROW LEVEL SECURITY;

-- Grand Advances: Allow authenticated users to read/insert/update
CREATE POLICY grand_advances_select ON public.grand_advances
  FOR SELECT
  USING (true);

CREATE POLICY grand_advances_insert ON public.grand_advances
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY grand_advances_update ON public.grand_advances
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Grand Advance Recoveries: Allow authenticated users to read/insert/update
CREATE POLICY grand_advance_recoveries_select ON public.grand_advance_recoveries
  FOR SELECT
  USING (true);

CREATE POLICY grand_advance_recoveries_insert ON public.grand_advance_recoveries
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY grand_advance_recoveries_update ON public.grand_advance_recoveries
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
