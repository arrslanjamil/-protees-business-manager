# ZKTeco Integration Diagnostics

## 🔴 CRITICAL: Endpoints Not Responding

**Status:** Edge Functions may not be deployed or accessible

### ⚠️ What We Found
- Attendance endpoint: `https://yswxoikimguvcssgdurr.supabase.co/functions/v1/zkteco-attendance` → **NOT REACHABLE**
- Status endpoint: `https://yswxoikimguvcssgdurr.supabase.co/functions/v1/zkteco-device-status` → **NOT REACHABLE**

---

## 🔧 Deployment Checklist

### Step 1: Verify Supabase Project Connection
```bash
# Check if supabase CLI is installed
which supabase

# Or install it
npm install -g supabase

# Link to your project
supabase link --project-ref yswxoikimguvcssgdurr
```

### Step 2: Deploy Edge Functions
```bash
# From project root
cd /Users/arslan/-protees-business-manager

# Deploy functions
supabase functions deploy zkteco-attendance
supabase functions deploy zkteco-device-status

# Verify deployment
supabase functions list
```

### Step 3: Check Deployment Status
```bash
# View function logs
supabase functions logs zkteco-attendance

# Or check via Supabase Dashboard
# Go to: https://app.supabase.com/project/yswxoikimguvcssgdurr/functions
```

---

## 🔍 Manual Endpoint Test

Once functions are deployed, test with curl:

```bash
# Test Attendance Endpoint
curl -X POST https://yswxoikimguvcssgdurr.supabase.co/functions/v1/zkteco-attendance \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "1",
    "device_id": "zkteco-001",
    "device_name": "SenseFace Test",
    "timestamp": "2026-09-29T10:30:00Z",
    "check_in": "10:30:00"
  }'

# Expected Response:
# {
#   "success": true,
#   "message": "Check-in recorded for employee 1",
#   "attendance_id": 123,
#   "employee_id": 1,
#   "date": "2026-09-29",
#   "check_in": "10:30:00",
#   "check_out": null
# }
```

```bash
# Test Status Endpoint
curl -X POST https://yswxoikimguvcssgdurr.supabase.co/functions/v1/zkteco-device-status \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "zkteco-001",
    "device_name": "SenseFace Test",
    "is_online": true,
    "timestamp": "2026-09-29T10:30:00Z"
  }'

# Expected Response:
# {
#   "success": true,
#   "device": {
#     "id": 1,
#     "device_id": "zkteco-001",
#     "device_name": "SenseFace Test",
#     "is_online": true,
#     "last_sync": "2026-09-29T10:30:00.000Z"
#   },
#   "message": "Device zkteco-001 status updated"
# }
```

---

## 📋 Database Verification

### Check if tables exist:
```bash
# Connect to Supabase PostgreSQL
psql "postgresql://postgres:[PASSWORD]@db.yswxoikimguvcssgdurr.supabase.co:5432/postgres"

# Run these queries:
SELECT * FROM zkteco_devices LIMIT 1;
SELECT * FROM zkteco_user_mapping LIMIT 1;
SELECT * FROM zkteco_sync_log LIMIT 1;

# Check if migration ran:
SELECT * FROM attendance WHERE source = 'machine' LIMIT 1;
```

### Or via Supabase Dashboard:
1. Go to: https://app.supabase.com/project/yswxoikimguvcssgdurr
2. Click **SQL Editor**
3. Run the queries above

---

## 📱 Device Configuration Verification

Ensure your ZKTeco device has:

### ✓ WiFi Connection
- Device → Settings → Network → WiFi
- Connected to same network with internet access

### ✓ Cloud Server Settings
- Device → Settings → Cloud Server
- **Server Type:** HTTPS
- **Server Address:** `yswxoikimguvcssgdurr.supabase.co`
- **Port:** 443
- **Attendance URL:** `/functions/v1/zkteco-attendance`
- **Status URL:** `/functions/v1/zkteco-device-status`

### ✓ Push Settings
- Enable: "Push Attendance"
- Enable: "Device Status"
- Sync Interval: 5 minutes

### ✓ Test Connection
- Press "Test Connection" on device
- Should show: ✅ Connection Successful

---

## 🛠️ Troubleshooting

### Issue: Endpoints return 000 (not reachable)

**Cause 1: Functions not deployed**
```bash
# Deploy with verbose output
supabase functions deploy zkteco-attendance --no-verify-jwt
supabase functions deploy zkteco-device-status --no-verify-jwt
```

**Cause 2: Wrong project reference**
- Verify project ID: `yswxoikimguvcssgdurr`
- Check in Supabase Dashboard URL

**Cause 3: Network/Firewall**
- Test DNS: `nslookup yswxoikimguvcssgdurr.supabase.co`
- Test HTTPS: `curl -I https://yswxoikimguvcssgdurr.supabase.co`

---

### Issue: Device shows offline

1. Check WiFi on device
2. Check device can reach server: `ping yswxoikimguvcssgdurr.supabase.co`
3. Check firewall allows port 443
4. Restart device

---

### Issue: Attendance not syncing after device is online

1. Verify device → test connection succeeds
2. Enroll employee with User ID (e.g., 1)
3. Map User ID in app: Admin → Device Integration → Map Users
4. Test scan on device
5. Check Database → Attendance table for new records

---

## ✅ Success Indicators

Once everything is working:

1. **Device Shows Online**
   - In app → Device Integration page
   - Device shows "Online" status

2. **Last Sync Updates**
   - Updates every 5 minutes when device is active
   - Shows recent timestamp

3. **Attendance Records Appear**
   - Employee scans fingerprint
   - Record appears in Attendance page
   - Status: "Present" with check-in time

4. **Sync Logs Recorded**
   - In Diagnostics page → Recent Sync Activity
   - Shows check-in/check-out actions
   - Status: "success"

---

## 📞 Quick Commands

```bash
# Deploy functions
cd /Users/arslan/-protees-business-manager
supabase functions deploy

# View all functions
supabase functions list

# View function logs (real-time)
supabase functions logs zkteco-attendance --tail

# Open Supabase Dashboard
open https://app.supabase.com/project/yswxoikimguvcssgdurr
```

---

## 🎯 Next Steps

1. **Deploy Edge Functions**
   ```bash
   npm run deploy:functions
   # or
   supabase functions deploy
   ```

2. **Verify Deployment**
   - Open Diagnostics page in app
   - Click "Refresh" button
   - Should see "Connected" status

3. **Test with Device**
   - Ensure device is online
   - Employee scans fingerprint
   - Check Attendance page for record

4. **Monitor Sync Activity**
   - Go to Diagnostics page
   - View "Recent Sync Activity" logs
   - Check for success status

---

**Last Updated:** 2026-09-29
**Status:** Awaiting Function Deployment
