# 🚨 Whisppr - Emergency SOS Demo

A minimal, fast emergency alert system that sends your location via SMS to predefined contacts.

## 📦 What's Included

- **Backend:** Node.js + Express server with Textbelt SMS integration
- **Mobile App:** React Native + Expo app with emergency SOS button

## 🚀 Quick Start (5 Minutes)

### Prerequisites

- Node.js 18+ installed
- iOS Simulator or Android Emulator (or physical device)
- Phone number for testing

### 1. Setup Backend

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Configure environment (edit .env with your phone number)
nano .env

# Start server
npm start
```

Backend will run on `http://localhost:3000`

**Important:** Edit `.env` and replace `DEMO_NUMBER_1` with your real phone number in E.164 format (e.g., `+15551234567`)

### 2. Setup Mobile App

Open a **new terminal**:

```bash
# Navigate to mobile app
cd mobile-app

# Install dependencies
npm install

# Start Expo
npx expo start
```

### 3. Configure Mobile App

Edit `mobile-app/App.js` (lines 20-22):

```javascript
// IMPORTANT: Replace with your computer's local IP address
// Find your IP: Mac/Linux: ifconfig | grep "inet ", Windows: ipconfig
const BACKEND_URL = 'http://192.168.1.100:3000';  // ← Change this!
const API_KEY = 'demo-secret-key';
```

**Find your IP address:**
- **Mac/Linux:** `ifconfig | grep "inet " | grep -v 127.0.0.1`
- **Windows:** `ipconfig` and look for IPv4 Address

### 4. Run Mobile App

In the Expo terminal, press:
- `i` for iOS Simulator
- `a` for Android Emulator
- Scan QR code with Expo Go app on physical device

### 5. Test SOS Alert

1. Open the app on your device/simulator
2. Grant location permissions when prompted
3. Press the **"SOS"** red button
4. Check your phone for SMS!

## 📱 Expected Behavior

### Mobile App Flow
1. App requests location permissions
2. Location services warm up (1-2 seconds)
3. User presses SOS button
4. App gets current GPS coordinates (2-3 seconds)
5. Sends POST to backend with name + location
6. Shows success/error message

### Backend Flow
1. Receives POST request with {name, lat, lng}
2. Validates coordinates
3. Formats SMS message with Google Maps link
4. Sends SMS to all demo numbers via Textbelt
5. Returns success response immediately
6. Logs everything to console

### SMS You'll Receive
```
[Whisppr DEMO] King may need help.
Location: https://maps.google.com/?q=32.52,-92.63
Platform: expo-demo

This is an automated emergency alert.
```

## 🧪 Testing

### Test Backend Only

```bash
# In backend directory
npm test
```

This will:
- ✅ Test health check endpoint
- ✅ Test SOS endpoint with valid data
- ✅ Test authentication
- ✅ Test error handling

### Test with curl

```bash
# Health check
curl http://localhost:3000/health

# Send test SOS
curl -X POST http://localhost:3000/sos \
  -H "Content-Type: application/json" \
  -H "x-api-key: demo-secret-key" \
  -d '{
    "name": "King",
    "lat": 32.52,
    "lng": -92.63,
    "platform": "test"
  }'
```

### Test Mobile App

1. **Location Permission:** Make sure location is enabled on device
2. **Network:** Ensure device can reach your computer (same WiFi)
3. **Backend Running:** Check backend console shows no errors
4. **SOS Button:** Press and wait 5-8 seconds for SMS

## 📂 Project Structure

```
whisppr-demo/
├── backend/                 # Node.js + Express server
│   ├── server.js           # Main server (Textbelt SMS)
│   ├── test.js             # Test script
│   ├── package.json        # Dependencies
│   ├── .env                # Configuration (your phone number here!)
│   ├── vercel.json         # Vercel deployment config
│   └── README.md           # Backend-specific docs
│
├── mobile-app/              # React Native + Expo app
│   ├── App.js              # Main app (configure BACKEND_URL here!)
│   ├── package.json        # Dependencies
│   ├── app.config.js       # Expo configuration
│   ├── .env.example        # Environment template
│   └── SETUP.md            # Mobile app setup guide
│
└── README.md               # This file
```

## 🔧 Configuration

### Backend Configuration

Edit `backend/.env`:

```env
# Your Textbelt API key (provided)
TEXTBELT_API_KEY=40a3b99250b28aa1ecd3ee7fb37ec7a31bdc442dIcJZydgXa4mz5YKqmKbd8PElr

# Your phone number (REPLACE THIS!)
DEMO_NUMBER_1=+15551234567

# API security key (change in production)
WHISPPR_API_KEY=demo-secret-key

# Server settings
PORT=3000
NODE_ENV=development
```

### Mobile App Configuration

Edit `mobile-app/App.js` (lines 20-22):

```javascript
const BACKEND_URL = 'http://YOUR_LOCAL_IP:3000';  // Change this!
const API_KEY = 'demo-secret-key';                 // Match backend
```

## 🚀 Deployment

### Backend Deployment (Vercel - Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from backend directory
cd backend
vercel login
vercel --prod

# Add environment variables in Vercel dashboard:
# - TEXTBELT_API_KEY
# - WHISPPR_API_KEY
# - DEMO_NUMBER_1

# Redeploy with environment variables
vercel --prod
```

You'll get a URL like: `https://whisppr-backend.vercel.app`

### Update Mobile App with Production URL

After deploying backend, update `mobile-app/App.js`:

```javascript
const BACKEND_URL = 'https://whisppr-backend.vercel.app';
```

### Mobile App Deployment (Expo)

```bash
# Build for iOS
cd mobile-app
eas build --platform ios

# Build for Android
eas build --platform android

# Or publish update
npx expo publish
```

## 🔍 Troubleshooting

### Backend Issues

**"No demo numbers configured"**
- Edit `backend/.env` and add your phone number in E.164 format (+15551234567)

**"Textbelt API error"**
- Check API key is correct in `.env`
- Check quota: `curl https://textbelt.com/quota/YOUR_KEY`

**Port 3000 already in use**
- Change `PORT=3000` to `PORT=3001` in `backend/.env`
- Update mobile app's `BACKEND_URL` to match

### Mobile App Issues

**"Network request failed"**
- Ensure backend is running (`npm start` in backend directory)
- Check BACKEND_URL uses your computer's local IP (not localhost)
- Ensure device and computer are on same WiFi network

**"Location permission denied"**
- Go to device Settings → App permissions → Allow location
- Restart the app

**SOS button does nothing**
- Check Expo console for errors
- Verify API_KEY matches backend's WHISPPR_API_KEY
- Check backend console for incoming requests

**"Cannot connect to backend"**
- Find your IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`
- Update BACKEND_URL in App.js with correct IP
- Reload app (shake device → Reload)

### SMS Not Received

**Check backend console:**
- Should show "✓ SMS sent successfully"
- If error, check Textbelt API key and quota

**Phone number format:**
- Must use E.164 format: `+15551234567`
- Include country code with +
- No spaces, dashes, or parentheses

## 💰 Costs

- **Textbelt SMS:** $0.01 per text
- **Vercel Hosting:** Free tier (hobby projects)
- **Expo Development:** Free
- **Total for demo:** ~$0.10 for 10 test messages

## 📊 Performance

- **Location acquisition:** 2-3 seconds
- **API response:** < 100ms
- **SMS delivery:** 3-5 seconds
- **Total end-to-end:** < 8 seconds

## 🎯 What's Next?

### For Production

- [ ] Add multiple emergency contacts
- [ ] Implement contact management UI
- [ ] Add authentication (user accounts)
- [ ] Store SOS history in database
- [ ] Add battery level in SOS message
- [ ] Implement periodic location updates
- [ ] Add two-way communication
- [ ] Switch to Twilio for reliability
- [ ] Add push notifications
- [ ] Implement geofencing

### For Testing

- [x] Basic SOS functionality
- [x] Location services
- [x] SMS delivery
- [x] API authentication
- [ ] Multiple contacts
- [ ] Error handling edge cases
- [ ] Low battery scenarios
- [ ] No network scenarios

## 📝 API Documentation

### POST /sos

Send emergency SOS alert

**Endpoint:** `POST http://localhost:3000/sos`

**Headers:**
```
Content-Type: application/json
x-api-key: demo-secret-key
```

**Request Body:**
```json
{
  "name": "King",
  "lat": 32.52,
  "lng": -92.63,
  "platform": "expo-demo"
}
```

**Response:**
```json
{
  "status": "ok",
  "message": "SOS alert initiated",
  "recipients": 1,
  "responseTime": 45
}
```

### GET /health

Health check endpoint

**Endpoint:** `GET http://localhost:3000/health`

**Response:**
```json
{
  "status": "ok",
  "service": "whisppr-backend",
  "timestamp": "2025-11-24T...",
  "textbeltConfigured": true,
  "demoNumbers": 1
}
```

## 🛠️ Tech Stack

### Backend
- Node.js 18+
- Express 4.18.2
- Textbelt SMS API
- node-fetch 2.7.0
- CORS, dotenv

### Mobile App
- React Native 0.76.5
- Expo ~54.0.0
- expo-location ~18.0.4
- expo-constants ~17.0.3
- React 18.3.1

### Deployment
- Vercel (backend)
- Expo Go / EAS Build (mobile)

## 📞 Support

- **Backend issues:** Check `backend/README.md`
- **Mobile app issues:** Check `mobile-app/SETUP.md`
- **Textbelt API:** https://textbelt.com/
- **Expo docs:** https://docs.expo.dev/

## 📄 License

MIT License - Feel free to use for your projects!

---

## ⚡ TL;DR - Run Everything Now

```bash
# Terminal 1 - Backend
cd backend
npm install
nano .env  # Add your phone number
npm start

# Terminal 2 - Mobile App
cd mobile-app
npm install
nano App.js  # Update BACKEND_URL with your IP
npx expo start
# Press 'i' for iOS or 'a' for Android

# Test
# Press SOS button in app → Check your phone for SMS!
```

**That's it!** 🎉

Need help? Check the troubleshooting section above or run `npm test` in the backend directory.
