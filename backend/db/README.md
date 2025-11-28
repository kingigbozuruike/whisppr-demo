# Whisppr Live SOS Maps - Database Setup

## Overview

This directory contains the Prisma-based database setup for Whisppr Live SOS Maps, including schema definitions, migrations, and service functions.

## Database Schema

### Tables

1. **`users`** - User accounts (phone number based)
2. **`sos_sessions`** - Active/historical SOS incidents
3. **`sos_locations`** - Location breadcrumb history
4. **`sos_media`** - Audio/video/photo uploads (future)
5. **`sos_viewers`** - Track who is watching (future)

See [DATABASE_SCHEMA.md](../maps/DATABASE_SCHEMA.md) for full schema documentation.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This installs:
- `prisma` - Prisma CLI for migrations
- `@prisma/client` - Prisma Client for database queries

### 2. Start Prisma Postgres (Development)

```bash
npx prisma dev
```

This starts a local PostgreSQL database on ports 51213-51215. Keep this running during development.

### 3. Run Migrations

```bash
npx prisma migrate dev
```

This applies all migrations and generates Prisma Client.

### 4. Test Database

```bash
node test-db.js
```

Expected output:
```
🧪 Testing Whisppr SOS Database...

1️⃣  Creating test user...
✅ User created: <uuid> - John Doe

2️⃣  Creating SOS session...
✅ Session created: ABC123XYZ
   URL: https://maps.whisppr.com/sos/ABC123XYZ
   
... (more test steps)

✅ All tests passed! Database is working correctly.
```

## Database Service API

### Import

```javascript
const sosService = require('./db/sosService');
```

### User Operations

#### Create/Get User
```javascript
const user = await sosService.getOrCreateUser('+17135848950', 'John Doe');
// Returns: { id, phoneNumber, displayName, createdAt, updatedAt }
```

### Session Operations

#### Create SOS Session
```javascript
const session = await sosService.createSosSession({
  userId: user.id,
  lat: 40.7128,
  lng: -74.0060,
  platform: 'ios',
  deviceInfo: 'iPhone 15 Pro, iOS 17.2',
  expiryHours: 4 // Optional, default: 4
});
// Returns: { id, shortId, status, initialLat, initialLng, ... }
```

#### Get Session by Short ID
```javascript
const session = await sosService.getSessionByShortId('ABC123XYZ');
// Returns: { id, shortId, status, lastLat, lastLng, user: {...}, ... }
```

#### Resolve Session
```javascript
await sosService.resolveSession(sessionId);
// Marks session as 'resolved', sets resolvedAt timestamp
```

#### Cancel Session
```javascript
await sosService.cancelSession(sessionId);
// Marks session as 'cancelled'
```

#### Expire Old Sessions (Background Job)
```javascript
const expiredCount = await sosService.expireOldSessions();
// Returns: Number of sessions expired
```

### Location Operations

#### Update Location
```javascript
await sosService.updateLocation({
  sessionId: session.id,
  lat: 40.7130,
  lng: -74.0062,
  accuracy: 8.5,        // meters
  altitude: 10.2,       // meters
  speed: 2.5,           // m/s
  heading: 45,          // degrees (0-360)
  batteryLevel: 85,     // 0-100
  isMoving: true
});
```

#### Get Location History
```javascript
const history = await sosService.getLocationHistory(sessionId, 100);
// Returns: Array of { lat, lng, timestamp, accuracy, batteryLevel, ... }
```

### Statistics

#### Get Session Stats
```javascript
const stats = await sosService.getSessionStats(sessionId);
// Returns: { session, locationCount, firstLocation, lastLocation, durationMinutes }
```

## Database URLs

### Development (Prisma Postgres)
```
prisma+postgres://localhost:51213/?api_key=...
```

Automatically managed by `npx prisma dev`.

### Production (Options)

**Option 1: Railway PostgreSQL**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project + provision Postgres
railway init
railway add postgresql

# Get connection string
railway variables
```

**Option 2: Supabase**
```bash
# Create project at https://supabase.com
# Go to Settings > Database > Connection String
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
```

**Option 3: Neon**
```bash
# Create project at https://neon.tech
DATABASE_URL="postgresql://[USER]:[PASSWORD]@[HOST]/[DATABASE]?sslmode=require"
```

Update `.env`:
```env
DATABASE_URL="your-production-database-url"
```

Then run migrations:
```bash
npx prisma migrate deploy
```

## Performance Notes

### Indexes

Critical indexes for fast queries:

1. **`sos_sessions.short_id`** (UNIQUE) - Map page loads
2. **`(sos_locations.sos_session_id, timestamp DESC)`** - Breadcrumb queries
3. **`sos_sessions.expires_at`** - Background cleanup

### Query Patterns

**Fast Map Load:**
```javascript
// Single query, no JOIN - uses indexed short_id
const session = await sosService.getSessionByShortId('ABC123XYZ');
// Returns session with last_lat/last_lng immediately
```

**Efficient Location Updates:**
```javascript
// 1 UPDATE + 1 INSERT per location update
await sosService.updateLocation({ sessionId, lat, lng, ... });
// Updates last_lat/last_lng for fast reads
// Inserts into sos_locations for history
```

**Fast Breadcrumb Retrieval:**
```javascript
// Uses composite index for instant lookup
const history = await sosService.getLocationHistory(sessionId, 100);
// <5ms even with 1000+ locations
```

## Background Jobs

### 1. Expire Old Sessions

Run every 5 minutes:

```javascript
// cron-jobs/expire-sessions.js
const sosService = require('./db/sosService');

async function expireOldSessions() {
  const count = await sosService.expireOldSessions();
  console.log(`Expired ${count} sessions`);
}

// Run with node-cron
const cron = require('node-cron');
cron.schedule('*/5 * * * *', expireOldSessions);
```

### 2. Archive Old Data

Run daily:

```javascript
// Archive sessions older than 30 days
const oldSessions = await prisma.sosSession.findMany({
  where: {
    status: { in: ['resolved', 'expired', 'cancelled'] },
    updatedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
  }
});

// Archive to S3, then delete
for (const session of oldSessions) {
  await archiveToS3(session);
  await prisma.sosSession.delete({ where: { id: session.id } });
}
```

## Troubleshooting

### Prisma Dev Server Won't Start

```bash
# Check if port is in use
lsof -i :51213

# Kill existing process
kill -9 <PID>

# Restart
npx prisma dev
```

### Migration Failed

```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Or manually fix and re-run
npx prisma migrate dev
```

### Connection Issues

```bash
# Verify DATABASE_URL is set
echo $DATABASE_URL

# Test connection
npx prisma db pull
```

### Prisma Client Out of Sync

```bash
# Regenerate client
npx prisma generate
```

## File Structure

```
backend/
├── db/
│   ├── prisma.js           # Prisma Client singleton
│   └── sosService.js       # Database service functions
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── migrations/         # Migration history
│   └── prisma.config.ts    # Prisma config (loads .env)
├── test-db.js              # Database test script
└── .env                    # Environment variables
```

## Next Steps

1. ✅ Database schema designed and migrated
2. ✅ Service functions created and tested
3. 🔄 **Next:** Integrate with Express API endpoints
4. 🔄 **Next:** Add WebSocket server for live updates
5. 🔄 **Next:** Build Next.js map frontend

## Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Database Schema Design](../maps/DATABASE_SCHEMA.md)
- [Architecture Overview](../maps/ARCHITECTURE.md)
