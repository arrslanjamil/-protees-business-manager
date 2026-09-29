-- Add ZKTeco device fields to attendance table for tracking

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS device_id VARCHAR(100);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS device_name VARCHAR(255);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS device_employee_id VARCHAR(50);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS device_sync_time TIMESTAMPTZ;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS device_source VARCHAR(50);

-- Create indexes for device tracking
CREATE INDEX IF NOT EXISTS idx_attendance_device_id ON attendance(device_id);
CREATE INDEX IF NOT EXISTS idx_attendance_device_employee_id ON attendance(device_employee_id);
