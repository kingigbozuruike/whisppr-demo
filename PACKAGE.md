# 📦 Whisppr Demo - Complete Package

## 🎯 What You Have

A complete, working emergency SOS system with:
- ✅ Backend server with SMS integration
- ✅ Mobile app with location services
- ✅ All configuration files
- ✅ Complete documentation
- ✅ Test scripts
- ✅ Deployment configs

## 📂 Final Structure

```
whisppr-demo/
│
├── 📄 README.md              # Main guide - START HERE
├── 📄 TESTING.md             # Complete testing guide
├── 📄 setup.sh               # Automated setup script
├── 📄 .gitignore             # Git ignore rules
│
├── 📁 backend/               # Node.js + Express server
│   ├── server.js            # Main server (Textbelt SMS)
│   ├── test.js              # Test suite
│   ├── package.json         # Dependencies
│   ├── .env                 # YOUR CONFIGURATION HERE!
│   ├── .gitignore           # Git ignore
│   ├── vercel.json          # Vercel deployment
│   └── README.md            # Backend documentation
│
└── 📁 mobile-app/           # React Native + Expo app
    ├── App.js               # Main app - CONFIGURE BACKEND_URL HERE!
    ├── package.json         # Dependencies
    ├── app.config.js        # Expo configuration
    ├── app.json             # Expo metadata
    ├── babel.config.js      # Babel config
    ├── .env.example         # Environment template
    ├── .gitignore           # Git ignore
    ├── SETUP.md             # Mobile app guide
    └── README.md            # Mobile app docs
```

## 🚀 How to Run Everything

### Option 1: Automated Setup (Recommended)

```bash
# From project root
./setup.sh
```

This will:
1. Check prerequisites (Node.js, npm)
2. Install all dependencies
3. Detect your local IP
4. Show you what to configure

### Option 2: Manual Setup

```bash
# Terminal 1 - Backend
cd backend
npm install
nano .env          # Add your phone number!
npm start

# Terminal 2 - Mobile App  
cd mobile-app
npm install
nano App.js        # Update BACKEND_URL with your IP!
npx expo start
# Press 'i' for iOS or 'a' for Android
```

## ⚙️ Required Configuration

### 1. Backend Configuration

Edit `backend/.env`:

```env
# Your Textbelt API key (already set)
TEXTBELT_API_KEY=40a3b99250b28aa1ecd3ee7fb37ec7a31bdc442dIcJZydgXa4mz5YKqmKbd8PElr

# YOUR PHONE NUMBER (E.164 format with country code)
DEMO_NUMBER_1=+17135848950  # ← Already configured!

# API security
WHISPPR_API_KEY=demo-secret-key

# Server settings
PORT=3000
NODE_ENV=development
```

**✅ Your phone number is already set!**

### 2. Mobile App Configuration

Edit `mobile-app/App.js` (lines 20-22):

```javascript
// IMPORTANT: Replace with your computer's local IP address
// Find your IP: Mac/Linux: ifconfig | grep "inet ", Windows: ipconfig
const BACKEND_URL = 'http://192.168.1.XXX:3000';  // ← Change this!
const API_KEY = 'demo-secret-key';
```

**Find your IP:**
```bash
# Mac/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Or simpler
ipconfig getifaddr en0     # WiFi
ipconfig getifaddr en1     # Ethernet
```

## 🧪 How to Test Everything

### Quick Test (2 minutes)

```bash
# Terminal 1 - Start backend
cd backend && npm start

# Terminal 2 - Run tests
cd backend && npm test

# Check your phone for SMS!
```

### Full Test (5 minutes)

```bash
# Terminal 1 - Backend
cd backend && npm start

# Terminal 2 - Mobile app
cd mobile-app && npx expo start
# Press 'i' or 'a'

# In the app:
# 1. Allow location permissions
# 2. Wait for "ready" message
# 3. Press SOS button
# 4. Check your phone!
```

### Manual Test with curl

```bash
curl -X POST http://localhost:3000/sos \
  -H "Content-Type: application/json" \
  -H "x-api-key: demo-secret-key" \
  -d '{
    "name": "Test",
    "lat": 32.52,
    "lng": -92.63,
    "platform": "curl"
  }'
```

## 📱 Expected Results

### Backend Console
```
============================================================
🚨 Whisppr Emergency SOS Backend (Textbelt Edition)
============================================================
Server running on port 3000
Environment: development
Textbelt API configured: true
Demo numbers configured: 1
============================================================

[2025-11-24T...] POST /sos
============================================================
🚨 SOS ALERT RECEIVED
Name: King
Location: 32.52, -92.63
Platform: expo-demo
============================================================
✓ SMS sent successfully to +17135848950
  Text ID: 123456789
  Quota remaining: 99
```

### SMS on Your Phone
```
[Whisppr DEMO] King may need help.
Location: https://maps.google.com/?q=32.52,-92.63
Platform: expo-demo

This is an automated emergency alert.
```

### Mobile App
- Shows "Location services ready"
- Red SOS button is visible
- After press: "Sending SOS..."
- Then: "SOS sent successfully!"

## 📚 Documentation

| File | Purpose | When to Read |
|------|---------|--------------|
| **README.md** | Main overview and setup | Start here |
| **TESTING.md** | Complete testing guide | Before testing |
| **backend/README.md** | Backend API docs | For deployment |
| **mobile-app/SETUP.md** | Mobile app details | Troubleshooting |

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express 4.18.2
- **SMS:** Textbelt API via node-fetch
- **Features:** CORS, dotenv, JSON parsing

### Mobile App
- **Framework:** React Native 0.72.6
- **Platform:** Expo ~49.0.0
- **Location:** expo-location ~16.1.0
- **Features:** GPS, animated UI, error handling

## 🎯 Key Features

### Backend
✅ Health check endpoint  
✅ SOS alert endpoint  
✅ API key authentication  
✅ Coordinate validation  
✅ SMS sending via Textbelt  
✅ Detailed console logging  
✅ Error handling  
✅ CORS support  

### Mobile App
✅ Location permissions  
✅ GPS warm-up  
✅ Three-strategy location fetch  
✅ SOS button with feedback  
✅ Error messages  
✅ Animated UI  
✅ Backend integration  
✅ Platform detection  

## 💰 Costs

- **Development:** Free
- **Testing (10 SMS):** ~$0.10
- **Deployment:** Free (Vercel hobby tier)
- **Total:** **< $1 for complete demo**

## 🚀 Next Steps

### To Run Demo
1. ✅ Configure backend/.env (already done!)
2. ⚠️  Update mobile-app/App.js BACKEND_URL
3. ✅ Run `./setup.sh` or manual steps
4. ✅ Test with `npm test`
5. ✅ Run mobile app and press SOS

### To Deploy
1. Deploy backend: `cd backend && vercel --prod`
2. Update mobile app with production URL
3. Build mobile app: `eas build`
4. Test end-to-end

### To Improve
- Add multiple contacts
- Implement contact management
- Add user authentication
- Store SOS history
- Add battery level
- Implement chat feature

## 🔍 Troubleshooting Quick Links

| Problem | Solution |
|---------|----------|
| Backend won't start | Check if port 3000 is free |
| Tests fail | Make sure backend is running first |
| Mobile app can't connect | Update BACKEND_URL with your local IP |
| No SMS received | Check phone number format in .env |
| Location not working | Grant permissions in device settings |
| API returns 401 | Check API_KEY matches in both files |

## ✅ Pre-Flight Checklist

Before running:
- [ ] Node.js 18+ installed
- [ ] Backend dependencies installed (`npm install`)
- [ ] Mobile dependencies installed (`npm install`)
- [ ] Phone number added to backend/.env
- [ ] BACKEND_URL updated in mobile-app/App.js
- [ ] Backend server running (Terminal 1)
- [ ] Mobile app started (Terminal 2)
- [ ] Device/simulator ready

## 📞 Quick Commands Reference

```bash
# Setup
./setup.sh                    # Automated setup

# Backend
cd backend
npm install                   # Install dependencies
npm start                     # Start server
npm test                      # Run tests

# Mobile App
cd mobile-app
npm install                   # Install dependencies
npx expo start                # Start Expo
# Press 'i' (iOS) or 'a' (Android)

# Testing
curl http://localhost:3000/health              # Health check
curl -X POST http://localhost:3000/sos ...     # Send SOS

# Deployment
cd backend && vercel --prod                     # Deploy backend
cd mobile-app && eas build --platform ios      # Build iOS
```

## 🎉 You're Ready!

Everything is set up and ready to run. Just:

1. **Update mobile-app/App.js** with your IP address
2. **Run backend:** `cd backend && npm start`
3. **Run mobile app:** `cd mobile-app && npx expo start`
4. **Press SOS** and get your emergency SMS!

For detailed instructions, see **README.md** or **TESTING.md**.

---

**Questions?** Check the documentation files or run `npm test` to verify everything works!
