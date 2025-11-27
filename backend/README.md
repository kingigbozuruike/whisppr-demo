# Whisppr Backend - Textbelt Edition

Minimal Node.js + Express backend for Whisppr SMS demo using Textbelt API.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install express cors dotenv node-fetch
```

Or copy the dependencies from `package-textbelt.json`:

```bash
cp package-textbelt.json package.json
npm install
```

### 2. Configure Environment

```bash
cp .env.textbelt .env
```

Edit `.env` with your information:

```env
# Your Textbelt API key
TEXTBELT_API_KEY=40a3b99250b28aa1ecd3ee7fb37ec7a31bdc442dIcJZydgXa4mz5YKqmKbd8PElr

# Your phone numbers (replace with real numbers!)
DEMO_NUMBER_1=+15551234567
DEMO_NUMBER_2=+15559876543

# Change this API key
WHISPPR_API_KEY=your-secret-key
```

**Important:** Replace the demo phone numbers with your actual phone numbers in E.164 format (+1234567890).

### 3. Start Server

```bash
node server-textbelt.js
```

Or use nodemon for development:

```bash
npm run dev
```

Server will run on `http://localhost:3000`

## 📡 API Endpoints

### GET /health

Health check endpoint

**Response:**
```json
{
  "status": "ok",
  "service": "whisppr-backend-textbelt",
  "timestamp": "2025-11-24T...",
  "textbeltConfigured": true,
  "demoNumbers": 2
}
```

### POST /sos

Main SOS alert endpoint

**Headers:**
```
Content-Type: application/json
x-api-key: your-secret-key
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

**Response (immediate):**
```json
{
  "status": "ok",
  "message": "SOS alert initiated",
  "recipients": 2,
  "responseTime": 45
}
```

**SMS Message Format:**
```
[Whisppr DEMO] King may need help.
Location: https://maps.google.com/?q=32.52,-92.63
Platform: expo-demo

This is an automated emergency alert.
```

### POST /api/sos

Alternative endpoint (same as /sos)

## 🧪 Testing

### Test with curl

```bash
# Health check
curl http://localhost:3000/health

# Send SOS
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

### Test with script

```bash
npm test
```

Or:

```bash
node test-textbelt.js
```

## 📦 Required Packages

```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "node-fetch": "^2.7.0"
}
```

Install command:

```bash
npm install express cors dotenv node-fetch
```

## 🚀 Deployment

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Use Textbelt config:**
```bash
cp vercel-textbelt.json vercel.json
```

3. **Deploy:**
```bash
vercel login
vercel --prod
```

4. **Add environment variables in Vercel Dashboard:**
   - Go to Project Settings → Environment Variables
   - Add:
     - `TEXTBELT_API_KEY`
     - `WHISPPR_API_KEY`
     - `DEMO_NUMBER_1`
     - `DEMO_NUMBER_2`

5. **Redeploy:**
```bash
vercel --prod
```

### Option 2: Railway

1. **Install Railway CLI:**
```bash
npm install -g @railway/cli
```

2. **Login and initialize:**
```bash
railway login
railway init
```

3. **Set environment variables:**
```bash
railway variables set TEXTBELT_API_KEY=your-key
railway variables set WHISPPR_API_KEY=your-key
railway variables set DEMO_NUMBER_1=+1234567890
railway variables set DEMO_NUMBER_2=+1987654321
```

4. **Deploy:**
```bash
railway up
```

5. **Get your URL:**
```bash
railway domain
```

### Option 3: Render

1. **Go to [render.com](https://render.com) and sign up**

2. **Create New Web Service:**
   - Connect your GitHub repository
   - Select `backend` directory (if separate repo)

3. **Configure:**
   - **Build Command:** `npm install`
   - **Start Command:** `node server-textbelt.js`

4. **Environment Variables (add in dashboard):**
   - `TEXTBELT_API_KEY`
   - `WHISPPR_API_KEY`
   - `DEMO_NUMBER_1`
   - `DEMO_NUMBER_2`

5. **Deploy:**
   - Click "Create Web Service"
   - Wait for build to complete

## 🔧 Configuration

### Phone Numbers

Must be in E.164 format:
- ✅ `+15551234567` (US)
- ✅ `+442071234567` (UK)
- ✅ `+33612345678` (France)
- ❌ `555-123-4567` (Wrong)
- ❌ `(555) 123-4567` (Wrong)

### Textbelt API Key

**Your key:** `40a3b99250b28aa1ecd3ee7fb37ec7a31bdc442dIcJZydgXa4mz5YKqmKbd8PElr`

**For testing:** Use `textbelt` (free test key, only works with US/Canada)

**Get more credits:** https://textbelt.com/purchase/

### API Authentication

The backend uses API key authentication via `x-api-key` header.

**To change the key:**
1. Edit `.env` file: `WHISPPR_API_KEY=your-new-key`
2. Update mobile app to use same key
3. Restart backend server

## 📊 Expected Behavior

### Console Output

```
============================================================
🚨 Whisppr Emergency SOS Backend (Textbelt Edition)
============================================================
Server running on port 3000
Environment: development
Textbelt API configured: true
Demo numbers configured: 2
============================================================
Endpoints:
  GET  /health     - Health check
  POST /sos        - Emergency SOS alert
  POST /api/sos    - Alternative SOS endpoint
============================================================

[2025-11-24T12:00:00.000Z] POST /sos
============================================================
🚨 SOS ALERT RECEIVED
Name: King
Location: 32.52, -92.63
Platform: expo-demo
============================================================
Sending to 2 recipients...
Sending SMS to +15551234567 via Textbelt...
✓ SMS sent successfully to +15551234567
  Text ID: 123456789
  Quota remaining: 99
Sending SMS to +15559876543 via Textbelt...
✓ SMS sent successfully to +15559876543
  Text ID: 123456790
  Quota remaining: 98
✓ Batch complete: 2/2 sent
✓ SMS batch completed
  Success: 2/2
```

### SMS Received

```
[Whisppr DEMO] King may need help.
Location: https://maps.google.com/?q=32.52,-92.63
Platform: expo-demo

This is an automated emergency alert.
```

## 🔍 Troubleshooting

### "No demo numbers configured"

**Problem:** `DEMO_NUMBER_1` and `DEMO_NUMBER_2` not set

**Solution:**
1. Edit `.env` file
2. Add real phone numbers in E.164 format
3. Restart server

### "Textbelt API error"

**Problem:** Invalid API key or quota exceeded

**Solutions:**
1. Check API key is correct
2. Check quota at https://textbelt.com/quota/your-key
3. Purchase more credits if needed

### "Invalid coordinates"

**Problem:** Lat/lng values invalid

**Solution:**
- Latitude must be -90 to 90
- Longitude must be -180 to 180
- Both must be numbers

### "Unauthorized"

**Problem:** Wrong API key

**Solution:**
1. Check `x-api-key` header matches `.env` file
2. Make sure no extra spaces or quotes
3. Restart backend after changing `.env`

## 💰 Textbelt Pricing

- **Free:** 1 text per day with test key
- **Paid:** $0.01 per text
- **Quota:** Check at https://textbelt.com/quota/your-key

**Your current key:**
```bash
curl https://textbelt.com/quota/40a3b99250b28aa1ecd3ee7fb37ec7a31bdc442dIcJZydgXa4mz5YKqmKbd8PElr
```

## 🔄 Differences from Twilio Version

### Textbelt (This Version)
✅ Simpler setup (no account needed)  
✅ Lower cost ($0.01 per SMS)  
✅ Instant activation  
✅ No phone number needed  
❌ Less reliable for high volume  
❌ Limited features (no delivery webhooks)  

### Twilio (Original Version)
✅ Enterprise reliability  
✅ Delivery tracking  
✅ Global coverage  
✅ Advanced features  
❌ More expensive (~$0.0075 per SMS + phone rental)  
❌ Account verification required  
❌ More complex setup  

## 📝 File Structure

```
backend/
├── server-textbelt.js        # Main server file (this version)
├── server.js                 # Original Twilio version
├── package-textbelt.json     # Dependencies for Textbelt
├── package.json              # Original dependencies
├── .env.textbelt             # Textbelt config template
├── .env.example              # Twilio config template
├── test-textbelt.js          # Test script for Textbelt
├── test.js                   # Original test script
├── vercel-textbelt.json      # Vercel config for Textbelt
└── vercel.json               # Original Vercel config
```

## 🚀 Quick Deploy Commands

### Vercel
```bash
# One-time setup
npm install -g vercel
cp vercel-textbelt.json vercel.json

# Deploy
vercel login
vercel --prod

# Add secrets in dashboard
# Then redeploy
vercel --prod
```

### Railway
```bash
# One-time setup
npm install -g @railway/cli

# Deploy
railway login
railway init
railway variables set TEXTBELT_API_KEY=your-key
railway variables set WHISPPR_API_KEY=your-key
railway variables set DEMO_NUMBER_1=+1234567890
railway variables set DEMO_NUMBER_2=+1987654321
railway up
railway domain
```

### Render
1. Go to render.com
2. New Web Service → Connect GitHub
3. Build: `npm install`
4. Start: `node server-textbelt.js`
5. Add environment variables in dashboard
6. Deploy!

## 🧪 Testing Checklist

- [ ] Server starts without errors
- [ ] Health check returns 200 OK
- [ ] POST /sos returns 200 OK
- [ ] Console shows SOS alert received
- [ ] Console shows "Sending to X recipients"
- [ ] Console shows "SMS sent successfully"
- [ ] Phone receives SMS
- [ ] Google Maps link works in SMS
- [ ] Invalid API key returns 401
- [ ] Missing fields returns 400

## 📱 Mobile App Configuration

Update your mobile app to use this backend:

**In `mobile-app/.env`:**
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_API_KEY=demo-secret-key
```

**Or in `mobile-app/App.js`:**
```javascript
const BACKEND_URL = 'http://192.168.1.100:3000'; // Your IP
const API_KEY = 'demo-secret-key';
```

## 🎯 Success Criteria

✅ Server starts on port 3000  
✅ Health check responds  
✅ Accepts POST /sos requests  
✅ Validates coordinates  
✅ Sends SMS via Textbelt  
✅ Returns { status: "ok" }  
✅ Console logs detailed info  
✅ Works with multiple phone numbers  
✅ Handles errors gracefully  

---

**Ready to test?** Run `node server-textbelt.js` and send a test SOS! 🚀

**Need help?** Check the troubleshooting section above.
