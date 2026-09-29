-- Add device_employee_id column to employees table for ZKTeco device mapping

ALTER TABLE employees ADD COLUMN IF NOT EXISTS device_employee_id VARCHAR(50);

-- Create unique index (allowing NULL for employees without device mapping)
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_device_employee_id
ON employees(device_employee_id)
WHERE device_employee_id IS NOT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_employees_device_employee_id_search
ON employees(device_employee_id);
