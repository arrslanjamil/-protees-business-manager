#!/bin/bash

# ZKTeco Integration Verification Script
# Tests endpoints and database connectivity

set -e

DOMAIN="yswxoikimguvcssgdurr.supabase.co"
ATTENDANCE_URL="https://${DOMAIN}/functions/v1/zkteco-attendance"
STATUS_URL="https://${DOMAIN}/functions/v1/zkteco-device-status"

echo "🔍 ZKTeco Integration Verification"
echo "=================================="
echo ""

# Test 1: Check if endpoints are reachable
echo "1️⃣  Testing Endpoint Connectivity..."
echo ""

echo "   Testing Attendance Endpoint: $ATTENDANCE_URL"
if curl -s -o /dev/null -w "%{http_code}" "$ATTENDANCE_URL" -X OPTIONS; then
  echo "   ✅ Attendance endpoint is reachable"
else
  echo "   ❌ Attendance endpoint is NOT reachable"
fi
echo ""

echo "   Testing Status Endpoint: $STATUS_URL"
if curl -s -o /dev/null -w "%{http_code}" "$STATUS_URL" -X OPTIONS; then
  echo "   ✅ Status endpoint is reachable"
else
  echo "   ❌ Status endpoint is NOT reachable"
fi
echo ""

# Test 2: Send test payload to attendance endpoint
echo "2️⃣  Testing Attendance Endpoint with Sample Data..."
echo ""

TEST_PAYLOAD=$(cat <<'EOF'
{
  "user_id": "1",
  "device_id": "zkteco-senseface-001",
  "device_name": "SenseFace Test Device",
  "timestamp": "2026-09-29T10:30:00Z",
  "check_in": "10:30:00"
}
EOF
)

echo "   Sending payload:"
echo "$TEST_PAYLOAD" | jq '.' || true
echo ""

RESPONSE=$(curl -s -X POST "$ATTENDANCE_URL" \
  -H "Content-Type: application/json" \
  -d "$TEST_PAYLOAD")

echo "   Response:"
echo "$RESPONSE" | jq '.' || echo "$RESPONSE"
echo ""

# Test 3: Send test payload to status endpoint
echo "3️⃣  Testing Device Status Endpoint..."
echo ""

STATUS_PAYLOAD=$(cat <<'EOF'
{
  "device_id": "zkteco-senseface-001",
  "device_name": "SenseFace Test Device",
  "is_online": true,
  "timestamp": "2026-09-29T10:30:00Z"
}
EOF
)

echo "   Sending payload:"
echo "$STATUS_PAYLOAD" | jq '.' || true
echo ""

RESPONSE=$(curl -s -X POST "$STATUS_URL" \
  -H "Content-Type: application/json" \
  -d "$STATUS_PAYLOAD")

echo "   Response:"
echo "$RESPONSE" | jq '.' || echo "$RESPONSE"
echo ""

echo "=================================="
echo "✅ Verification Complete!"
echo ""
echo "📋 Configuration Summary:"
echo "   Domain: $DOMAIN"
echo "   Port: 443"
echo "   Protocol: HTTPS"
echo "   Attendance Path: /functions/v1/zkteco-attendance"
echo "   Status Path: /functions/v1/zkteco-device-status"
echo ""
echo "💡 If endpoints are not reachable:"
echo "   1. Check internet connectivity"
echo "   2. Verify firewall rules allow HTTPS (port 443)"
echo "   3. Run: npm run deploy:functions"
