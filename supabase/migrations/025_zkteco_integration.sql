-- ZKTeco Device Integration Tables

-- Device Configuration
CREATE TABLE IF NOT EXISTS zkteco_devices (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  device_id VARCHAR(100) NOT NULL UNIQUE,
  device_name VARCHAR(255) NOT NULL,
  device_model VARCHAR(100) DEFAULT 'SenseFace',
  location VARCHAR(255),
  ip_address VARCHAR(45),
  port INT DEFAULT 8000,
  is_online BOOLEAN DEFAULT false,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ZKTeco User to Employee Mapping
CREATE TABLE IF NOT EXISTS zkteco_user_mapping (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  zkteco_user_id VARCHAR(100) NOT NULL UNIQUE,
  employee_id INT NOT NULL UNIQUE,
  zkteco_username VARCHAR(255),
  zkteco_card_id VARCHAR(100),
  enrollment_status VARCHAR(50) DEFAULT 'enrolled',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_employee FOREIGN KEY (employee_id) REFERENCES app_users(id) ON DELETE CASCADE
);

-- Attendance Sync Log (audit trail)
CREATE TABLE IF NOT EXISTS zkteco_sync_log (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  device_id VARCHAR(100) NOT NULL,
  employee_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_device FOREIGN KEY (device_id) REFERENCES zkteco_devices(device_id),
  CONSTRAINT fk_employee FOREIGN KEY (employee_id) REFERENCES app_users(id)
);

-- Extend attendance table if not already extended
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS device_id VARCHAR(100);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS device_name VARCHAR(255);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS temperature NUMERIC(5,2);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_zkteco_devices_online ON zkteco_devices(is_online);
CREATE INDEX IF NOT EXISTS idx_zkteco_devices_last_sync ON zkteco_devices(last_sync);
CREATE INDEX IF NOT EXISTS idx_zkteco_mapping_employee ON zkteco_user_mapping(employee_id);
CREATE INDEX IF NOT EXISTS idx_zkteco_sync_log_device ON zkteco_sync_log(device_id);
CREATE INDEX IF NOT EXISTS idx_zkteco_sync_log_employee ON zkteco_sync_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_source ON attendance(source);
CREATE INDEX IF NOT EXISTS idx_attendance_device ON attendance(device_id);

-- RLS Policies
ALTER TABLE zkteco_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE zkteco_user_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE zkteco_sync_log ENABLE ROW LEVEL SECURITY;

-- Allow Edge Functions to write
CREATE POLICY zkteco_devices_insert_policy ON zkteco_devices
  FOR INSERT WITH CHECK (true);

CREATE POLICY zkteco_devices_update_policy ON zkteco_devices
  FOR UPDATE USING (true);

CREATE POLICY zkteco_devices_select_policy ON zkteco_devices
  FOR SELECT USING (true);

CREATE POLICY zkteco_mapping_select_policy ON zkteco_user_mapping
  FOR SELECT USING (true);

CREATE POLICY zkteco_mapping_insert_policy ON zkteco_user_mapping
  FOR INSERT WITH CHECK (true);

CREATE POLICY zkteco_sync_log_insert_policy ON zkteco_sync_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY zkteco_sync_log_select_policy ON zkteco_sync_log
  FOR SELECT USING (true);
