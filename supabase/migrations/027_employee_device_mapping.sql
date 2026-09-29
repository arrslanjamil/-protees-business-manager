-- Employee Device ID Mapping for ZKTeco Integration

-- Add device_employee_id field to app_users table
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS device_employee_id VARCHAR(50);

-- Add unique constraint (allowing NULL for employees without device mapping)
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_device_employee_id
ON app_users(device_employee_id)
WHERE device_employee_id IS NOT NULL;

-- Create unmapped attendance table for records without matching employees
CREATE TABLE IF NOT EXISTS unmapped_attendance (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  device_employee_id VARCHAR(50) NOT NULL,
  device_id VARCHAR(100),
  device_name VARCHAR(255),
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status VARCHAR(50),
  raw_payload JSONB,
  source_ip VARCHAR(45),
  sync_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for unmapped attendance
CREATE INDEX IF NOT EXISTS idx_unmapped_attendance_device_employee_id
ON unmapped_attendance(device_employee_id);
CREATE INDEX IF NOT EXISTS idx_unmapped_attendance_sync_time
ON unmapped_attendance(sync_time DESC);
CREATE INDEX IF NOT EXISTS idx_unmapped_attendance_device_id
ON unmapped_attendance(device_id);

-- RLS for unmapped attendance
ALTER TABLE unmapped_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY unmapped_attendance_insert ON unmapped_attendance
  FOR INSERT WITH CHECK (true);

CREATE POLICY unmapped_attendance_select ON unmapped_attendance
  FOR SELECT USING (true);
