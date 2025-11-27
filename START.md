# 🚨 START HERE - Whisppr Demo

## ⚡ Quick Start (2 Commands)

```bash
# 1. Start Backend (Terminal 1)
cd backend && npm start

# 2. Start Mobile App (Terminal 2)
cd mobile-app && npx expo start
# Press 'i' for iOS or 'a' for Android
```

**Then press the red SOS button and check your phone!** 📱

---

## ⚙️ One-Time Setup (5 minutes)

### Step 1: Install Dependencies

```bash
# Backend
cd backend
npm install

# Mobile App (new terminal)
cd mobile-app
npm install
```

### Step 2: Configure Backend

Edit `backend/.env` - **YOUR PHONE NUMBER IS ALREADY SET!** ✅

```env
DEMO_NUMBER_1=+17135848950  # ← Already configured!
```

### Step 3: Configure Mobile App

Edit `mobile-app/App.js` line 20:

```javascript
const BACKEND_URL = 'http://YOUR_LOCAL_IP:3000';  // ← Change this!
```

**Find your IP:**
```bash
ipconfig getifaddr en0    # Mac WiFi
# or
ifconfig | grep "inet " | grep -v 127.0.0.1
```

---

## 🧪 Test Everything

```bash
# Terminal 1: Start backend
cd backend && npm start

# Terminal 2: Run tests
cd backend && npm test
```

**You should receive an SMS!** 📱

---

## 📂 Project Files

```
whisppr-demo/
├── START.md              ← YOU ARE HERE
├── README.md             ← Full documentation
├── TESTING.md            ← Testing guide
├── PACKAGE.md            ← Package overview
├── setup.sh              ← Automated setup
│
├── backend/              ← Node.js server
│   ├── server.js         ← Main server
│   ├── test.js           ← Tests
│   ├── package.json      ← Dependencies
│   └── .env              ← Configuration
│
└── mobile-app/           ← React Native app
    ├── App.js            ← Main app
    ├── package.json      ← Dependencies
    └── app.config.js     ← Expo config
```

---

## 🎯 What Each File Does

| File | What It Does |
|------|-------------|
| **backend/server.js** | Express server that sends SMS via Textbelt |
| **backend/.env** | Your configuration (phone number, API keys) |
| **mobile-app/App.js** | React Native app with SOS button and GPS |
| **backend/test.js** | Automated tests for the backend |

---

## 🚀 Complete Run Instructions

### Terminal 1 - Backend
```bash
cd backend
npm start
```

**Expected:**
```
Server running on port 3000
Textbelt API configured: true
Demo numbers configured: 1
```

### Terminal 2 - Mobile App
```bash
cd mobile-app
npx expo start
```

**Then press:**
- `i` for iOS Simulator
- `a` for Android Emulator
- Scan QR for physical device

### In the App
1. Grant location permissions
2. Wait for "Location services ready"
3. Press red **SOS** button
4. Check your phone for SMS!

---

## 📱 Expected SMS

```
[Whisppr DEMO] King may need help.
Location: https://maps.google.com/?q=32.52,-92.63
Platform: expo-demo

This is an automated emergency alert.
```

---

## 🔧 Quick Configuration Reference

### Backend (`backend/.env`)
```env
TEXTBELT_API_KEY=40a3b99250b28aa1ecd3ee7fb37ec7a31bdc442dIcJZydgXa4mz5YKqmKbd8PElr
DEMO_NUMBER_1=+17135848950  # ✅ Already set!
WHISPPR_API_KEY=demo-secret-key
PORT=3000
```

### Mobile App (`mobile-app/App.js` line 20)
```javascript
const BACKEND_URL = 'http://192.168.1.XXX:3000';  // ⚠️ Update this!
const API_KEY = 'demo-secret-key';
```

---

## 🐛 Quick Troubleshooting

**Backend won't start?**
```bash
# Check if port is free
lsof -ti:3000
# Kill process if needed
kill -9 $(lsof -ti:3000)
```

**Mobile app can't connect?**
```bash
# Find your IP
ipconfig getifaddr en0
# Update App.js line 20 with that IP
```

**No SMS received?**
- Check backend console for "SMS sent successfully"
- Verify phone number in backend/.env has +1 prefix
- Check Textbelt quota: `curl https://textbelt.com/quota/YOUR_KEY`

**Tests failing?**
- Make sure backend is running first
- Run tests in new terminal: `cd backend && npm test`

---

## 📚 More Help

- **Full documentation:** `README.md`
- **Testing guide:** `TESTING.md`
- **Package overview:** `PACKAGE.md`
- **Backend docs:** `backend/README.md`
- **Mobile docs:** `mobile-app/SETUP.md`

---

## ✅ Pre-Flight Checklist

- [ ] Node.js installed (`node -v` shows v18+)
- [ ] Backend dependencies installed (`cd backend && npm install`)
- [ ] Mobile dependencies installed (`cd mobile-app && npm install`)
- [ ] Phone number in `backend/.env` ✅ (Already done!)
- [ ] IP address in `mobile-app/App.js` line 20 ⚠️ (Update this!)

---

## 🎉 That's It!

You're ready to run the demo:

```bash
# Terminal 1
cd backend && npm start

# Terminal 2
cd mobile-app && npx expo start
```

Press SOS → Get SMS → Done! 🚀

---

**Need more help?** Read `README.md` for complete documentation.
