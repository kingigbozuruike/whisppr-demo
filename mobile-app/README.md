# Whisppr Mobile App Setup Guide

## Quick Start (5 minutes)

### 1. Install Dependencies
```bash
cd mobile-app
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
# Your deployed backend URL (or localhost for testing)
EXPO_PUBLIC_API_URL=http://localhost:3000

# API key (must match backend WHISPPR_API_KEY)
EXPO_PUBLIC_API_KEY=demo-secret-key
```

### 3. Start Development Server
```bash
npm start
```

This will:
- Start Expo development server
- Show QR code in terminal
- Open browser with dev tools

### 4. Test on Device

#### Option A: Expo Go App (Easiest)
1. Install [Expo Go](https://expo.dev/client) on your phone
2. Scan QR code from terminal
3. App will load on your device

#### Option B: iOS Simulator (Mac only)
```bash
npm run ios
```

#### Option C: Android Emulator
```bash
npm run android
```

## Testing Locally

### Backend on Same Network
If testing with local backend, use your computer's IP:
```env
# Find your IP: ipconfig getifaddr en0 (Mac) or ipconfig (Windows)
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

Make sure your phone and computer are on the same WiFi network.

## Production Build

### Android APK

1. Build APK:
```bash
expo build:android -t apk
```

2. Download from Expo:
   - Link will appear in terminal
   - Download APK to phone
   - Install and test

### iOS App (Requires Apple Developer Account)

1. Build for App Store:
```bash
expo build:ios
```

2. Follow Expo prompts for certificates

### Modern Build System (EAS)

1. Install EAS CLI:
```bash
npm install -g eas-cli
```

2. Configure project:
```bash
eas build:configure
```

3. Build:
```bash
# Android
eas build --platform android

# iOS
eas build --platform ios
```

## Deployment Configuration

### Update Backend URL
Before building production app, update `.env`:
```env
EXPO_PUBLIC_API_URL=https://your-backend.vercel.app
EXPO_PUBLIC_API_KEY=your-production-api-key
```

### App Store / Google Play

#### iOS App Store
1. Create app in [App Store Connect](https://appstoreconnect.apple.com/)
2. Build with `eas build --platform ios`
3. Submit with `eas submit --platform ios`

#### Google Play Store
1. Create app in [Google Play Console](https://play.google.com/console)
2. Build with `eas build --platform android`
3. Submit with `eas submit --platform android`

## Features & Optimizations

### Location Retrieval
- **Strategy 1:** Last known location (instant)
- **Strategy 2:** Current location with 5s timeout
- **Strategy 3:** Cached location fallback

### Network Optimization
- **Timeout:** 10 seconds for API requests
- **Retry:** Manual retry on failure
- **Feedback:** Real-time status updates

### Performance Targets
- Location fetch: < 3s
- API call: < 1s
- Total time: < 5s end-to-end

## Customization

### Change Colors
Edit `App.js`:
```javascript
const styles = StyleSheet.create({
  sosButton: {
    backgroundColor: '#DC2626', // Change to your color
  },
  container: {
    backgroundColor: '#0F172A', // Change background
  },
});
```

### Change Button Size
Edit constant at top of `App.js`:
```javascript
const BUTTON_SIZE = width * 0.6; // Adjust multiplier
```

### Add More Info
Add custom fields to SOS request:
```javascript
body: JSON.stringify({
  latitude,
  longitude,
  timestamp: Date.now(),
  userId: Constants.deviceId,
  // Add custom fields
  userName: 'John Doe',
  bloodType: 'O+',
  medicalNotes: 'Allergic to penicillin',
}),
```

## Troubleshooting

### "Location permission denied"
- Make sure you granted location permissions when prompted
- iOS: Settings → Whisppr → Location → While Using the App
- Android: Settings → Apps → Whisppr → Permissions → Location

### "Network request failed"
- Check backend is running (`curl http://localhost:3000/health`)
- Verify API URL in `.env` is correct
- Try your computer's IP instead of localhost

### "Invalid API key"
- Verify `EXPO_PUBLIC_API_KEY` matches backend `WHISPPR_API_KEY`
- Check for extra spaces or quotes

### QR code not working
- Make sure phone and computer on same WiFi
- Try typing URL manually in Expo Go
- Restart Expo dev server (`npm start`)

## Testing Checklist

- [ ] Location permission granted
- [ ] SOS button visible and pressable
- [ ] Loading indicator shows during request
- [ ] Success message displays
- [ ] Error handling works (airplane mode test)
- [ ] Backend receives correct coordinates
- [ ] SMS delivered to emergency contacts

## Performance Testing

### Measure Response Time
Watch console logs for timing:
```
Location fetched in XXXms
Total SOS time: XXXms
```

### Test Scenarios
1. **Optimal:** Good GPS + WiFi
2. **Degraded:** Poor GPS signal
3. **Offline:** Airplane mode (should show error)
4. **Cached:** Multiple presses (should use last location)

## Privacy & Security

### Data Collection
- **Location:** Only sent during SOS alert
- **Device ID:** Used for backend logging
- **No persistent storage:** Nothing saved on device

### Network Security
- Always use HTTPS in production
- API key transmitted in header
- No sensitive data stored locally

## Cost Estimation

### Development
- **Expo:** Free
- **Testing:** Free with Expo Go

### Production
- **EAS Build:** Free tier (limited builds/month)
- **Paid:** $29/month unlimited builds
- **App Store:** $99/year (iOS)
- **Google Play:** $25 one-time (Android)

## Support

### Expo Documentation
- https://docs.expo.dev/

### Common Issues
- https://github.com/expo/expo/issues

### Community
- https://forums.expo.dev/
