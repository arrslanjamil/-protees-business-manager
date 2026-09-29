-- Create attendance table for tracking employee check-ins/check-outs

CREATE TABLE IF NOT EXISTS public.attendance (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  employee_id INTEGER NOT NULL,
  date DATE NOT NULL,
  check_in TIME WITH TIME ZONE,
  check_out TIME WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'paid_leave', 'unpaid_leave', 'government_holiday')),
  leave_type TEXT CHECK (leave_type IN ('sick', 'casual', 'other')),
  working_hours NUMERIC,
  shortage_hours NUMERIC,
  late_minutes INTEGER,
  early_leave_minutes INTEGER,
  overtime_hours NUMERIC,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('machine', 'manual')),
  machine_log_id TEXT,
  notes TEXT,

  -- Device tracking fields
  device_id VARCHAR(100),
  device_name VARCHAR(255),
  device_employee_id VARCHAR(50),
  device_sync_time TIMESTAMPTZ,
  device_source VARCHAR(50),

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by_user_id UUID,
  created_by_username TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by_user_id UUID,
  updated_by_username TEXT,

  -- Constraints
  UNIQUE(employee_id, date),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_attendance_employee_id ON public.attendance(employee_id);
CREATE INDEX idx_attendance_date ON public.attendance(date DESC);
CREATE INDEX idx_attendance_device_id ON public.attendance(device_id);
CREATE INDEX idx_attendance_device_employee_id ON public.attendance(device_employee_id);
CREATE INDEX idx_attendance_status ON public.attendance(status);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role can insert/update/select (for Edge Functions)
CREATE POLICY attendance_service_role ON public.attendance
  USING (TRUE)
  WITH CHECK (TRUE);
