# 🗺️ Next.js Live Tracking Map - Testing Guide

## ✅ What's Been Built

### Frontend (Next.js 14 + Mapbox GL JS)
- **Location**: `maps/sos-map/`
- **Framework**: Next.js 14 with App Router
- **Map Library**: Mapbox GL JS (smooth animations, custom markers)
- **Real-time**: Socket.IO client for live location updates
- **Components**:
  - `LiveMap.tsx` - Mapbox map with custom pulsing marker, breadcrumb trail, popups
  - `SOSDetails.tsx` - Session info, status badge, action buttons (Call 911, Open in Maps, Share)
  - Main page: `app/sos/[shortId]/page.tsx` - Integrates everything

### Features
✨ Real-time location updates via WebSocket  
✨ Pulsing animated marker for active sessions  
✨ Breadcrumb trail showing recent path  
✨ Location popups with coordinates, accuracy, speed, battery  
✨ Connection status indicator  
✨ Watcher count (how many people are viewing)  
✨ Action buttons:
   - 📞 Call 911 (tel: link)
   - 🗺️ Open in Maps (Google Maps)
   - 🔗 Share Link (Web Share API + clipboard fallback)  
✨ Live "last updated" timer  
✨ Mobile-first responsive design  

---

## 🚀 How to Test

### 1. Start Both Servers

**Terminal 1: Backend (Port 3000)**
```bash
cd /Users/user1/Desktop/whisppr-demo/backend
node server-live.js
```

**Terminal 2: Frontend (Port 3001)**
```bash
cd /Users/user1/Desktop/whisppr-demo/maps/sos-map
npm run dev
```

### 2. Open the Existing SOS Session

There's already an active SOS session from testing:

**🔗 Open this URL in your browser:**
```
http://localhost:3001/sos/P8T3LUTAH
```

You should see:
- 🗺️ Mapbox map centered on San Francisco
- 📍 Red pulsing marker at the user's location
- 📊 Session details panel at bottom
- 🟢 Green connection indicator

### 3. Send Live Location Updates

While the map page is open, run this in a new terminal:

```bash
cd /Users/user1/Desktop/whisppr-demo
node test-update-location.js P8T3LUTAH
```

Watch the map:
- ✨ Marker animates smoothly to new locations
- 🔵 Breadcrumb trail extends showing the path
- ⏱️ "Last updated" timer resets
- 🔄 All updates happen in real-time via WebSocket

---

## 🎯 Testing Checklist

### Basic Functionality
- [ ] Map loads with Mapbox Streets style
- [ ] Initial marker appears at correct location
- [ ] Session details show at bottom (name, phone, status)
- [ ] Connection status shows "Connected" (green dot)

### Real-time Updates
- [ ] Run `test-update-location.js` script
- [ ] Marker moves smoothly to new location (animated)
- [ ] Breadcrumb trail extends with each update
- [ ] "Last updated" timer resets with each update
- [ ] No page refresh required

### Interactive Features
- [ ] Click marker → Popup shows location details
- [ ] Click "Call 911" → Opens phone dialer
- [ ] Click "Open in Maps" → Opens Google Maps in new tab
- [ ] Click "Share Link" → Copies URL or triggers share sheet
- [ ] Zoom/pan map → Works smoothly

### Multiple Viewers
- [ ] Open the same URL in multiple browser windows
- [ ] Send location update → All windows update simultaneously
- [ ] Watcher count increases with each viewer

### Error Handling
- [ ] Visit invalid shortId → Shows "SOS Not Found" error
- [ ] Disconnect backend → Connection status shows "Disconnected" (red dot)
- [ ] Reconnect backend → Auto-reconnects within 5 seconds

---

## 📱 Mobile Testing

### Responsive Design
1. Open DevTools (F12)
2. Click device toolbar (Cmd/Ctrl + Shift + M)
3. Select iPhone or Android device
4. Verify:
   - [ ] Map fills screen properly
   - [ ] Details panel doesn't block map too much
   - [ ] Action buttons are thumb-friendly
   - [ ] No horizontal scrolling

### Touch Interactions
- [ ] Pinch to zoom
- [ ] Pan with one finger
- [ ] Tap marker for popup
- [ ] Tap action buttons

---

## 🔧 Creating a New SOS Session

If you want to create a fresh session:

```bash
# First, resolve the existing session via API
curl -X PUT http://localhost:3000/api/sos/P8T3LUTAH/status \
  -H "Content-Type: application/json" \
  -H "X-API-Key: demo-secret-key" \
  -d '{"status":"resolved"}'

# Then create a new one
cd /Users/user1/Desktop/whisppr-demo
node test-create-sos.js
```

The script will output a URL like:
```
http://localhost:3001/sos/ABC123XYZ
```

---

## 🐛 Troubleshooting

### Map doesn't load
**Problem**: Blank screen or error  
**Fix**: Check Mapbox token in `maps/sos-map/.env.local`
```bash
# Currently using placeholder token
# Get real token from: https://account.mapbox.com/access-tokens/
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1...
```

### Connection shows "Disconnected"
**Problem**: Red dot, no live updates  
**Fix**: Make sure backend is running on port 3000
```bash
cd backend && node server-live.js
```

### Location updates don't appear
**Problem**: Script runs but map doesn't update  
**Fix**: Check console for errors (F12 → Console tab)
- Backend logs should show "Client subscribed to P8T3LUTAH"
- Frontend logs should show "[WS] Location update received"

### "SOS Not Found" error
**Problem**: Invalid shortId or expired session  
**Fix**: Session expired (4 hours default) - create a new one with `test-create-sos.js`

---

## 📊 What to Look For

### Performance
- Map loads in < 2 seconds
- Location updates animate in < 100ms
- No lag when zooming/panning
- Smooth marker animations (no jittering)

### Real-time Quality
- Updates appear instantly (< 500ms latency)
- Multiple viewers stay in sync
- No updates are lost/skipped
- WebSocket reconnects automatically if disconnected

### UX Polish
- Pulsing marker catches attention
- Breadcrumb trail provides context
- Popups show useful information
- Action buttons work on first tap
- Loading states show while fetching data

---

## 🎉 Success Criteria

The map is working perfectly if:

1. ✅ You can open the URL and see the map immediately
2. ✅ Location updates appear in real-time without refresh
3. ✅ Marker animates smoothly between locations
4. ✅ Breadcrumb trail extends with movement
5. ✅ All action buttons work correctly
6. ✅ Multiple viewers see the same updates simultaneously
7. ✅ Connection status shows current state accurately
8. ✅ Mobile view is fully functional and responsive

---

## 📁 Key Files

```
maps/sos-map/
├── app/
│   ├── layout.tsx              # Root layout (imports Mapbox CSS)
│   └── sos/[shortId]/
│       └── page.tsx            # Main SOS tracking page
├── components/
│   ├── LiveMap.tsx             # Mapbox GL JS map component
│   └── SOSDetails.tsx          # Session info + action buttons
├── hooks/
│   └── useSOSWebSocket.ts      # WebSocket connection hook
├── lib/
│   └── api.ts                  # API service (fetch session data)
├── types/
│   └── sos.ts                  # TypeScript interfaces
└── .env.local                  # Environment variables

backend/
├── server-live.js              # Main server (Express + Socket.IO)
├── routes/sos.js               # API endpoints
└── websocket/handler.js        # WebSocket event handlers

test-update-location.js         # Send test location updates
test-create-sos.js              # Create new SOS session
```

---

## 🚦 Next Steps

Once testing is complete, you can:

1. **Deploy Frontend**: Vercel, Netlify, or any static host
2. **Get Real Mapbox Token**: https://account.mapbox.com/
3. **Customize Styling**: Edit `LiveMap.tsx` and `SOSDetails.tsx`
4. **Add Features**:
   - Photos/videos from SOS session
   - Chat between user and watchers
   - Save favorite locations
   - Export GPX track
   - Emergency contact notifications

---

## 💡 Tips

- **Browser Console**: F12 → Console shows detailed logs for debugging
- **Network Tab**: See WebSocket connection and API calls
- **Multiple Windows**: Test with 2+ browser windows for multi-viewer experience
- **Mobile Emulation**: Use Chrome DevTools device mode
- **Slow Network**: Throttle network in DevTools to test loading states

Happy testing! 🎉
