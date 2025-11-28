# 🚨 Real-Life SOS Integration Plan

## Overview
Connect Expo App → Backend → WhatsApp → Live Map with continuous location updates

---

## Current Infrastructure Status

### ✅ What's Already Built

1. **Expo Mobile App** (`mobile-app/App.js`)
   - SOS button with location fetching
   - Sends POST to `/api/sos` with user location
   - Has API key authentication
   - ❌ **Missing**: Continuous location updates, phone number input

2. **Backend API** (`backend/routes/sos.js`)
   - POST `/api/sos` creates session
   - POST `/api/sos/:shortId/location` updates location
   - Returns `shortId` and `mapUrl` in response
   - ✅ Has WhatsApp integration
   - ✅ Has WebSocket broadcasting

3. **WhatsApp Service** (`backend/services/whatsapp.js`)
   - Sends text message with custom alert
   - Sends location pin
   - ✅ Already integrated in SOS creation

4. **Live Map** (`maps/sos-map/`)
   - Shows real-time location on Mapbox
   - WebSocket updates every location change
   - ✅ Fully functional

---

## What Needs to Be Built

### 1. 📱 **Mobile App: Add Phone Number Input**
**Why**: Backend needs `phoneNumber` field (required in `/api/sos` endpoint)

**Changes Required**:
```javascript
// mobile-app/App.js
- Add TextInput for phone number
- Add emergency contacts list (array of phone numbers)
- Store in state: phoneNumber, emergencyContacts
- Send in API request body
```

**Implementation**: ~30 minutes
- Add phone input with country code picker
- Validation for E.164 format (+1234567890)
- Store emergency contacts (3-5 numbers)

---

### 2. 📱 **Mobile App: Continuous Location Updates**
**Why**: Currently only sends location once on button press. Need continuous updates every 5 seconds.

**Changes Required**:
```javascript
// mobile-app/App.js
- After SOS creation, save `shortId` and `sessionId`
- Start interval: setInterval(() => sendLocationUpdate(), 5000)
- Send POST /api/sos/:shortId/location every 5 seconds
- Continue until user stops SOS or session expires
- Add background location tracking (expo-task-manager)
```

**Implementation**: ~45 minutes
- Location update loop
- Background task for location (even when app backgrounded)
- Stop/cancel button
- Battery optimization

---

### 3. 📱 **Mobile App: Handle API Response**
**Why**: Need to extract `shortId` and `mapUrl` from backend response

**Current Response Format**:
```json
{
  "success": true,
  "data": {
    "sosId": "uuid",
    "shortId": "ABC123XYZ",
    "mapUrl": "http://localhost:3001/sos/ABC123XYZ",
    "status": "active",
    "expiresAt": "2025-11-27T12:00:00Z",
    "alertsSent": {
      "whatsapp": 2,
      "failed": 0
    }
  }
}
```

**Changes Required**:
```javascript
// mobile-app/App.js
- Parse response.data.shortId
- Parse response.data.mapUrl
- Store in state for location updates
- Show success message with map URL
- Option to open map in browser
```

**Implementation**: ~15 minutes

---

### 4. 🔧 **Backend: Fix API Request Format Mismatch**
**Why**: Mobile app sends different field names than backend expects

**Current Mobile App Sends**:
```json
{
  "name": "Demo User",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "lat": 37.7749,
  "lng": -122.4194,
  "timestamp": 1732752000000,
  "userId": "device-id"
}
```

**Backend Expects**:
```json
{
  "phoneNumber": "+1234567890",  // ❌ MISSING
  "name": "John Doe",
  "lat": 37.7749,
  "lng": -122.4194,
  "accuracy": 10,
  "platform": "ios",
  "deviceInfo": "iPhone 14",
  "batteryLevel": 0.85,
  "channel": "whatsapp",
  "emergencyContacts": ["+1234567890", "+9876543210"]
}
```

**Changes Required**:
```javascript
// backend/routes/sos.js
- Make phoneNumber optional OR
- Use userId as fallback if phoneNumber missing
- Accept both "latitude/longitude" and "lat/lng" formats
- Add better error messages for missing fields
```

**Implementation**: ~20 minutes

---

### 5. 🔧 **Backend: Enhance WhatsApp Message**
**Why**: Need to include map URL in WhatsApp message

**Current Message** (in `/api/sos` endpoint):
```javascript
const alertMessage = `🚨 *EMERGENCY ALERT*

${name} needs help!

📱 *Platform:* ${platform}
⏰ *Time:* ${new Date().toLocaleString()}
📍 *Live Location:* ${mapUrl}

This link shows their live location for the next 4 hours.`;
```

**Changes Required**:
- ✅ Already includes mapUrl!
- **BUT**: mapUrl uses `MAP_BASE_URL` env var (defaults to https://maps.whisppr.com)
- Need to update to use `http://localhost:3001` for testing

**Implementation**: ~5 minutes
- Add MAP_BASE_URL to `.env`
- Set to `http://10.90.32.50:3001` (your local IP)

---

### 6. 📱 **Mobile App: Background Location Tracking**
**Why**: Location updates should continue even when app is backgrounded

**Changes Required**:
```javascript
// Install expo-task-manager and expo-background-fetch
npm install expo-task-manager expo-background-fetch

// Define background task
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';

const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error(error);
    return;
  }
  if (data) {
    const { locations } = data;
    // Send location update to backend
  }
});

// Start background location
await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 5000, // 5 seconds
  distanceInterval: 0,
  foregroundService: {
    notificationTitle: "Whisppr SOS Active",
    notificationBody: "Sharing your location with emergency contacts",
  },
});
```

**Implementation**: ~1 hour
- Configure background task
- Handle iOS/Android permissions
- Show persistent notification
- Battery optimization

---

### 7. 🌐 **Deployment: Public Map URL**
**Why**: WhatsApp message needs publicly accessible URL (not localhost)

**Options**:
1. **Ngrok** (Fast, for testing)
   ```bash
   ngrok http 3001
   # Get URL like: https://abc123.ngrok.io
   ```

2. **Vercel** (Production)
   ```bash
   cd maps/sos-map
   vercel deploy
   # Get URL like: https://whisppr-maps.vercel.app
   ```

3. **Your Own Domain**
   ```bash
   # Deploy to maps.whisppr.com
   ```

**Changes Required**:
- Update `MAP_BASE_URL` in backend `.env`
- Update `NEXT_PUBLIC_API_BASE_URL` in frontend `.env.local`
- CORS configuration if domains differ

**Implementation**: ~30 minutes (ngrok) or ~2 hours (Vercel)

---

## Implementation Order (Step-by-Step)

### Phase 1: Basic Integration (1-2 hours)
1. ✅ Add phone number input to mobile app
2. ✅ Fix API request format mismatch
3. ✅ Update mobile app to parse API response
4. ✅ Add MAP_BASE_URL to backend .env
5. ✅ Test: Send SOS → Receive WhatsApp with map URL

### Phase 2: Continuous Updates (1 hour)
6. ✅ Add location update loop to mobile app
7. ✅ Send POST to `/api/sos/:shortId/location` every 5 seconds
8. ✅ Test: Watch map update in real-time

### Phase 3: Background Tracking (1-2 hours)
9. ✅ Add expo-task-manager for background location
10. ✅ Configure foreground service (Android)
11. ✅ Test: Lock phone, verify updates continue

### Phase 4: Deployment (30 min - 2 hours)
12. ✅ Deploy map frontend (ngrok or Vercel)
13. ✅ Update backend MAP_BASE_URL
14. ✅ Test: Send real WhatsApp with public URL

---

## Configuration Changes Needed

### 1. Mobile App (`mobile-app/App.js`)
```javascript
// Current
const BACKEND_URL = 'http://10.90.32.50:3000';
const USER_NAME = 'Demo User';

// Add
const USER_PHONE = '+1234567890'; // Will be input
const EMERGENCY_CONTACTS = ['+1234567890', '+9876543210']; // Will be input
```

### 2. Backend (`.env`)
```bash
# Current
WHATSAPP_ACCESS_TOKEN=your_token
WHATSAPP_PHONE_ID=your_phone_id
DATABASE_URL=postgresql://...
WHISPPR_API_KEY=demo-secret-key

# Add for testing (use your local IP)
MAP_BASE_URL=http://10.90.32.50:3001

# Add for production
MAP_BASE_URL=https://whisppr-maps.vercel.app
```

### 3. Frontend (`maps/sos-map/.env.local`)
```bash
# Current (works for local testing)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1...
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
NEXT_PUBLIC_WS_URL=http://localhost:3000

# For production
NEXT_PUBLIC_API_BASE_URL=https://your-backend.com/api
NEXT_PUBLIC_WS_URL=https://your-backend.com
```

---

## Testing Checklist

### Local Testing (Same WiFi)
- [ ] Mobile app connects to backend (10.90.32.50:3000)
- [ ] SOS creation returns shortId
- [ ] WhatsApp message received with map URL
- [ ] Map opens with correct location
- [ ] Location updates every 5 seconds
- [ ] Map marker moves in real-time
- [ ] Multiple viewers see same updates

### Production Testing (Real WhatsApp)
- [ ] Deploy map to public URL
- [ ] Update MAP_BASE_URL in backend
- [ ] Send real WhatsApp to phone number
- [ ] Click link in WhatsApp → Opens map
- [ ] Verify location updates work

### Edge Cases
- [ ] No internet connection
- [ ] Location services disabled
- [ ] Battery saver mode
- [ ] App backgrounded
- [ ] Session expires (4 hours)
- [ ] Multiple SOS sessions
- [ ] Invalid phone numbers

---

## Estimated Timeline

| Task | Time | Priority |
|------|------|----------|
| Add phone input UI | 30 min | High |
| Fix API format mismatch | 20 min | High |
| Continuous location updates | 45 min | High |
| Background location tracking | 1-2 hrs | Medium |
| Deploy to ngrok/Vercel | 30 min - 2 hrs | High |
| Testing & debugging | 1-2 hrs | High |
| **TOTAL** | **4-7 hours** | |

---

## Next Steps

Ready to start? Let's begin with Phase 1:

1. **Add phone number input to mobile app**
2. **Fix API request format**
3. **Test end-to-end flow**

Should I start implementing Phase 1? Which part would you like to tackle first?
