-- ZKTeco Request Logging for ADMS Discovery

CREATE TABLE IF NOT EXISTS zkteco_request_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  path VARCHAR(1000),
  method VARCHAR(20),
  headers JSONB,
  query_params JSONB,
  body TEXT,
  source_ip VARCHAR(45),
  user_agent VARCHAR(500),
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_zkteco_request_logs_path ON zkteco_request_logs(path);
CREATE INDEX IF NOT EXISTS idx_zkteco_request_logs_timestamp ON zkteco_request_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_zkteco_request_logs_method ON zkteco_request_logs(method);

-- RLS Policy
ALTER TABLE zkteco_request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY zkteco_logs_insert ON zkteco_request_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY zkteco_logs_select ON zkteco_request_logs
  FOR SELECT USING (true);
