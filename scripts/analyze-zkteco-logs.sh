#!/bin/bash

# ZKTeco Request Log Analysis
# Analyzes captured device requests to identify ADMS endpoint

SUPABASE_URL="https://muipbbmloqubaodojowf.supabase.co"
ANON_KEY="sb_publishable_3wprMd1sxdLtl1KblsoL8A_w6vSZSPa"

echo "🔍 ZKTeco Request Log Analysis"
echo "=============================="
echo ""

echo "Fetching latest 20 requests..."
echo ""

curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/zkteco_request_logs?order=timestamp.desc&limit=20" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" | jq '
  [
    {
      "timestamp": .timestamp,
      "method": .method,
      "path": .path,
      "source_ip": .source_ip,
      "user_agent": .user_agent,
      "body_preview": (.body | if length > 100 then .[:100] + "..." else . end),
      "query_params": .query_params
    }
  ]' || echo "Error fetching logs"

echo ""
echo "---"
echo ""

echo "📊 Request Summary by Path:"
curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/zkteco_request_logs" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" | jq '
  group_by(.path) |
  map({
    "path": .[0].path,
    "count": length,
    "methods": map(.method) | unique,
    "last_seen": max_by(.timestamp).timestamp
  }) |
  sort_by(.count) | reverse' || echo "Error analyzing logs"

echo ""
echo "---"
echo ""

echo "🔗 Request Summary by Source IP:"
curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/zkteco_request_logs" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" | jq '
  group_by(.source_ip) |
  map({
    "source_ip": .[0].source_ip,
    "count": length,
    "user_agent": .[0].user_agent,
    "paths": map(.path) | unique,
    "last_seen": max_by(.timestamp).timestamp
  }) |
  sort_by(.count) | reverse' || echo "Error analyzing by IP"

echo ""
echo "---"
echo ""

echo "📦 Sample Request Payload:"
curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/zkteco_request_logs?order=timestamp.desc&limit=1" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" | jq '
  .[0] |
  {
    "timestamp": .timestamp,
    "method": .method,
    "path": .path,
    "headers": .headers,
    "query_params": .query_params,
    "body": .body
  }' || echo "No requests yet"
