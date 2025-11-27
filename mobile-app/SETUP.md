# Whisppr Demo App - Complete Setup Guide

## 📦 Required Packages

The app uses the following Expo packages (already in `package.json`):

```json
{
  "expo": "~49.0.0",
  "expo-location": "~16.1.0",
  "expo-constants": "~14.4.2",
  "expo-status-bar": "~1.6.0",
  "react": "18.2.0",
  "react-native": "0.72.6"
}
```

## 🚀 Installation

```bash
cd mobile-app
npm install
```

## ⚙️ Configuration

### Option 1: Environment Variables (Recommended)

1. Copy the example file:
```bash
cp .env.example .env
```

2. Edit `.env`:
```env
# Your backend URL
EXPO_PUBLIC_API_URL=http://localhost:3000

# API key (must match backend)
EXPO_PUBLIC_API_KEY=demo-secret-key
```

### Option 2: Edit App.js Directly

Open `App.js` and find this section at the top:

```javascript
// ============================================================================
// CONFIGURATION - CHANGE BACKEND URL HERE
// ============================================================================

// Backend URL - Replace with your deployed backend URL
const BACKEND_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000';
const API_KEY = Constants.expoConfig?.extra?.apiKey || 'demo-secret-key';

// User's name (in production, this would come from user profile)
const USER_NAME = 'Demo User';
```

**Change these values:**
- `BACKEND_URL`: Your backend server URL
- `API_KEY`: Your API key (must match backend)
- `USER_NAME`: Your name for SMS messages

### Backend URL Examples

**Local development (same computer):**
```javascript
const BACKEND_URL = 'http://localhost:3000';
```

**Local development (physical device):**
```javascript
// Replace with your computer's IP address
const BACKEND_URL = 'http://192.168.1.100:3000';
```

**Production (deployed backend):**
```javascript
const BACKEND_URL = 'https://your-backend.vercel.app';
```

## 📱 Running the App

### Start Development Server

```bash
npm start
```

This will:
- Start the Expo development server
- Show a QR code in the terminal
- Open a browser with dev tools

### Test on Physical Device (Recommended)

1. **Install Expo Go** on your phone:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Scan the QR code:**
   - iOS: Use Camera app
   - Android: Use Expo Go app

3. **Grant permissions:**
   - Allow location access when prompted
   - Choose "While Using App" or "Always"

### Test on iOS Simulator (Mac only)

```bash
npm run ios
```

### Test on Android Emulator

```bash
npm run android
```

## 🔍 How It Works

### 1. App Launch Sequence

```
App starts
    ↓
Request location permissions
    ↓
Warm up location services
    ↓
Fetch getLastKnownPositionAsync()
    ↓
Cache location for fast SOS
    ↓
Show "Ready to send SOS"
```

### 2. SOS Button Press Flow

```
User taps "Send SOS"
    ↓
Try getLastKnownPositionAsync() (< 100ms)
    ↓
If null, try getCurrentPositionAsync() (2-3s timeout)
    ↓
If timeout, use cached location
    ↓
POST { name, lat, lng } to BACKEND_URL/api/sos
    ↓
Show loading spinner
    ↓
Display success or error alert
```

### 3. Location Strategies

**Strategy 1: Last Known (Fastest)**
- Uses `getLastKnownPositionAsync()`
- Instant (< 100ms)
- Uses device's cached location
- Most recent location from any app

**Strategy 2: Current Location (Fresh)**
- Uses `getCurrentPositionAsync()`
- 2-3 second timeout
- Gets fresh GPS coordinates
- More accurate but slower

**Strategy 3: App Cached (Fallback)**
- Uses location from app launch
- Instant
- Backup if GPS fails
- Better than nothing

## 🎨 UI Components

### Title Section
```javascript
<Text style={styles.title}>Whisppr Demo</Text>
<Text style={styles.subtitle}>
  Tap once to send an SOS SMS with your location
</Text>
```

### SOS Button
- Large red circular button (60% of screen width)
- Pulse animation when ready
- Shows spinner when loading
- Press animation feedback

### Status Display
- Shows current state ("Ready", "Getting location", etc.)
- Updates in real-time
- Color-coded indicators

### Footer Info
- Usage instructions
- Permission status
- Location cache status
- Debug info (development only)

## 🧪 Testing Checklist

### Initial Setup
- [ ] Backend server is running
- [ ] `BACKEND_URL` is configured correctly
- [ ] App loads without errors
- [ ] Location permission prompt appears
- [ ] Permission granted successfully

### Location Services
- [ ] Last known location cached on launch
- [ ] Status shows "Ready to send SOS"
- [ ] Debug info shows cached coordinates (dev mode)

### SOS Flow
- [ ] Button is pressable (not grayed out)
- [ ] Button animates on press
- [ ] Loading spinner appears
- [ ] Status updates ("Getting location...", "Sending...")
- [ ] Alert appears with success message
- [ ] Backend receives POST request
- [ ] SMS delivered to contacts

### Error Handling
- [ ] Works without cached location
- [ ] Handles location timeout gracefully
- [ ] Shows error if backend unreachable
- [ ] Retry button works after error
- [ ] Helpful error messages displayed

### Performance
- [ ] Location fetch < 3 seconds
- [ ] API call < 1 second
- [ ] Total time < 8 seconds
- [ ] No lag or freezing

## 🐛 Troubleshooting

### "Cannot connect to backend"

**Problem:** App can't reach backend server

**Solutions:**
1. Verify backend is running: `curl http://localhost:3000/health`
2. Check `BACKEND_URL` in `App.js` or `.env`
3. If using physical device:
   - Use your computer's IP, not `localhost`
   - Make sure phone and computer on same WiFi
   - Try: `ipconfig getifaddr en0` (Mac) or `ipconfig` (Windows)

### "Location permission denied"

**Problem:** App doesn't have location access

**Solutions:**
1. **iOS:** Settings → Whisppr Demo → Location → While Using App
2. **Android:** Settings → Apps → Whisppr Demo → Permissions → Location
3. Restart app after granting permission

### "Location timeout"

**Problem:** GPS taking too long

**Solutions:**
1. Make sure you're outdoors or near a window
2. Wait a moment and try again (GPS needs to warm up)
3. App will use last known location as fallback
4. Check that location services are enabled on device

### "Invalid API key"

**Problem:** API key mismatch

**Solutions:**
1. Check `API_KEY` in `App.js` matches backend `WHISPPR_API_KEY`
2. Remove any quotes or extra spaces
3. Restart both backend and mobile app

### "Network request failed"

**Problem:** Can't reach backend URL

**Solutions:**
1. Verify backend URL is correct
2. Check backend is running and healthy
3. If using `localhost`, try your IP address instead
4. Check firewall isn't blocking connections
5. Try: `curl -X POST http://your-backend/api/sos -H "x-api-key: your-key"`

### QR code doesn't work

**Problem:** Can't scan or load app

**Solutions:**
1. Make sure phone and computer on same WiFi
2. Try typing the URL manually in Expo Go
3. Restart Expo dev server: `npm start`
4. Clear Expo Go cache (app settings)

## 📊 Performance Metrics

### Expected Timings

| Action | Expected Time |
|--------|---------------|
| App launch | < 2s |
| Permission request | < 1s |
| Location warmup | < 1s |
| Last known location | < 100ms |
| Current location | 1-3s |
| API call | 0.5-1s |
| **Total SOS** | **2-5s** |

### Console Output

Watch the console for detailed timing:

```
==================================================
Whisppr Demo - Initializing
Backend URL: http://localhost:3000
==================================================
✓ Location permission granted
Warming up location services...
✓ Last known location cached: 37.7749, -122.4194
✓ App initialized successfully

==================================================
SOS BUTTON PRESSED
==================================================
Strategy 1: Attempting last known location...
✓ Last known location retrieved in 45ms
  Coordinates: 37.774900, -122.419400

Sending SOS to backend...
  URL: http://localhost:3000/api/sos
  Payload: { name: "Demo User", lat: 37.7749, lng: -122.4194 }
✓ SOS sent successfully in 234ms
  Response: { success: true, contacts: 2 }

✓ SOS COMPLETE - Total time: 279ms
==================================================
```

## 🎓 Code Structure

### Main Components

**State Variables:**
- `loading`: Is SOS being sent?
- `locationStatus`: Current status message
- `hasLocationPermission`: Permission granted?
- `lastLocation`: Cached location object
- `isWarmedUp`: Location services ready?

**Key Functions:**
- `initializeApp()`: Setup on launch
- `getLocationFast()`: Multi-strategy location fetch
- `sendSOSAlert()`: POST to backend
- `handleSOSPress()`: Main SOS flow

**Animations:**
- `scaleAnim`: Button press animation
- `pulseAnim`: Idle pulse animation

### StyleSheet

All styles in `styles` constant:
- `container`: Main app container
- `header`: Title section
- `sosButton`: Main red button
- `statusContainer`: Status message area
- `footer`: Info and instructions
- `debugInfo`: Development debugging (only in `__DEV__`)

## 📝 Customization

### Change Button Color

```javascript
sosButton: {
  backgroundColor: '#DC2626', // Change to your color
  // Try: '#FF6B6B', '#E63946', '#D62828', etc.
}
```

### Change Button Size

```javascript
const BUTTON_SIZE = width * 0.6; // Change multiplier
// 0.5 = smaller, 0.7 = larger
```

### Change User Name

```javascript
const USER_NAME = 'Your Name'; // Change at top of file
```

### Change Timeouts

```javascript
const LOCATION_TIMEOUT = 3000; // Location fetch timeout (ms)
const API_TIMEOUT = 10000; // Backend request timeout (ms)
```

### Add Custom Data to SOS

In `sendSOSAlert()` function, add to the body:

```javascript
body: JSON.stringify({
  name: USER_NAME,
  latitude: latitude,
  longitude: longitude,
  // Add custom fields
  phoneNumber: '+1234567890',
  bloodType: 'O+',
  medicalInfo: 'Allergic to penicillin',
  emergencyContact: 'Jane Doe',
}),
```

## 🚀 Production Build

### Android APK

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build
eas build --platform android --profile production
```

### iOS App

```bash
# Requires Apple Developer account
eas build --platform ios --profile production
```

### Submit to Stores

```bash
# iOS App Store
eas submit --platform ios

# Google Play Store
eas submit --platform android
```

## 📚 Additional Resources

- **Expo Location Docs:** https://docs.expo.dev/versions/latest/sdk/location/
- **Expo Constants:** https://docs.expo.dev/versions/latest/sdk/constants/
- **React Native Docs:** https://reactnative.dev/
- **Expo Go App:** https://expo.dev/client

## 🎯 Quick Reference

### Start App
```bash
npm start
```

### Run on iOS
```bash
npm run ios
```

### Run on Android
```bash
npm run android
```

### Clear Cache
```bash
expo start -c
```

### Check Backend
```bash
curl http://localhost:3000/health
```

### Test SOS Endpoint
```bash
curl -X POST http://localhost:3000/api/sos \
  -H "Content-Type: application/json" \
  -H "x-api-key: demo-secret-key" \
  -d '{"name":"Test","lat":37.7749,"lng":-122.4194}'
```

---

**Ready to test?** Run `npm start` and scan the QR code! 🚀
