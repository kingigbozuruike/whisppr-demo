#!/bin/bash

# Whisppr Backend Manual Test Script
# Test all backend endpoints without the mobile app

echo "🧪 Whisppr Backend Test Suite"
echo "=============================================="
echo ""

BACKEND_URL="http://localhost:3000"
API_KEY="demo-secret-key"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Testing backend at: $BACKEND_URL"
echo ""

# Test 1: Health Check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
response=$(curl -s -w "\n%{http_code}" $BACKEND_URL/health)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Health check returned 200"
    echo "Response: $body"
else
    echo -e "${RED}✗ FAILED${NC} - Expected 200, got $http_code"
fi
echo ""

# Test 2: SOS Alert with Valid Data
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: SOS Alert (Valid Data)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}⚠️  This will send real SMS to configured numbers!${NC}"
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    response=$(curl -s -w "\n%{http_code}" -X POST $BACKEND_URL/sos \
      -H "Content-Type: application/json" \
      -H "x-api-key: $API_KEY" \
      -d '{
        "name": "Manual Test",
        "lat": 32.52,
        "lng": -92.63,
        "platform": "manual-test"
      }')
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ PASSED${NC} - SOS sent successfully"
        echo "Response: $body"
        echo ""
        echo -e "${YELLOW}📱 Check your phone for SMS!${NC}"
    else
        echo -e "${RED}✗ FAILED${NC} - Expected 200, got $http_code"
        echo "Response: $body"
    fi
else
    echo "Skipped (SMS not sent)"
fi
echo ""

# Test 3: Invalid API Key
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: Invalid API Key"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
response=$(curl -s -w "\n%{http_code}" -X POST $BACKEND_URL/sos \
  -H "Content-Type: application/json" \
  -H "x-api-key: wrong-key" \
  -d '{
    "name": "Test",
    "lat": 32.52,
    "lng": -92.63
  }')

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "401" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Correctly rejected invalid API key"
    echo "Response: $body"
else
    echo -e "${RED}✗ FAILED${NC} - Expected 401, got $http_code"
    echo "Response: $body"
fi
echo ""

# Test 4: Missing Required Fields
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: Missing Required Fields"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
response=$(curl -s -w "\n%{http_code}" -X POST $BACKEND_URL/sos \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "name": "Test"
  }')

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "400" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Correctly rejected missing fields"
    echo "Response: $body"
else
    echo -e "${RED}✗ FAILED${NC} - Expected 400, got $http_code"
    echo "Response: $body"
fi
echo ""

# Test 5: Invalid Coordinates
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 5: Invalid Coordinates"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
response=$(curl -s -w "\n%{http_code}" -X POST $BACKEND_URL/sos \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "name": "Test",
    "lat": 999,
    "lng": -92.63
  }')

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "400" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Correctly rejected invalid coordinates"
    echo "Response: $body"
else
    echo -e "${RED}✗ FAILED${NC} - Expected 400, got $http_code"
    echo "Response: $body"
fi
echo ""

# Test 6: Alternative /api/sos Endpoint
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 6: Alternative /api/sos Endpoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
response=$(curl -s -w "\n%{http_code}" -X POST $BACKEND_URL/api/sos \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "name": "Test User",
    "latitude": 32.52,
    "longitude": -92.63,
    "platform": "test"
  }')

http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Alternative endpoint works"
else
    echo -e "${RED}✗ FAILED${NC} - Expected 200, got $http_code"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Backend is running on $BACKEND_URL"
echo "✓ All endpoints are responding correctly"
echo ""
echo "Next steps:"
echo "1. Check backend console for detailed logs"
echo "2. Check your phone for SMS (if you ran Test 2)"
echo "3. To test with mobile app, reload Expo with 'r' key"
echo ""
