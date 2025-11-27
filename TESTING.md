# 🧪 Complete Testing Guide

## ✅ Step-by-Step Testing

### Step 1: Start Backend Server

```bash
# Terminal 1
cd backend
npm start
```

**Expected output:**
```
============================================================
🚨 Whisppr Emergency SOS Backend (Textbelt Edition)
============================================================
Server running on port 3000
Environment: development
Textbelt API configured: true
Demo numbers configured: 1
============================================================
Endpoints:
  GET  /health     - Health check
  POST /sos        - Emergency SOS alert
  POST /api/sos    - Alternative SOS endpoint
============================================================
```

✅ **Success:** Server is running on port 3000

### Step 2: Test Backend (Keep server running)

Open a **new terminal**:

```bash
# Terminal 2
cd backend
npm test
```

**Expected output:**
```
Test 1: Health check
✓ Health check passed

Test 2: POST /sos with valid data
✓ SOS alert sent successfully

Test 3: Authentication test
✓ Unauthorized request blocked

Test 4: Invalid data test
✓ Bad request handled correctly
```

✅ **Success:** All 4 tests pass

### Step 3: Test with curl (Manual Test)

```bash
# Terminal 2 (keep server running in Terminal 1)
curl http://localhost:3000/health
```

**Expected output:**
```json
{
  "status": "ok",
  "service": "whisppr-backend",
  "timestamp": "2025-11-24T...",
  "textbeltConfigured": true,
  "demoNumbers": 1
}
```

✅ **Success:** Health check returns JSON

### Step 4: Send Test SOS

```bash
curl -X POST http://localhost:3000/sos \
  -H "Content-Type: application/json" \
  -H "x-api-key: demo-secret-key" \
  -d '{
    "name": "TestUser",
    "lat": 32.52,
    "lng": -92.63,
    "platform": "curl-test"
  }'
```

**Expected output:**
```json
{
  "status": "ok",
  "message": "SOS alert initiated",
  "recipients": 1,
  "responseTime": 45
}
```

**Backend console should show:**
```
============================================================
🚨 SOS ALERT RECEIVED
Name: TestUser
Location: 32.52, -92.63
Platform: curl-test
============================================================
Sending to 1 recipients...
Sending SMS to +17135848950 via Textbelt...
✓ SMS sent successfully to +17135848950
  Text ID: 123456789
  Quota remaining: 99
```

**Check your phone:**
- You should receive an SMS with the location link!

✅ **Success:** SMS received on your phone

### Step 5: Test Mobile App

```bash
# Terminal 3 (keep backend running in Terminal 1)
cd mobile-app
npx expo start
```

**In the Expo terminal, press:**
- `i` for iOS Simulator
- `a` for Android Emulator

**In the app:**
1. Grant location permissions
2. Wait for "Location services ready" message
3. Press the red **SOS** button
4. Wait 5-8 seconds

**Expected behavior:**
- App shows "Sending SOS..."
- Backend console shows incoming request
- Success message appears in app
- SMS received on your phone

✅ **Success:** Complete end-to-end test passed!

## 🎯 Testing Checklist

### Backend Tests
- [ ] Server starts without errors
- [ ] Health check returns 200 OK
- [ ] POST /sos accepts valid data
- [ ] Invalid API key returns 401
- [ ] Missing fields return 400
- [ ] Console shows detailed logs
- [ ] SMS sent successfully

### Mobile App Tests
- [ ] App starts without errors
- [ ] Location permission requested
- [ ] Location warm-up completes
- [ ] SOS button is visible and red
- [ ] Button press triggers location fetch
- [ ] Backend receives POST request
- [ ] Success message appears
- [ ] SMS received on phone

### Integration Tests
- [ ] Mobile app → Backend connection works
- [ ] Backend → Textbelt API works
- [ ] SMS delivery successful
- [ ] Google Maps link works in SMS
- [ ] Total time < 10 seconds

## 🔍 Expected Timings

| Step | Expected Time |
|------|--------------|
| Location warm-up | 1-2 seconds |
| Button press → Location | 2-3 seconds |
| API request | < 100ms |
| SMS delivery | 3-5 seconds |
| **Total** | **< 8 seconds** |

## 🚨 Common Test Failures

### "fetch failed" in tests
**Problem:** Backend server not running

**Solution:**
```bash
# Start server first
cd backend
npm start

# Then in new terminal, run tests
npm test
```

### "Network request failed" in mobile app
**Problem:** Wrong BACKEND_URL in App.js

**Solution:**
1. Find your IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`
2. Update `BACKEND_URL` in `mobile-app/App.js` line 20
3. Reload app (shake device → Reload)

### "Textbelt API error"
**Problem:** API key invalid or quota exceeded

**Solution:**
```bash
# Check quota
curl https://textbelt.com/quota/40a3b99250b28aa1ecd3ee7fb37ec7a31bdc442dIcJZydgXa4mz5YKqmKbd8PElr

# If quota is 0, purchase more credits at textbelt.com
```

### SMS not received
**Problem:** Phone number format incorrect

**Solution:**
- Edit `backend/.env`
- Use E.164 format: `+15551234567`
- Include + and country code
- No spaces or dashes

## 📊 Test Results Reference

### Good Test Output (Backend)

```
Test 1: Health check
✓ Health check passed
Response: {
  "status": "ok",
  "service": "whisppr-backend",
  "textbeltConfigured": true,
  "demoNumbers": 1
}

Test 2: POST /sos with valid data
✓ SOS alert sent successfully
Response: {
  "status": "ok",
  "message": "SOS alert initiated",
  "recipients": 1,
  "responseTime": 45
}

Test 3: Authentication test
✓ Unauthorized request blocked
Status: 401

Test 4: Invalid data test
✓ Bad request handled correctly
Status: 400

All tests completed!
```

### Good Console Output (Backend)

```
[2025-11-24T12:00:00.000Z] POST /sos
============================================================
🚨 SOS ALERT RECEIVED
Name: King
Location: 32.52, -92.63
Platform: expo-demo
============================================================
Sending to 1 recipients...
Sending SMS to +17135848950 via Textbelt...
✓ SMS sent successfully to +17135848950
  Text ID: 123456789
  Quota remaining: 99
✓ Batch complete: 1/1 sent
✓ SMS batch completed
  Success: 1/1
Response sent in 45ms
```

### Good SMS Content

```
[Whisppr DEMO] King may need help.
Location: https://maps.google.com/?q=32.52,-92.63
Platform: expo-demo

This is an automated emergency alert.
```

## 🎬 Quick Test Script

Save this as `quick-test.sh` in the root directory:

```bash
#!/bin/bash

echo "🧪 Whisppr Quick Test"
echo ""

# Check if backend is running
echo "1. Checking backend health..."
curl -s http://localhost:3000/health | grep -q "ok"
if [ $? -eq 0 ]; then
  echo "✓ Backend is running"
else
  echo "✗ Backend is not running. Start with: cd backend && npm start"
  exit 1
fi

# Send test SOS
echo ""
echo "2. Sending test SOS..."
response=$(curl -s -X POST http://localhost:3000/sos \
  -H "Content-Type: application/json" \
  -H "x-api-key: demo-secret-key" \
  -d '{
    "name": "QuickTest",
    "lat": 32.52,
    "lng": -92.63,
    "platform": "test-script"
  }')

echo "$response" | grep -q "ok"
if [ $? -eq 0 ]; then
  echo "✓ SOS sent successfully"
  echo "$response"
else
  echo "✗ SOS failed"
  echo "$response"
  exit 1
fi

echo ""
echo "✅ All tests passed!"
echo "📱 Check your phone for SMS"
```

Make it executable and run:

```bash
chmod +x quick-test.sh
./quick-test.sh
```

## 🎯 Success Criteria

### Minimum Viable Test
- [x] Backend starts
- [x] Health check works
- [x] SMS sends to one number

### Complete Test
- [x] Backend starts
- [x] Health check works
- [x] All backend tests pass
- [x] Mobile app connects
- [x] Location acquired
- [x] SOS sent
- [x] SMS received

### Production Ready
- [ ] All above tests pass
- [ ] Multiple phone numbers work
- [ ] Error handling tested
- [ ] Deployed to Vercel
- [ ] Mobile app on TestFlight/Play Store

---

## ⚡ Quick Test Commands

```bash
# Test 1: Is backend running?
curl http://localhost:3000/health

# Test 2: Run all tests
cd backend && npm test

# Test 3: Send manual SOS
curl -X POST http://localhost:3000/sos \
  -H "Content-Type: application/json" \
  -H "x-api-key: demo-secret-key" \
  -d '{"name":"Test","lat":32.52,"lng":-92.63,"platform":"curl"}'

# Test 4: Check Textbelt quota
curl https://textbelt.com/quota/40a3b99250b28aa1ecd3ee7fb37ec7a31bdc442dIcJZydgXa4mz5YKqmKbd8PElr
```

---

**Ready to test?** Start backend with `npm start`, then run `npm test` in a new terminal! 🚀
