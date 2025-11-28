# Whisppr Live SOS Maps - API & WebSocket Specification

## Overview

This document defines the complete HTTP API and WebSocket protocol for Whisppr Live SOS Maps.

**Tech Stack:**
- **HTTP Framework:** Express.js
- **WebSocket Library:** Socket.IO (for built-in room management, reconnection, and fallback support)
- **Database:** PostgreSQL via Prisma
- **Auth:** API key for write operations, unguessable short IDs for read operations

---

## HTTP API Endpoints

### Base URL
- **Development:** `http://localhost:3000/api`
- **Production:** `https://api.whisppr.com/api`

### Authentication

**Write Operations (Create/Update):**
- Header: `X-API-Key: <WHISPPR_API_KEY>`
- Used for: `POST /api/sos`, `POST /api/sos/:shortId/location`
- MVP: Single shared secret between mobile app and backend

**Read Operations:**
- No authentication required
- Security via unguessable `shortId` (128 bits entropy) + expiry

---

## Endpoints

### 1. Create SOS Session

**Endpoint:** `POST /api/sos`

**Purpose:** Triggered by mobile app when user initiates SOS. Creates session, sends alerts, returns map URL.

**Headers:**
```http
Content-Type: application/json
X-API-Key: demo-secret-key
```

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "phoneNumber": "+17135848950",
  "name": "John Doe",
  "lat": 40.7128,
  "lng": -74.0060,
  "accuracy": 12.5,
  "platform": "ios",
  "deviceInfo": "iPhone 15 Pro, iOS 17.2",
  "batteryLevel": 85,
  "channel": "whatsapp",
  "emergencyContacts": [
    "+12067868897",
    "+13105551234"
  ]
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "sosId": "16f5bd85-d41f-458b-a0c1-9c5e18929dba",
    "shortId": "5BOS750Z2",
    "mapUrl": "https://maps.whisppr.com/sos/5BOS750Z2",
    "status": "active",
    "expiresAt": "2025-11-27T18:45:58.830Z",
    "alertsSent": {
      "whatsapp": 2,
      "failed": 0
    }
  }
}
```

**Error Responses:**

`401 Unauthorized` - Missing or invalid API key
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Valid API key required"
}
```

`400 Bad Request` - Missing required fields
```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Missing required fields: lat, lng, phoneNumber"
}
```

`429 Too Many Requests` - Rate limit exceeded
```json
{
  "success": false,
  "error": "RateLimitExceeded",
  "message": "Maximum 5 SOS sessions per user per hour",
  "retryAfter": 1800
}
```

---

### 2. Update Location

**Endpoint:** `POST /api/sos/:shortId/location`

**Purpose:** Called by mobile app every 10-15 seconds with new GPS position.

**Headers:**
```http
Content-Type: application/json
X-API-Key: demo-secret-key
```

**URL Parameters:**
- `shortId` - Session short ID (e.g., `5BOS750Z2`)

**Request Body:**
```json
{
  "lat": 40.7135,
  "lng": -74.0068,
  "accuracy": 8.2,
  "altitude": 10.5,
  "speed": 2.5,
  "heading": 45,
  "batteryLevel": 84,
  "isMoving": true,
  "timestamp": "2025-11-27T14:45:59.935Z"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "updated": true,
    "watchersNotified": 3
  }
}
```

**Error Responses:**

`404 Not Found` - Session doesn't exist
```json
{
  "success": false,
  "error": "SessionNotFound",
  "message": "SOS session not found"
}
```

`410 Gone` - Session expired
```json
{
  "success": false,
  "error": "SessionExpired",
  "message": "SOS session has expired",
  "expiredAt": "2025-11-27T18:45:58.830Z"
}
```

`403 Forbidden` - Session not active
```json
{
  "success": false,
  "error": "SessionInactive",
  "message": "SOS session is resolved/cancelled",
  "status": "resolved"
}
```

---

### 3. Get Session Data

**Endpoint:** `GET /api/sos/:shortId`

**Purpose:** Load session data for map page. Returns current location + recent breadcrumbs.

**No Authentication Required** (security via unguessable shortId)

**URL Parameters:**
- `shortId` - Session short ID (e.g., `5BOS750Z2`)

**Query Parameters:**
- `locationLimit` - Max breadcrumb locations to return (default: 100, max: 500)

**Request:**
```http
GET /api/sos/5BOS750Z2?locationLimit=50
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "session": {
      "sosId": "16f5bd85-d41f-458b-a0c1-9c5e18929dba",
      "shortId": "5BOS750Z2",
      "status": "active",
      "userName": "John Doe",
      "phoneNumber": "+17135848950",
      "platform": "ios",
      "deviceInfo": "iPhone 15 Pro, iOS 17.2",
      "createdAt": "2025-11-27T14:45:58.830Z",
      "updatedAt": "2025-11-27T14:46:20.150Z",
      "expiresAt": "2025-11-27T18:45:58.830Z",
      "resolvedAt": null,
      "isExpired": false,
      "durationMinutes": 0
    },
    "currentLocation": {
      "lat": 40.7135,
      "lng": -74.0068,
      "accuracy": 8.2,
      "timestamp": "2025-11-27T14:46:20.150Z",
      "batteryLevel": 84,
      "isMoving": true
    },
    "recentLocations": [
      {
        "lat": 40.7135,
        "lng": -74.0068,
        "timestamp": "2025-11-27T14:46:20.150Z",
        "accuracy": 8.2,
        "batteryLevel": 84,
        "speed": 2.5,
        "heading": 45
      },
      {
        "lat": 40.7133,
        "lng": -74.0065,
        "timestamp": "2025-11-27T14:46:05.120Z",
        "accuracy": 8.5,
        "batteryLevel": 85,
        "speed": 3.1,
        "heading": 42
      }
      // ... more breadcrumbs (up to locationLimit)
    ],
    "statistics": {
      "totalLocations": 47,
      "distanceTraveled": 245.5,
      "averageSpeed": 2.8,
      "lastUpdateSeconds": 5
    }
  }
}
```

**Response (Expired Session):** `200 OK`
```json
{
  "success": true,
  "data": {
    "session": {
      "sosId": "16f5bd85-d41f-458b-a0c1-9c5e18929dba",
      "shortId": "5BOS750Z2",
      "status": "expired",
      "userName": "John Doe",
      "isExpired": true,
      "expiresAt": "2025-11-27T18:45:58.830Z"
    },
    "currentLocation": {
      "lat": 40.7142,
      "lng": -74.0075,
      "timestamp": "2025-11-27T18:45:58.830Z"
    },
    "recentLocations": [],
    "message": "This SOS session has expired"
  }
}
```

**Error Responses:**

`404 Not Found` - Session doesn't exist
```json
{
  "success": false,
  "error": "SessionNotFound",
  "message": "SOS session not found"
}
```

---

### 4. Resolve/Cancel Session

**Endpoint:** `PUT /api/sos/:shortId/status`

**Purpose:** Mark SOS as resolved (user safe) or cancelled.

**Headers:**
```http
Content-Type: application/json
X-API-Key: demo-secret-key
```

**Request Body:**
```json
{
  "status": "resolved"
}
```

**Valid Status Values:**
- `resolved` - User confirmed safe
- `cancelled` - User cancelled SOS

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "sosId": "16f5bd85-d41f-458b-a0c1-9c5e18929dba",
    "shortId": "5BOS750Z2",
    "status": "resolved",
    "resolvedAt": "2025-11-27T15:30:42.100Z"
  }
}
```

---

### 5. Health Check

**Endpoint:** `GET /api/health`

**Purpose:** Monitor backend and database status.

**No Authentication Required**

**Response:** `200 OK`
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-11-27T14:45:58.830Z",
  "services": {
    "database": "connected",
    "websocket": "active",
    "redis": "connected"
  },
  "stats": {
    "activeSessions": 47,
    "connectedClients": 152
  }
}
```

---

## WebSocket Protocol

### Connection URL

**Development:** `ws://localhost:3000`  
**Production:** `wss://api.whisppr.com`

**Library:** Socket.IO (provides automatic reconnection, fallback, and room management)

### Connection Flow

```javascript
// Client-side connection
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});
```

---

### Message Types

### 1. Subscribe to Session

**Direction:** Client → Server

**Message:**
```json
{
  "type": "subscribe",
  "shortId": "5BOS750Z2"
}
```

**Server Response:** `subscribed`
```json
{
  "type": "subscribed",
  "shortId": "5BOS750Z2",
  "status": "active",
  "currentLocation": {
    "lat": 40.7135,
    "lng": -74.0068,
    "timestamp": "2025-11-27T14:46:20.150Z"
  },
  "expiresAt": "2025-11-27T18:45:58.830Z",
  "watcherCount": 3
}
```

**Server Error Response:** `subscribe_error`
```json
{
  "type": "subscribe_error",
  "shortId": "5BOS750Z2",
  "error": "SessionNotFound",
  "message": "SOS session not found or expired"
}
```

---

### 2. Unsubscribe from Session

**Direction:** Client → Server

**Message:**
```json
{
  "type": "unsubscribe",
  "shortId": "5BOS750Z2"
}
```

**Server Response:** `unsubscribed`
```json
{
  "type": "unsubscribed",
  "shortId": "5BOS750Z2"
}
```

---

### 3. Location Update (Broadcast)

**Direction:** Server → All Subscribed Clients

**Triggered:** When `POST /api/sos/:shortId/location` is called

**Message:**
```json
{
  "type": "location_update",
  "shortId": "5BOS750Z2",
  "location": {
    "lat": 40.7135,
    "lng": -74.0068,
    "accuracy": 8.2,
    "altitude": 10.5,
    "speed": 2.5,
    "heading": 45,
    "batteryLevel": 84,
    "isMoving": true,
    "timestamp": "2025-11-27T14:46:20.150Z"
  },
  "session": {
    "status": "active",
    "updatedAt": "2025-11-27T14:46:20.150Z",
    "durationMinutes": 15
  }
}
```

---

### 4. Session Status Change (Broadcast)

**Direction:** Server → All Subscribed Clients

**Triggered:** When session is resolved, cancelled, or expired

**Message:**
```json
{
  "type": "session_status",
  "shortId": "5BOS750Z2",
  "status": "resolved",
  "resolvedAt": "2025-11-27T15:30:42.100Z",
  "message": "SOS has been resolved - user is safe"
}
```

**Status Values:**
- `resolved` - User confirmed safe
- `cancelled` - User cancelled
- `expired` - Session auto-expired

---

### 5. Heartbeat/Ping

**Direction:** Bidirectional (Client ↔ Server)

**Purpose:** Keep connection alive, detect network issues

**Client → Server:**
```json
{
  "type": "ping",
  "timestamp": "2025-11-27T14:46:20.150Z"
}
```

**Server → Client:**
```json
{
  "type": "pong",
  "timestamp": "2025-11-27T14:46:20.151Z",
  "serverTime": "2025-11-27T14:46:20.151Z"
}
```

**Auto-sent by Socket.IO** every 25 seconds (configurable)

---

### 6. Watcher Count Update

**Direction:** Server → All Subscribed Clients

**Triggered:** When someone joins/leaves the session

**Message:**
```json
{
  "type": "watcher_count",
  "shortId": "5BOS750Z2",
  "count": 5,
  "change": 1
}
```

---

### 7. Error Events

**Direction:** Server → Client

**Message:**
```json
{
  "type": "error",
  "code": "SessionExpired",
  "message": "This SOS session has expired",
  "shortId": "5BOS750Z2"
}
```

**Error Codes:**
- `SessionNotFound` - Invalid shortId
- `SessionExpired` - Session past expiry time
- `SessionInactive` - Session resolved/cancelled
- `InvalidMessage` - Malformed WebSocket message
- `RateLimitExceeded` - Too many messages

---

## Integration Flow

### Flow 1: SOS Creation & Initial Alert

```
Mobile App                Backend API              Database           WhatsApp API
    |                         |                        |                    |
    |--POST /api/sos--------->|                        |                    |
    |  (GPS, user info)       |                        |                    |
    |                         |--Create user---------->|                    |
    |                         |<--(user ID)------------|                    |
    |                         |--Create session------->|                    |
    |                         |<--(session + shortId)--|                    |
    |                         |--Send WhatsApp alert----------------------->|
    |                         |                        |                    |
    |<-201 Created------------|                        |                    |
    |  (shortId, mapUrl)      |                        |                    |
    |                         |                        |                    |
    
Emergency contacts receive:
"🚨 EMERGENCY ALERT
John Doe needs help!
Platform: iOS
Time: 2:45 PM
Live location: https://maps.whisppr.com/sos/5BOS750Z2"
```

---

### Flow 2: Location Update & Live Broadcasting

```
Mobile App          Backend API          Database          WebSocket Server    Map Viewers
    |                    |                   |                    |                 |
    |--POST location---->|                   |                    |                 |
    |  (every 10-15s)    |                   |                    |                 |
    |                    |--Validate-------->|                    |                 |
    |                    |  (active? not     |                    |                 |
    |                    |   expired?)       |                    |                 |
    |                    |<-✅ Valid---------|                    |                 |
    |                    |                   |                    |                 |
    |                    |--Update lastLat-->|                    |                 |
    |                    |  lastLng          |                    |                 |
    |                    |                   |                    |                 |
    |                    |--Insert location->|                    |                 |
    |                    |  (breadcrumb)     |                    |                 |
    |                    |                   |                    |                 |
    |<-200 OK------------|                   |                    |                 |
    |                    |                   |                    |                 |
    |                    |--Broadcast "location_update"---------->|                 |
    |                    |  to room:5BOS750Z2                     |                 |
    |                    |                                        |--Push to all--->|
    |                    |                                        |   subscribers   |
    |                    |                                        |                 |
    |                    |                                        |  Map updates marker
```

---

### Flow 3: Map Page Load & Real-Time Subscription

```
Map Viewer         Backend API         Database        WebSocket Server
    |                   |                  |                   |
    |--GET /api/sos---->|                  |                   |
    |  /5BOS750Z2       |                  |                   |
    |                   |--Query session-->|                   |
    |                   |  by shortId      |                   |
    |                   |<-(session data)--|                   |
    |                   |                  |                   |
    |                   |--Get locations-->|                   |
    |                   |  (last 100)      |                   |
    |                   |<-(breadcrumbs)---|                   |
    |                   |                  |                   |
    |<-200 OK-----------|                  |                   |
    |  (session +       |                  |                   |
    |   breadcrumbs)    |                  |                   |
    |                   |                  |                   |
    | Render map with current location & trail                 |
    |                   |                  |                   |
    |--WS Connect-------------------------------------->|       |
    |                   |                  |           |       |
    |--subscribe---------------------------------------->|      |
    |  {shortId:5BOS750Z2}                 |           |       |
    |                   |                  |           |       |
    |                   |                  |      Join room    |
    |                   |                  |      "5BOS750Z2"  |
    |                   |                  |           |       |
    |<-subscribed---------------------------------------|       |
    |  (current location, watcher count)   |           |       |
    |                   |                  |           |       |
    | Now receiving live location_update messages              |
```

---

### Flow 4: Session Expiry Handling

```
Background Job      Database         WebSocket Server      Map Viewers
    |                   |                   |                   |
    |--Find expired---->|                   |                   |
    |  sessions (every  |                   |                   |
    |  5 minutes)       |                   |                   |
    |<-[expired IDs]----|                   |                   |
    |                   |                   |                   |
    |--Update status--->|                   |                   |
    |  to "expired"     |                   |                   |
    |                   |                   |                   |
    |--Broadcast "session_status"---------->|                   |
    |  {status: "expired"}                  |                   |
    |                                       |--Push to room---->|
    |                                       |   subscribers     |
    |                                       |                   |
    |                                       |  Map shows "SOS Expired"
    |                                       |  message, stops updates
```

---

## Database + WebSocket Integration

### Core Integration Points

#### 1. Location Update Handler

```javascript
// routes/sos.js
router.post('/sos/:shortId/location', authenticateAPI, async (req, res) => {
  const { shortId } = req.params;
  const { lat, lng, accuracy, batteryLevel, timestamp } = req.body;
  
  // 1. Validate session
  const session = await sosService.getSessionByShortId(shortId);
  if (!session) {
    return res.status(404).json({ 
      success: false, 
      error: 'SessionNotFound' 
    });
  }
  
  // 2. Check if expired
  if (new Date() > session.expiresAt || session.status !== 'active') {
    return res.status(410).json({ 
      success: false, 
      error: 'SessionExpired',
      expiredAt: session.expiresAt 
    });
  }
  
  // 3. Update database (last_lat + insert location)
  await sosService.updateLocation({
    sessionId: session.id,
    lat, lng, accuracy, batteryLevel,
    timestamp: new Date(timestamp)
  });
  
  // 4. Broadcast to WebSocket room
  const io = req.app.get('io');
  const watcherCount = io.sockets.adapter.rooms.get(shortId)?.size || 0;
  
  io.to(shortId).emit('location_update', {
    type: 'location_update',
    shortId,
    location: { lat, lng, accuracy, batteryLevel, timestamp },
    session: {
      status: session.status,
      updatedAt: new Date(),
      durationMinutes: Math.round((new Date() - session.createdAt) / 60000)
    }
  });
  
  // 5. Respond to mobile app
  res.json({ 
    success: true, 
    data: { 
      updated: true, 
      watchersNotified: watcherCount 
    } 
  });
});
```

#### 2. WebSocket Subscribe Handler

```javascript
// websocket/handler.js
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('subscribe', async ({ shortId }) => {
    try {
      // Validate session exists and is active
      const session = await sosService.getSessionByShortId(shortId);
      
      if (!session) {
        socket.emit('subscribe_error', {
          type: 'subscribe_error',
          shortId,
          error: 'SessionNotFound'
        });
        return;
      }
      
      if (session.status === 'expired' || new Date() > session.expiresAt) {
        socket.emit('subscribe_error', {
          type: 'subscribe_error',
          shortId,
          error: 'SessionExpired'
        });
        return;
      }
      
      // Join Socket.IO room for this shortId
      socket.join(shortId);
      
      // Track viewer (optional for future "who's watching" feature)
      await trackViewer(session.id, socket.id);
      
      // Send confirmation with current state
      const watcherCount = io.sockets.adapter.rooms.get(shortId)?.size || 0;
      
      socket.emit('subscribed', {
        type: 'subscribed',
        shortId,
        status: session.status,
        currentLocation: {
          lat: session.lastLat,
          lng: session.lastLng,
          timestamp: session.updatedAt
        },
        expiresAt: session.expiresAt,
        watcherCount
      });
      
      // Notify others of new watcher
      socket.to(shortId).emit('watcher_count', {
        type: 'watcher_count',
        shortId,
        count: watcherCount,
        change: 1
      });
      
    } catch (error) {
      console.error('Subscribe error:', error);
      socket.emit('subscribe_error', {
        type: 'subscribe_error',
        error: 'InternalError'
      });
    }
  });
  
  socket.on('unsubscribe', ({ shortId }) => {
    socket.leave(shortId);
    
    const watcherCount = io.sockets.adapter.rooms.get(shortId)?.size || 0;
    socket.to(shortId).emit('watcher_count', {
      type: 'watcher_count',
      shortId,
      count: watcherCount,
      change: -1
    });
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Socket.IO automatically removes from rooms on disconnect
  });
});
```

#### 3. Expiry Background Job

```javascript
// jobs/expire-sessions.js
const cron = require('node-cron');
const sosService = require('../db/sosService');

function startExpiryJob(io) {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('Running session expiry check...');
    
    try {
      // Find and expire old sessions
      const expiredCount = await sosService.expireOldSessions();
      
      if (expiredCount > 0) {
        console.log(`Expired ${expiredCount} sessions`);
        
        // Get list of expired sessions to notify watchers
        const expiredSessions = await sosService.getRecentlyExpired();
        
        for (const session of expiredSessions) {
          // Broadcast expiry to all watchers
          io.to(session.shortId).emit('session_status', {
            type: 'session_status',
            shortId: session.shortId,
            status: 'expired',
            message: 'This SOS session has expired after 4 hours',
            expiredAt: session.expiresAt
          });
          
          // Close all connections to this room (optional)
          const sockets = await io.in(session.shortId).fetchSockets();
          sockets.forEach(socket => socket.leave(session.shortId));
        }
      }
    } catch (error) {
      console.error('Expiry job error:', error);
    }
  });
}

module.exports = { startExpiryJob };
```

---

## Authentication & Security

### Write Operations (API Key)

**Environment Variable:**
```env
WHISPPR_API_KEY=your-secure-random-key-here-min-32-chars
```

**Middleware:**
```javascript
// middleware/auth.js
function authenticateAPI(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== process.env.WHISPPR_API_KEY) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Valid API key required'
    });
  }
  
  next();
}
```

**Protected Routes:**
- `POST /api/sos`
- `POST /api/sos/:shortId/location`
- `PUT /api/sos/:shortId/status`

### Read Operations (Unguessable Short IDs)

**Security Model:**
- No authentication required for `GET /api/sos/:shortId`
- Security relies on:
  1. **128-bit entropy** in short ID (9 alphanumeric chars = ~47 bits, upgrade to 12 chars = 62 bits)
  2. **Time-limited access** (4-hour expiry)
  3. **No PII in URLs** (shortId is random, not phone/name)

**Short ID Generation:**
```javascript
// Current: 9 chars = 47 bits entropy
function generateShortId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const bytes = crypto.randomBytes(12); // Use 12 for better entropy
  
  for (let i = 0; i < 12; i++) {
    result += chars[bytes[i] % chars.length];
  }
  
  return result; // e.g., "ABC123XYZ4KL"
}
```

### Rate Limiting

**Per-User SOS Creation:**
```javascript
// middleware/rateLimit.js
const rateLimit = require('express-rate-limit');

const sosCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 SOS per hour per IP
  keyGenerator: (req) => req.body.phoneNumber, // Rate limit by phone
  message: {
    success: false,
    error: 'RateLimitExceeded',
    message: 'Maximum 5 SOS sessions per user per hour'
  }
});

router.post('/api/sos', sosCreationLimiter, authenticateAPI, createSOS);
```

**Per-Session Location Updates:**
```javascript
const locationUpdateLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 2, // Max 2 updates per second
  keyGenerator: (req) => req.params.shortId,
  skipSuccessfulRequests: false
});

router.post('/api/sos/:shortId/location', locationUpdateLimiter, authenticateAPI, updateLocation);
```

**WebSocket Connection Limit:**
```javascript
// In Socket.IO setup
io.use((socket, next) => {
  // Limit connections per IP
  const ip = socket.handshake.address;
  const connections = Array.from(io.sockets.sockets.values())
    .filter(s => s.handshake.address === ip);
  
  if (connections.length > 10) {
    return next(new Error('Too many connections from this IP'));
  }
  
  next();
});
```

### Abuse Prevention

**1. Duplicate Session Prevention:**
```javascript
// Check if user already has active session
const existingSessions = await sosService.getUserActiveSessions(userId);
if (existingSessions.length > 0) {
  return res.status(400).json({
    success: false,
    error: 'ActiveSessionExists',
    message: 'You already have an active SOS session',
    existingSession: existingSessions[0].shortId
  });
}
```

**2. Location Update Validation:**
```javascript
// Reject impossible location jumps (>500 km/h)
const lastLocation = await sosService.getLastLocation(sessionId);
const distance = calculateDistance(lastLocation, newLocation);
const timeDiff = (newTimestamp - lastLocation.timestamp) / 1000; // seconds
const speed = distance / timeDiff; // m/s

if (speed > 138.9) { // 500 km/h
  console.warn('Suspicious location jump detected:', {
    sessionId, speed, distance, timeDiff
  });
  // Still accept but flag for review
}
```

**3. Expiry Enforcement:**
- Background job expires sessions every 5 minutes
- All API endpoints check `expiresAt` before processing
- WebSocket emits expiry event to all watchers

---

## Checklist for Implementation

### ✅ I know all API endpoints I need for SOS + tracking

- ✅ **POST /api/sos** - Create session + send alerts
- ✅ **POST /api/sos/:shortId/location** - Update location + broadcast
- ✅ **GET /api/sos/:shortId** - Load session data for map
- ✅ **PUT /api/sos/:shortId/status** - Resolve/cancel session
- ✅ **GET /api/health** - Health check

### ✅ I understand how the WebSocket channel per shortId works

- ✅ Socket.IO rooms used for per-session channels
- ✅ Clients join room via `socket.join(shortId)`
- ✅ Broadcasts go to all clients in room: `io.to(shortId).emit(...)`
- ✅ Automatic cleanup on disconnect

### ✅ I know how updates go: app → backend → DB + WebSocket → map

1. **Mobile app** sends location via `POST /api/sos/:shortId/location`
2. **Backend API** validates session (active, not expired)
3. **Database** updates `last_lat`/`last_lng` + inserts location history
4. **WebSocket** broadcasts to room `shortId` with `location_update` event
5. **Map viewers** receive real-time update, move marker + extend breadcrumb

### ✅ I have a basic plan for expiry + simple auth

**Expiry:**
- Sessions auto-expire after 4 hours (`expires_at` timestamp)
- Background job runs every 5 minutes to mark expired sessions
- API endpoints check expiry before processing
- WebSocket broadcasts `session_status` expiry event

**Auth:**
- **Write ops:** API key in `X-API-Key` header (shared secret)
- **Read ops:** No auth, security via unguessable 12-char shortId (62 bits entropy)
- **Rate limiting:** 5 SOS/hour per user, 2 location updates/second per session
- **Abuse prevention:** Duplicate session check, impossible speed detection

---

## Next Steps

1. **Implement Express API** with these endpoints
2. **Set up Socket.IO WebSocket server** with room management
3. **Integrate with existing DB service** (`sosService.js`)
4. **Add background jobs** for expiry + cleanup
5. **Test end-to-end flow** with mobile app + map page

Ready to build this! 🚀
