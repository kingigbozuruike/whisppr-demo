# Whisppr Live SOS Maps - Product & Architecture Definition

## Executive Summary

Whisppr Live SOS Maps provides real-time location tracking for emergency situations, accessible via a secure web link sent through WhatsApp. When someone triggers an SOS, their trusted contacts receive both a WhatsApp location pin and a live tracking link that shows continuous updates.

---

## User Flow

### Step-by-Step: From SOS Trigger to Live Map View

1. **User Triggers SOS**
   - User opens Whisppr mobile app
   - Long-presses or taps SOS button
   - App confirms intent (prevent accidental triggers)
   - App captures current location immediately

2. **Session Creation**
   - Mobile app sends SOS request to backend API
   - Backend creates unique SOS session with random ID (e.g., `ABC123`)
   - Backend stores: user info, initial location, timestamp, session status
   - Backend returns session ID to mobile app

3. **Alert Dispatch**
   - Backend identifies trusted contacts from user profile
   - Backend sends WhatsApp Cloud API messages to each contact:
     * Emergency alert text with user name, timestamp
     * Native WhatsApp location pin (current position)
     * **Live tracking link**: `https://maps.whisppr.app/sos/ABC123`
   - Backend logs all sent messages

4. **Mobile Location Streaming**
   - Mobile app enters "SOS active" mode
   - App continuously sends location updates every 10-15 seconds
   - Updates include: lat, lng, accuracy, speed, heading, battery level
   - App handles background location (iOS/Android permissions)
   - Updates continue until user cancels SOS or timeout (e.g., 4 hours)

5. **Contact Opens Live Map**
   - Contact taps Whisppr link in WhatsApp
   - Browser opens: `https://maps.whisppr.app/sos/ABC123`
   - Page validates session ID (404 if invalid/expired)
   - Page establishes WebSocket connection to backend
   - Map loads with initial location marker

6. **Live Updates Display**
   - WebSocket receives location updates in real-time
   - Map marker animates to new position
   - Trail/breadcrumb shows movement history
   - UI shows:
     * Time since last update (e.g., "Updated 3s ago")
     * Connection status indicator
     * Movement speed (if available)
   - Updates continue until SOS ends or user closes tab

7. **Contact Takes Action** (optional)
   - **Call 911**: Opens device dialer with emergency number
   - **Call User**: Opens dialer with user's phone number
   - **Open in Google Maps**: Deep link with coordinates
   - **Share SOS**: Copy link or share via native share API

8. **SOS Termination**
   - User cancels SOS in app → backend closes session → map shows "SOS ended"
   - Auto-expire after 4 hours → map shows "Session expired"
   - Contact can close browser tab anytime

---

## System Architecture

```
┌─────────────────┐
│   Mobile App    │ (React Native/Expo)
│  (User in SOS)  │
└────────┬────────┘
         │ HTTPS POST /sos/create
         │ HTTPS POST /sos/{id}/location (every 10s)
         ▼
┌─────────────────────────────────────────┐
│         Backend API (Node.js/Express)   │
│  ┌──────────────┐  ┌─────────────────┐ │
│  │ SOS Session  │  │ Location Update │ │
│  │   Manager    │  │    Handler      │ │
│  └──────┬───────┘  └────────┬────────┘ │
│         │                   │          │
│         ▼                   ▼          │
│  ┌──────────────────────────────────┐  │
│  │    Database (PostgreSQL/Redis)   │  │
│  │  - Sessions, Locations, Users    │  │
│  └──────────────────────────────────┘  │
│         │                   │          │
│         ▼                   ▼          │
│  ┌──────────────┐  ┌─────────────────┐ │
│  │  WhatsApp    │  │   WebSocket     │ │
│  │  Dispatcher  │  │  Broadcaster    │ │
│  └──────┬───────┘  └────────┬────────┘ │
└─────────┼──────────────────┼──────────┘
          │                  │
          ▼                  ▼
┌───────────────────┐ ┌────────────────┐
│ WhatsApp Cloud API│ │  WebSocket     │
│ (Meta Graph API)  │ │  Connections   │
└───────────────────┘ └────────┬───────┘
                               │
                               ▼
                      ┌─────────────────┐
                      │  Map Frontend   │
                      │  (Next.js/React)│
                      │  - Mapbox/Google│
                      │  - Real-time UI │
                      └─────────────────┘
```

### Technology Stack (Proposed)

**Backend:**
- Node.js + Express (existing)
- WebSocket server (ws or Socket.io)
- PostgreSQL or MongoDB for sessions/users
- Redis for real-time location cache + WebSocket room management

**Frontend:**
- Next.js 14+ (App Router)
- React + TypeScript
- Mapbox GL JS or Google Maps API
- WebSocket client (native or Socket.io-client)
- Tailwind CSS for styling

**Infrastructure:**
- Backend: Deployed on Render/Railway/Fly.io
- Frontend: Deployed on Vercel
- Database: Managed PostgreSQL (Supabase/Neon) or MongoDB Atlas
- Redis: Upstash Redis (serverless)

---

## Components

### 1. SOS Session Manager (Backend)

**Responsibility:**
- Create unique SOS sessions with cryptographically random IDs
- Store session metadata: user, start time, status (active/ended/expired)
- Validate session access (check expiry, status)
- Close sessions (user-triggered or auto-expire)

**Key Methods:**
```
createSession(userId, initialLocation) → sessionId
getSession(sessionId) → session or null
updateSessionStatus(sessionId, status)
expireStaleSessions() // Cron job every 5 min
```

**Data Model:**
```json
{
  "id": "ABC123",
  "userId": "user_456",
  "userName": "King",
  "status": "active",
  "createdAt": "2025-11-27T10:00:00Z",
  "expiresAt": "2025-11-27T14:00:00Z",
  "lastLocationAt": "2025-11-27T10:05:23Z",
  "initialLocation": { "lat": 32.52, "lng": -92.63 }
}
```

---

### 2. Location Update Handler (Backend)

**Responsibility:**
- Receive location updates from mobile app
- Validate session is active
- Store location in Redis (fast) + database (persistent)
- Broadcast location to WebSocket clients watching this session

**Key Methods:**
```
handleLocationUpdate(sessionId, locationData)
getLocationHistory(sessionId, limit)
getCurrentLocation(sessionId)
```

**Location Data Model:**
```json
{
  "sessionId": "ABC123",
  "lat": 32.5201,
  "lng": -92.6305,
  "accuracy": 10,
  "speed": 0,
  "heading": 180,
  "batteryLevel": 75,
  "timestamp": "2025-11-27T10:05:23Z"
}
```

**Storage Strategy:**
- **Redis**: Store last 50 locations per session (circular buffer)
  - Key: `sos:ABC123:locations`
  - TTL: 4 hours
- **Database**: Store all locations for audit/history
  - Only write every 30s to reduce DB load (unless significant movement)

---

### 3. WebSocket Broadcaster (Backend)

**Responsibility:**
- Manage WebSocket connections from map viewers
- Organize connections into "rooms" by session ID
- Broadcast location updates to all viewers of a session
- Handle connect/disconnect events

**Key Methods:**
```
onConnection(ws, sessionId)
broadcastLocation(sessionId, locationData)
broadcastSessionEnd(sessionId)
onDisconnect(ws)
```

**WebSocket Message Format:**
```json
// Client → Server (join session)
{
  "type": "join",
  "sessionId": "ABC123"
}

// Server → Client (location update)
{
  "type": "location",
  "data": {
    "lat": 32.5201,
    "lng": -92.6305,
    "accuracy": 10,
    "speed": 0,
    "timestamp": "2025-11-27T10:05:23Z"
  }
}

// Server → Client (session ended)
{
  "type": "session_end",
  "reason": "user_cancelled" | "expired"
}
```

**Scaling Considerations:**
- Use Redis Pub/Sub if running multiple backend servers
- Each server subscribes to `sos:{sessionId}` channel
- Location updates published to Redis → all servers broadcast to their WebSocket clients

---

### 4. WhatsApp Integration Service (Backend)

**Responsibility:**
- Send emergency alerts via WhatsApp Cloud API
- Send native location message (static pin)
- Include live tracking link in alert text
- Handle message delivery status/webhooks (future)

**Key Methods:**
```
sendSOSAlert(sessionId, contacts)
sendLocationPin(phoneNumber, lat, lng, name)
sendAlertText(phoneNumber, userName, mapLink, timestamp)
```

**Message Template:**
```
🚨 EMERGENCY ALERT

{userName} may need help!

Platform: iOS
Time: Nov 27, 10:00 AM

📍 Live Location: https://maps.whisppr.app/sos/ABC123

[Native WhatsApp location pin follows]
```

---

### 5. Map Page Client (Frontend - Next.js)

**Responsibility:**
- Render live map with user's location marker
- Establish WebSocket connection on page load
- Update marker position on new location events
- Show metadata (time since update, battery, speed)
- Provide action buttons (call, share, navigate)

**Key Features:**

**a) Map Display:**
- Mapbox GL JS or Google Maps
- Center on user's location
- Zoom level 15-16 (street level)
- Custom marker icon (red pulsing dot)
- Breadcrumb trail (last 20 positions, fading opacity)

**b) Real-time Updates:**
- WebSocket connection with auto-reconnect
- Smooth marker animation (interpolate between points)
- Show "Connecting..." / "Live" / "Offline" status
- Display "Updated Xs ago" (refresh every second)

**c) Action Bar:**
```
┌─────────────────────────────────────────┐
│ 🚨 King needs help                       │
│ Updated 3 seconds ago           [Live 🟢]│
├─────────────────────────────────────────┤
│ [📞 Call 911] [📞 Call King]            │
│ [🗺️ Open in Maps] [📤 Share]            │
└─────────────────────────────────────────┘
```

**d) Info Panel (collapsible):**
- Battery level
- Movement speed
- Location accuracy
- Time since SOS started
- Session expiry countdown

**Page Structure:**
```
/maps/sos/[sessionId]/page.tsx
  ├─ MapView component (Mapbox/Google Maps)
  ├─ LiveMarker component (animated marker)
  ├─ Breadcrumbs component (trail)
  ├─ ActionBar component (buttons)
  ├─ StatusBar component (live/offline indicator)
  └─ WebSocketProvider (context for real-time data)
```

**Error Handling:**
- Session not found → Show "Invalid SOS link"
- Session expired → Show "This SOS has ended"
- No location data → Show "Waiting for location..."
- WebSocket disconnected → Show reconnecting spinner

---

## MVP vs Future

### MVP (Must-Have for First Demo)

**Core Features:**
- [x] SOS session creation with unique ID
- [x] Live location updates from mobile app (10s interval)
- [x] WhatsApp alert with native location + live link
- [x] Map page showing real-time location marker
- [x] WebSocket-based live updates
- [x] Basic action buttons (Call 911, Open in Maps)
- [x] Session expiry (4 hours)
- [x] "Time since update" indicator
- [x] Mobile-responsive map page

**Constraints:**
- Single user can have 1 active SOS at a time
- Max 4-hour session duration
- Max 10 concurrent viewers per session (rate limit)
- Location history limited to 50 points in memory

**Out of Scope for MVP:**
- User authentication (anyone with link can view)
- Multiple emergency contacts (hard-coded to 2 numbers)
- Historical SOS playback
- Advanced analytics/reports

---

### Future Features (Post-MVP)

**Phase 2 - Enhanced Tracking:**
- [ ] Audio streaming (2-way voice with contacts)
- [ ] Photo/video capture and share
- [ ] Panic button history (view past SOS events)
- [ ] Geofencing alerts (notify if user leaves area)
- [ ] Custom alert messages (pre-set templates)

**Phase 3 - Social Features:**
- [ ] Contact groups (family, friends, coworkers)
- [ ] Contact can acknowledge alert ("I'm on my way")
- [ ] Multi-contact coordination (avoid duplicate 911 calls)
- [ ] Chat between contacts on SOS page

**Phase 4 - Integrations:**
- [ ] Emergency services integration (e911)
- [ ] Medical info display (allergies, conditions)
- [ ] Insurance/telematics integration
- [ ] Ride-share/taxi auto-dispatch

**Phase 5 - Enterprise:**
- [ ] Multi-tenant (corporate safety)
- [ ] Role-based access (managers, HR, security)
- [ ] Compliance/audit logs (HIPAA, GDPR)
- [ ] On-premise deployment option

---

## Performance & Reliability

### Update Interval Strategy

**Mobile → Backend:**
- **Normal mode**: 15 seconds (battery-friendly)
- **Movement detected**: 10 seconds (more frequent)
- **Stationary**: 30 seconds (reduce load)
- Use iOS/Android significant location change API

**Backend → WebSocket Clients:**
- Instant broadcast on receive (no batching)
- Max 100 updates/minute per session (rate limit)

**Rationale:**
- 10-15s is fast enough for emergency response
- Avoids excessive battery drain on user's phone
- Reduces backend/database load
- Still feels "live" to contacts watching

---

### Handling Device Offline Scenarios

**Problem:** User's phone loses network (tunnel, basement, dead battery)

**Solution:**

1. **Mobile App:**
   - Queue location updates locally while offline
   - When back online, upload backlog (up to 50 points)
   - Show "Offline mode" to user

2. **Backend:**
   - Mark session as "stale" if no update for 2 minutes
   - Keep session active (don't auto-expire immediately)
   - Store last known location

3. **Map Frontend:**
   - Show "Last seen 2 minutes ago" (yellow indicator)
   - Keep marker at last known position
   - Show warning: "⚠️ May be offline or in poor signal area"
   - Don't disconnect WebSocket (keep trying)

4. **Recovery:**
   - When app reconnects, backend broadcasts "back online"
   - Map shows "Live" indicator again
   - Backlog updates animate quickly (catch-up mode)

---

### Handling SOS Expiry

**Auto-Expire Logic:**
- Default timeout: 4 hours from session creation
- User can manually end SOS in mobile app
- Admin can force-end via API (future: abuse prevention)

**Expiry Flow:**

1. **Cron Job** (runs every 5 minutes):
   - Query sessions where `expiresAt < NOW()` and `status = 'active'`
   - Update status to `'expired'`
   - Broadcast "session_end" event to WebSocket clients
   - Send "SOS expired" notification to contacts (future)

2. **Map Frontend:**
   - Receives `session_end` event
   - Show overlay: "This SOS has ended" or "Session expired"
   - Disable action buttons
   - Keep map visible (last known location)

3. **Data Retention:**
   - Keep expired sessions in DB for 30 days (audit)
   - Delete location data after 7 days (privacy)
   - User can request immediate deletion

---

### Scalability Considerations

**Current Load (MVP):**
- Assume 100 concurrent active SOS sessions
- Each session: 1 user + 2-5 viewers = ~500 WebSocket connections
- 6 location updates/minute/session = 600 updates/min = 10 req/s
- Easily handled by single Node.js server

**Scaling Path:**

**Tier 1 (0-1,000 sessions):**
- Single backend server
- Redis for caching
- Managed PostgreSQL

**Tier 2 (1,000-10,000 sessions):**
- Multiple backend servers (load balanced)
- Redis Pub/Sub for WebSocket broadcast
- Read replicas for database
- CDN for frontend (Vercel)

**Tier 3 (10,000+ sessions):**
- Kubernetes cluster
- Dedicated WebSocket servers (separate from API)
- Sharded Redis (by session ID hash)
- Time-series database for locations (InfluxDB/TimescaleDB)

---

## Privacy & Security

### Non-Guessable SOS IDs

**Problem:** Sequential IDs are guessable (ABC001, ABC002, etc.)

**Solution:**
- Use `crypto.randomBytes(16).toString('base64url')`
- Example: `Xy7K-9mL2pQ8nR3vW1sA`
- 128 bits of entropy = 2^128 possible IDs
- Collision probability: negligible for billions of sessions

**Why not UUIDs?**
- UUIDs are long (36 chars)
- Our IDs are shorter (22 chars) → easier to share
- Still cryptographically secure

---

### Link Expiry

**Automatic Expiry:**
- All sessions expire after 4 hours (hard limit)
- Users can manually end SOS earlier
- Expired sessions return 404 on map page

**Extended Access (Future):**
- Allow user to generate "replay links" (read-only history)
- Replay links expire after 24 hours
- Require password for replay access

---

### No PII in URL

**Bad:** `https://maps.whisppr.app/sos/king-emergency-123`
**Good:** `https://maps.whisppr.app/sos/Xy7K-9mL2pQ8nR3vW1sA`

**Why:**
- URLs are logged by proxies, CDNs, analytics tools
- Don't leak user identity in URL structure
- Session ID is opaque token

**User Name Display:**
- Fetch from backend after validating session ID
- Only show to authorized viewers (anyone with link for MVP)
- Don't include in URL parameters

---

### Basic Rate Limiting

**API Endpoints:**

| Endpoint | Limit | Window | Reason |
|----------|-------|--------|--------|
| POST /sos/create | 5 req | 1 hour | Prevent SOS spam |
| POST /sos/{id}/location | 120 req | 1 min | 2 updates/sec max |
| GET /sos/{id} | 60 req | 1 min | Prevent session scraping |
| WebSocket connections | 10 | per session | Prevent viewer DoS |

**Implementation:**
- Use Redis + `rate-limiter-flexible` library
- Key by: IP address + User ID (if authenticated)
- Return HTTP 429 (Too Many Requests)

**WebSocket Rate Limiting:**
- Max 10 concurrent connections per session ID
- Kick oldest connection if limit exceeded
- Show "Too many viewers" message on map page

---

### Additional Security Measures

**1. HTTPS Only:**
- All traffic encrypted (frontend, backend, WebSocket)
- Reject HTTP connections

**2. CORS Configuration:**
- Allow only `maps.whisppr.app` origin
- Block requests from other domains

**3. Input Validation:**
- Validate lat/lng ranges (-90 to 90, -180 to 180)
- Sanitize user names (prevent XSS)
- Validate session ID format (reject SQL injection attempts)

**4. WebSocket Security:**
- Validate session ID before joining room
- Disconnect inactive connections after 5 min
- Rate limit messages per connection

**5. Abuse Prevention (Future):**
- Flag sessions with >50 location updates/min (anomaly)
- Block IPs with >10 failed session lookups
- Require CAPTCHA for repeated SOS creation

---

## Data Privacy & Compliance

### GDPR Compliance (Future)

**User Rights:**
- Right to access: User can download all their SOS history
- Right to deletion: User can delete all data on demand
- Right to portability: Export data in JSON format

**Data Retention:**
- Active sessions: Up to 4 hours
- Expired sessions: 30 days (for support/debugging)
- Location data: 7 days (aggregate stats only after)
- User data: Until account deletion

**Consent:**
- Mobile app shows consent dialog on first SOS
- "By using SOS, you agree to share your location with emergency contacts"
- User can revoke consent (disables SOS feature)

### Data Minimization

**What We Store:**
- User ID, name, phone number
- SOS session metadata (start/end time, status)
- Location coordinates + accuracy
- Emergency contacts list

**What We DON'T Store:**
- Full device info (only OS: iOS/Android)
- IP addresses (beyond rate limiting)
- Browser fingerprints
- Analytics/tracking cookies on map page

---

## Technical Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| WebSocket server crashes | High | Medium | Auto-restart, health checks, redundant servers |
| Database write latency | Medium | Low | Use Redis for real-time, batch DB writes |
| WhatsApp API rate limit | High | Low | Queue messages, retry with backoff, monitor quota |
| Mobile app killed by OS | High | High | Use background location API, show persistent notification |
| Map page slow on 3G | Medium | High | Optimize bundle size, lazy load map libraries |
| Session ID collision | High | Very Low | 128-bit random IDs, collision detection on create |

---

## Success Metrics (MVP)

**Primary KPIs:**
- Time from SOS trigger to first WhatsApp message sent: **<5 seconds**
- Time from location update to map marker move: **<2 seconds**
- Uptime of WebSocket server: **>99%**
- % of SOS sessions with >0 viewers: **>80%**

**Secondary Metrics:**
- Average SOS duration: ~15 minutes (expected)
- Average # of viewers per session: 2-3
- Map page load time: <3 seconds
- % of users who cancel SOS within 5 min: ~30% (false alarms)

---

## Development Roadmap

### Week 1: Backend Foundation
- [ ] Database schema (sessions, locations, users)
- [ ] POST /sos/create endpoint
- [ ] POST /sos/{id}/location endpoint
- [ ] GET /sos/{id} endpoint
- [ ] Session expiry cron job
- [ ] Basic tests

### Week 2: WebSocket + Live Updates
- [ ] WebSocket server setup
- [ ] Room management (session-based)
- [ ] Location broadcast logic
- [ ] Redis integration (pub/sub)
- [ ] Connection handling

### Week 3: Map Frontend
- [ ] Next.js project setup
- [ ] Map page UI (Mapbox/Google Maps)
- [ ] WebSocket client integration
- [ ] Real-time marker updates
- [ ] Action buttons (call, navigate)
- [ ] Mobile responsive design

### Week 4: WhatsApp Integration
- [ ] WhatsApp Cloud API setup
- [ ] Send location pin message
- [ ] Send alert text with map link
- [ ] Test with real phone numbers
- [ ] Handle send failures

### Week 5: Polish + Testing
- [ ] Error handling (all edge cases)
- [ ] Loading states
- [ ] Offline mode UI
- [ ] E2E tests (Playwright)
- [ ] Performance optimization
- [ ] Deploy to production

---

## ✅ Alignment Checklist

Use this checklist to confirm we're aligned before moving to implementation:

- [ ] **I have a clear step-by-step SOS → Live Map user flow**
  - User taps SOS → Backend creates session → WhatsApp sent → Contact opens link → Live map shows location

- [ ] **I understand each core component and its responsibility**
  - SOS Session Manager: Creates/manages sessions
  - Location Update Handler: Receives updates, stores, broadcasts
  - WebSocket Broadcaster: Pushes updates to map viewers
  - WhatsApp Integration: Sends alerts with map link
  - Map Page Client: Displays live location with WebSocket

- [ ] **I know what is in MVP vs future phases**
  - MVP: Basic live tracking, WhatsApp alerts, 4-hour sessions
  - Future: Audio/video, contact coordination, enterprise features

- [ ] **I know the key privacy/security constraints for Whisppr Maps**
  - Non-guessable session IDs (128-bit random)
  - Auto-expire after 4 hours
  - No PII in URLs
  - Rate limiting on all endpoints
  - HTTPS only, CORS restricted

- [ ] **I understand performance requirements**
  - 10-15s location update interval
  - <2s latency for map updates
  - Handle offline scenarios gracefully
  - Scale to 100 concurrent sessions (MVP)

- [ ] **I can explain the tech stack**
  - Backend: Node.js + Express + WebSocket + Redis + PostgreSQL
  - Frontend: Next.js + React + Mapbox/Google Maps
  - Messaging: WhatsApp Cloud API

---

## Next Steps

Once this architecture is approved, we'll proceed to:

1. **PROMPT 2**: Database schema design + API endpoint specifications
2. **PROMPT 3**: WebSocket protocol definition + message formats
3. **PROMPT 4**: Frontend component structure + state management
4. **PROMPT 5**: Implementation (start with backend MVP)

**Question for you:**
- Any changes to the architecture or MVP scope?
- Preferred map provider: Mapbox GL JS or Google Maps?
- Any compliance requirements (HIPAA, etc.)?
- Target launch date for MVP?

---

*Document Version: 1.0*  
*Last Updated: November 27, 2025*  
*Author: Whisppr Technical Architect*
