# ZKTeco SenseFace ADMS Discovery Protocol

## Current Situation

✅ **Backend Ready:** All endpoints deployed to muipbbmloqubaodojowf.supabase.co
❌ **Device Path Unknown:** SenseFace firmware doesn't support custom path configuration

The device can only set:
- Server Address: `muipbbmloqubaodojowf.supabase.co`
- Server Port: `443`
- HTTPS: `Enabled`
- Domain Name: `Enabled`

The device CANNOT set:
- URL Path (uses firmware default)
- Attendance endpoint path
- Status endpoint path

---

## Discovery Strategy

Since the device firmware has a **hardcoded ADMS endpoint path**, we need to:

1. **Deploy a catch-all logger** ✅ DONE
2. **Configure device to send requests to logger** ← NEXT
3. **Capture actual requests** ← THEN
4. **Identify exact path** ← ANALYZE
5. **Map path to attendance function** ← CONFIGURE

---

## Available Endpoints for Device

Since Supabase Edge Functions must use `/functions/v1/{name}` paths, the device can reach:

### Primary Discovery Endpoint (REQUEST LOGGER)
```
POST https://muipbbmloqubaodojowf.supabase.co/functions/v1/zkteco-webhook-logger

Features:
✓ Logs ALL incoming requests
✓ Records: path, method, headers, query params, body, IP
✓ Stores logs in zkteco_request_logs table
✓ Auto-detects and forwards attendance/status payloads
✓ Returns HTTP 200 success for all requests
```

### Alternative Endpoints (if device tries different paths)
```
POST https://muipbbmloqubaodojowf.supabase.co/functions/v1/zkteco-attendance
- Handles check-in/check-out directly
- Requires employee mapping to exist

POST https://muipbbmloqubaodojowf.supabase.co/functions/v1/zkteco-device-status
- Handles device online/offline status
- Updates device registration
```

---

## Configuration Instructions for ZKTeco SenseFace

Since the device firmware doesn't allow path configuration, you have TWO options:

### Option 1: Use Webhook Logger (RECOMMENDED)
This captures everything and helps identify the firmware's hardcoded path.

**On Device Settings:**
```
Cloud Server:
  Server Address: muipbbmloqubaodojowf.supabase.co
  Server Port: 443
  HTTPS: ENABLED
  Domain Name: ENABLED
  (Device firmware will use its hardcoded path)
```

**What happens:**
- Device attempts to POST to its default ADMS path
- Request gets captured by logger function
- Logs are stored in zkteco_request_logs table
- Payload is analyzed and auto-forwarded to attendance function

---

### Option 2: Direct Endpoint Mapping
If you can manually set the device to POST to a specific Supabase function.

**Attendance Endpoint:**
```
Server Address: muipbbmloqubaodojowf.supabase.co
Server Port: 443
Path (if configurable): /functions/v1/zkteco-attendance
HTTPS: ENABLED
```

**Status Endpoint:**
```
Server Address: muipbbmloqubaodojowf.supabase.co
Server Port: 443
Path (if configurable): /functions/v1/zkteco-device-status
HTTPS: ENABLED
```

---

## Request Log Table Schema

All incoming requests are captured in: `zkteco_request_logs`

```
Columns:
- id: Unique request ID
- path: Full URL path (/functions/v1/... or firmware default)
- method: HTTP method (POST, GET, etc.)
- headers: JSONB of all request headers
- query_params: JSONB of URL query parameters
- body: Full request body
- source_ip: Device IP address
- user_agent: Device firmware identifier
- timestamp: Exact request time
- created_at: Log entry creation time
```

Query logs:
```sql
SELECT path, method, body, source_ip, timestamp 
FROM zkteco_request_logs 
ORDER BY timestamp DESC 
LIMIT 10;
```

---

## Expected Firmware Behavior

Based on ZKTeco SenseFace documentation, the device likely uses ONE of these default paths:

| Path | Purpose | Common? |
|------|---------|---------|
| `/api` | Generic API endpoint | Very Common |
| `/adms` | ADMS specific endpoint | Common |
| `/webserver` | Web server API | Common |
| `/cgi-bin/api` | CGI API (legacy) | Legacy |
| `/` | Root path | Possible |
| `/functions/v1/webhook` | Generic webhook | Possible |

---

## Discovery Process

### Phase 1: Capture Firmware Requests
1. Configure device with server address only
2. Device will attempt to connect using hardcoded path
3. Request gets captured in zkteco_request_logs
4. Log shows: `path`, `method`, `body`, `source_ip`

### Phase 2: Identify Payload
1. Query logs to see what path device is using
2. Analyze request body structure
3. Identify if attendance, status, or custom format

### Phase 3: Auto-Processing
1. Webhook logger auto-detects payload type
2. If attendance → forwards to zkteco-attendance function
3. If status → forwards to zkteco-device-status function
4. Response returned to device

### Phase 4: Verify Recording
1. Check zkteco_devices table for device registration
2. Check zkteco_sync_log for attendance records
3. Check attendance table for new records
4. Confirm data persistence

---

## Live Monitoring Dashboard

Once device connects, query the logs table to see:

```sql
-- Last 10 requests from device
SELECT 
  id,
  path,
  method,
  source_ip,
  timestamp,
  body
FROM zkteco_request_logs
ORDER BY timestamp DESC
LIMIT 10;

-- Count requests by path
SELECT 
  path,
  COUNT(*) as request_count,
  MAX(timestamp) as last_seen
FROM zkteco_request_logs
GROUP BY path
ORDER BY request_count DESC;

-- Count requests by IP
SELECT 
  source_ip,
  COUNT(*) as request_count,
  MAX(timestamp) as last_seen
FROM zkteco_request_logs
GROUP BY source_ip
ORDER BY request_count DESC;
```

---

## Success Criteria

✅ **Discovery Successful When:**
1. Device makes connection attempt
2. Request logged in zkteco_request_logs
3. Exact path identified (e.g., `/adms`, `/api`)
4. Payload structure visible
5. Attendance data recorded in zkteco_devices
6. Employee records synced to database

❌ **If No Requests Appear:**
1. Verify device network connectivity
2. Confirm device has firmware update
3. Check device logs for connection errors
4. Verify port 443 firewall access
5. Test with curl from device network

---

## Next Steps

1. **Configure Device** (per Option 1 above)
2. **Wait for Device to Connect**
3. **Query zkteco_request_logs table**
4. **Report back:**
   - `path` column value (the hardcoded endpoint)
   - `body` sample (attendance payload)
   - `source_ip` (device IP)
5. **Final Configuration** → Map discovered path to functions

---

**Status:** Ready for Device Connection
**Endpoint:** https://muipbbmloqubaodojowf.supabase.co/functions/v1/zkteco-webhook-logger
**Logging:** All requests captured in zkteco_request_logs table
