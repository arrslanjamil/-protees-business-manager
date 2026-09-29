# ZKTeco SenseFace Integration Guide

## 🚀 COMPLETE SETUP INSTRUCTIONS

### **Exact ADMS Configuration for Your Device**

Copy-paste these values exactly into your ZKTeco SenseFace device:

#### **Attendance Endpoint**
```
https://yswxoikimguvcssgdurr.supabase.co/functions/v1/zkteco-attendance
```

#### **Device Status Endpoint**
```
https://yswxoikimguvcssgdurr.supabase.co/functions/v1/zkteco-device-status
```

#### **Server Details**
- **Domain:** `yswxoikimguvcssgdurr.supabase.co`
- **Port:** `443`
- **Protocol:** `HTTPS`
- **Path (Attendance):** `/functions/v1/zkteco-attendance`
- **Path (Status):** `/functions/v1/zkteco-device-status`

---

## 📱 Device Setup Steps

### **Step 1: Access Device Settings**

1. On ZKTeco SenseFace device, press the menu button
2. Navigate to: **Settings → Network → Cloud Server**
3. Login with admin credentials

### **Step 2: Configure Cloud Server**

In the Cloud Server Settings, enter:

**Field 1: Server Type**
- Select: **HTTPS**

**Field 2: Server Address**
- Enter: `yswxoikimguvcssgdurr.supabase.co`

**Field 3: Port**
- Enter: `443`

**Field 4: Attendance URL Path**
- Enter: `/functions/v1/zkteco-attendance`

**Field 5: Device Status URL Path**
- Enter: `/functions/v1/zkteco-device-status`

**Field 6: Sync Interval**
- Set to: **5 minutes** (automatic push every 5 min)

### **Step 3: Enable Features**

In Cloud Settings, ensure these are **ENABLED**:
- ☑️ **Push Attendance** (automatic check-in/out)
- ☑️ **Device Status** (device online/offline status)
- ☑️ **Health Temperature** (if available)
- ☑️ **Photo Capture** (if needed)

### **Step 4: Test Connection**

1. Press **Test Connection** button in device settings
2. Should show: **Connection Successful** ✓
3. Check on your Business Manager app (Device Integration page)
4. Device should show **Online** status

---

## 👥 User Enrollment & Mapping

### **Step 1: Enroll Employees on Device**

For each employee:

1. Device Menu → **Employees → Add New**
2. Enter Employee Name
3. Assign unique **User ID** (e.g., 1, 2, 3...)
4. Register Fingerprint (scan 5 times)
5. Register Face (capture face photo)
6. Save

**Note:** Remember the User ID for each employee!

### **Step 2: Map in Business Manager**

1. Open your app: Go to **Admin → Device Integration**
2. Click **Map Users**
3. For each employee:
   - **ZKTeco User ID:** (the ID from step 1)
   - **Employee:** (select from dropdown)
4. Click **Save Mapping**

**Example:**
```
ZKTeco User 1 → Aqeel (Employee ID 1)
ZKTeco User 2 → Arslan (Employee ID 2)
ZKTeco User 3 → Mazhar (Employee ID 3)
```

---

## ✅ Verification Checklist

- [ ] HTTPS endpoint copied correctly
- [ ] Domain: `yswxoikimguvcssgdurr.supabase.co`
- [ ] Port: `443`
- [ ] Attendance path: `/functions/v1/zkteco-attendance`
- [ ] Status path: `/functions/v1/zkteco-device-status`
- [ ] Push Attendance enabled
- [ ] Device Status enabled
- [ ] Sync interval set to 5 minutes
- [ ] Connection test successful
- [ ] All employees enrolled with User IDs
- [ ] User mappings created in app
- [ ] Device shows **Online** in Device Integration page

---

## 📊 What Happens After Setup

### **Automatic Process:**

```
1. Employee scans fingerprint/face on device
           ↓
2. Device captures check-in time + photo
           ↓
3. Device sends to: https://yswxoikimguvcssgdurr.supabase.co/functions/v1/zkteco-attendance
           ↓
4. Server receives data
           ↓
5. Maps ZKTeco User ID → Employee ID
           ↓
6. Creates attendance record in database
           ↓
7. App instantly shows attendance:
   - Check-in time
   - Check-out time
   - Working hours
   - Status (Present/Late/Absent)
```

### **Real-time Tracking:**

```
Device Integration Page Shows:
✅ Device Status (Online/Offline)
✅ Last Sync time (every 5 min)
✅ Connected devices list
✅ Device health

Attendance Page Shows:
✅ Check-in/check-out times
✅ Calculated working hours
✅ Late minutes
✅ Monthly summary
✅ Photos (if captured)
✅ Temperature (if enabled)
```

---

## 🔧 Troubleshooting

### **Device Shows Offline**

1. Check WiFi connection on device
2. Verify network can reach: `yswxoikimguvcssgdurr.supabase.co`
3. Test: `ping yswxoikimguvcssgdurr.supabase.co`
4. Restart device

### **Attendance Not Syncing**

1. Check User Mapping - is employee mapped?
2. Check Device Logs (on device settings)
3. Verify attendance URL copied correctly
4. Test connection again

### **Wrong Employee Getting Attendance**

1. Go to **Device Integration → Map Users**
2. Verify User ID matches what's on device
3. Check employee name is correct
4. Re-save mapping

### **Date/Time Issues**

1. Check device system time
2. Ensure timezone is set correctly
3. Restart device to sync time

---

## 📈 Salary Integration

Once attendance syncs, app automatically:

```
1. Calculates daily working hours
2. Tracks late arrivals
3. Counts absences
4. Deducts from salary:
   - Absent day = Full day deduction
   - Late = Partial deduction
   - Paid leave = No deduction
```

---

## 🔐 Security Notes

- All data sent over HTTPS (encrypted)
- Device ID verified on server
- Only mapped employees get recorded
- Audit log tracks all syncs
- No credentials stored on device

---

## 📞 Support

If issues persist:

1. Check device logs: Settings → Logs → Cloud Server
2. Verify exact URLs copied (no spaces!)
3. Ensure all employees are mapped
4. Restart device and app

**Status Page:** Device Integration → Device Status shows online status and last sync

---

## 📋 Complete Configuration Quick Reference

```
ADMS URL:              https://yswxoikimguvcssgdurr.supabase.co/functions/v1/zkteco-attendance
Status URL:            https://yswxoikimguvcssgdurr.supabase.co/functions/v1/zkteco-device-status
Domain:                yswxoikimguvcssgdurr.supabase.co
Port:                  443
Protocol:              HTTPS
Attendance Path:       /functions/v1/zkteco-attendance
Status Path:           /functions/v1/zkteco-device-status
Sync Interval:         5 minutes
Push Attendance:       Enabled ✓
Device Status:         Enabled ✓
```

---

**Status:** Production Ready ✅
**Last Updated:** 2026-09-29
**Database:** Supabase (PostgreSQL)
**API:** Edge Functions (serverless)
