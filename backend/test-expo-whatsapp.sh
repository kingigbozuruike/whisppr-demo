#!/bin/bash

# Test Expo app -> Backend -> WhatsApp integration
# This simulates what happens when you press SOS in the mobile app

echo "=========================================================="
echo "🧪 Testing Expo -> Backend -> WhatsApp Flow"
echo "=========================================================="
echo ""

BACKEND_URL="http://10.90.32.50:3000"
API_KEY="demo-secret-key"

echo "📱 Simulating SOS button press from Expo app..."
echo "   Backend: $BACKEND_URL"
echo "   User: King"
echo "   Location: Monroe, LA (32.5093, -92.1193)"
echo ""

# Send SOS request (like the mobile app does)
response=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/sos" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "name": "King",
    "lat": 32.5093,
    "lng": -92.1193,
    "platform": "iOS"
  }')

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

echo "📥 Backend Response:"
echo "$body" | jq '.'
echo ""
echo "HTTP Status: $http_code"
echo ""

if [ "$http_code" = "200" ]; then
  echo "✅ SOS REQUEST SUCCESSFUL!"
  echo ""
  echo "📱 What should happen:"
  echo "   1. Backend received the SOS alert"
  echo "   2. WhatsApp messages being sent to 2 recipients"
  echo "   3. Each recipient gets:"
  echo "      • Emergency alert text with details"
  echo "      • Interactive location pin"
  echo ""
  echo "🔍 Check backend logs for message sending status"
  echo "📱 Check WhatsApp on both phones:"
  echo "   • +17135848950"
  echo "   • +12067868897"
else
  echo "❌ SOS REQUEST FAILED!"
  echo ""
  echo "Check backend logs for errors"
fi

echo ""
echo "=========================================================="
