# Whisppr Live SOS Maps - Database Schema

## Overview

This document defines the relational database schema for Whisppr Live SOS Maps. The design prioritizes:
- **Fast reads** for real-time map display
- **Efficient writes** for frequent location updates (10-15s intervals)
- **Future extensibility** for audio, video, and notes

**Target DB:** PostgreSQL (recommended) or MySQL  
**ORM-Agnostic:** Tables defined in SQL DDL, with Prisma examples provided

---

## Table Definitions

### 1. `users`

Minimal user table. Expand later as needed.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone_number);
```

**Fields:**
- `id`: UUID primary key
- `phone_number`: Unique identifier (used for WhatsApp/SMS)
- `display_name`: Optional friendly name
- `created_at`, `updated_at`: Standard timestamps

**Note:** Keep minimal for MVP. Later add: email, profile_pic_url, emergency_contacts (JSON or separate table).

---

### 2. `sos_sessions`

Core table for tracking active/historical SOS incidents.

```sql
CREATE TABLE sos_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    short_id VARCHAR(12) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session lifecycle
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    
    -- Location tracking
    initial_lat DECIMAL(10, 8) NOT NULL,
    initial_lng DECIMAL(11, 8) NOT NULL,
    last_lat DECIMAL(10, 8) NOT NULL,
    last_lng DECIMAL(11, 8) NOT NULL,
    
    -- Metadata
    platform VARCHAR(20),
    device_info TEXT,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    resolved_at TIMESTAMP
);

-- Performance indexes
CREATE UNIQUE INDEX idx_sos_sessions_short_id ON sos_sessions(short_id);
CREATE INDEX idx_sos_sessions_user_id ON sos_sessions(user_id);
CREATE INDEX idx_sos_sessions_status ON sos_sessions(status);
CREATE INDEX idx_sos_sessions_expires_at ON sos_sessions(expires_at);
```

**Fields:**

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID | Primary key |
| `short_id` | VARCHAR(12) | Random string for URL (e.g., `ABC123XYZ`) - indexed for fast lookups |
| `user_id` | UUID | Foreign key to users table |
| `status` | VARCHAR(20) | Enum: `active`, `resolved`, `cancelled`, `expired` |
| `initial_lat`, `initial_lng` | DECIMAL | Starting location (for reference) |
| `last_lat`, `last_lng` | DECIMAL | Most recent location (for quick map centering without querying history) |
| `platform` | VARCHAR(20) | `ios`, `android`, `web` |
| `device_info` | TEXT | Device model, OS version (for debugging) |
| `created_at` | TIMESTAMP | SOS start time |
| `updated_at` | TIMESTAMP | Last location update |
| `expires_at` | TIMESTAMP | When session auto-expires (default: 4 hours) |
| `resolved_at` | TIMESTAMP | When user/admin resolved the SOS |

**Why `last_lat`/`last_lng`?**
- **Fast reads:** Map page can display current position by querying only `sos_sessions` (no JOIN)
- **Reduced load:** Avoids `ORDER BY timestamp DESC LIMIT 1` on `sos_locations` for every map refresh
- **Trade-off:** Slight denormalization for significant performance gain

**Status Enum Values:**
- `active`: Currently tracking location
- `resolved`: User confirmed safe
- `cancelled`: User cancelled before resolution
- `expired`: Auto-expired after 4 hours

---

### 3. `sos_locations`

Historical breadcrumb trail of all location updates during an SOS session.

```sql
CREATE TABLE sos_locations (
    id BIGSERIAL PRIMARY KEY,
    sos_session_id UUID NOT NULL REFERENCES sos_sessions(id) ON DELETE CASCADE,
    
    -- Location data
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(6, 2),
    altitude DECIMAL(8, 2),
    speed DECIMAL(6, 2),
    heading DECIMAL(5, 2),
    
    -- Metadata
    battery_level INTEGER,
    is_moving BOOLEAN,
    
    -- Timestamp
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_sos_locations_session_id ON sos_locations(sos_session_id);
CREATE INDEX idx_sos_locations_session_timestamp ON sos_locations(sos_session_id, timestamp DESC);
```

**Fields:**

| Field | Type | Purpose |
|-------|------|---------|
| `id` | BIGSERIAL | Auto-incrementing primary key (efficient for high-volume inserts) |
| `sos_session_id` | UUID | Foreign key to sos_sessions |
| `lat`, `lng` | DECIMAL | GPS coordinates (8/11 decimal places = ~1mm accuracy) |
| `accuracy` | DECIMAL | Horizontal accuracy in meters |
| `altitude` | DECIMAL | Elevation in meters (optional) |
| `speed` | DECIMAL | Speed in m/s (optional) |
| `heading` | DECIMAL | Direction in degrees (0-360) |
| `battery_level` | INTEGER | Device battery % (0-100) |
| `is_moving` | BOOLEAN | Derived from speed/accelerometer |
| `timestamp` | TIMESTAMP | When location was recorded |

**Why this schema?**
- **Efficient writes:** Simple table, minimal indexes, BIGSERIAL PK optimized for sequential inserts
- **Fast breadcrumb queries:** Composite index on `(sos_session_id, timestamp DESC)` makes "get last N locations" queries instant
- **Rich context:** Accuracy, battery, movement status help responders assess situation

**Typical query:**
```sql
-- Get last 50 locations for breadcrumb trail
SELECT lat, lng, timestamp, accuracy, battery_level
FROM sos_locations
WHERE sos_session_id = $1
ORDER BY timestamp DESC
LIMIT 50;
```

---

### 4. `sos_viewers` (Optional - Future Feature)

Track who is watching each SOS session (for privacy auditing and "X people are watching" UI).

```sql
CREATE TABLE sos_viewers (
    id BIGSERIAL PRIMARY KEY,
    sos_session_id UUID NOT NULL REFERENCES sos_sessions(id) ON DELETE CASCADE,
    
    -- Viewer identification
    viewer_identifier VARCHAR(100) NOT NULL, -- Phone number or session token
    viewer_type VARCHAR(20) NOT NULL DEFAULT 'contact', -- 'contact', 'responder', 'admin'
    
    -- Activity tracking
    first_viewed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_viewed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_sos_viewers_session_id ON sos_viewers(sos_session_id);
CREATE INDEX idx_sos_viewers_identifier ON sos_viewers(viewer_identifier);
CREATE UNIQUE INDEX idx_sos_viewers_unique ON sos_viewers(sos_session_id, viewer_identifier);
```

**Fields:**
- `viewer_identifier`: Phone number or anonymous session token
- `viewer_type`: Differentiates emergency contacts from first responders
- `first_viewed_at`, `last_viewed_at`: Track engagement
- `is_active`: Mark as false when viewer closes map tab

**Use cases:**
- Display "3 people are watching" on map page
- Privacy audit trail (who accessed the live feed)
- Notify user when first responder joins

**Note:** Defer to post-MVP. Adds complexity to WebSocket handling.

---

## Index Strategy

### Critical Indexes for Performance

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `idx_sos_sessions_short_id` | sos_sessions | short_id | **UNIQUE** - Fast lookup when loading map page |
| `idx_sos_sessions_user_id` | sos_sessions | user_id | User's SOS history queries |
| `idx_sos_sessions_status` | sos_sessions | status | Filter active sessions for cleanup jobs |
| `idx_sos_sessions_expires_at` | sos_sessions | expires_at | Find expired sessions for background worker |
| `idx_sos_locations_session_timestamp` | sos_locations | (sos_session_id, timestamp DESC) | **COMPOSITE** - Fast breadcrumb queries |

### Why These Indexes?

1. **`short_id` (UNIQUE)**
   - Every map page load queries: `SELECT * FROM sos_sessions WHERE short_id = 'ABC123XYZ'`
   - Without index: Full table scan (slow at scale)
   - With index: O(log n) lookup, <1ms even with millions of sessions

2. **`(sos_session_id, timestamp DESC)` composite**
   - Breadcrumb query: `WHERE sos_session_id = X ORDER BY timestamp DESC LIMIT 50`
   - Composite index allows "index-only scan" (no table lookup needed)
   - Critical for rendering map trail with 100+ location points

3. **`expires_at`**
   - Background job runs every 5 minutes: `SELECT id FROM sos_sessions WHERE expires_at < NOW() AND status = 'active'`
   - Without index: Scans entire table
   - With index: Instantly finds expired sessions

---

## Schema Usage Patterns

### 1. Creating an SOS Session

```sql
-- 1. Insert into sos_sessions
INSERT INTO sos_sessions (
    short_id, user_id, status, 
    initial_lat, initial_lng, last_lat, last_lng,
    platform, expires_at
) VALUES (
    'ABC123XYZ', 
    '550e8400-e29b-41d4-a716-446655440000',
    'active',
    40.7128, -74.0060, 40.7128, -74.0060,
    'ios',
    NOW() + INTERVAL '4 hours'
) RETURNING id;

-- 2. Insert initial location
INSERT INTO sos_locations (
    sos_session_id, lat, lng, accuracy, battery_level
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    40.7128, -74.0060, 12.5, 85
);
```

### 2. Updating Location (Every 10-15 Seconds)

```sql
-- 1. Update last_lat/last_lng in sos_sessions (for fast reads)
UPDATE sos_sessions
SET last_lat = 40.7135, 
    last_lng = -74.0065,
    updated_at = NOW()
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- 2. Insert into sos_locations (for breadcrumb history)
INSERT INTO sos_locations (
    sos_session_id, lat, lng, accuracy, battery_level, is_moving
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    40.7135, -74.0065, 8.2, 84, TRUE
);
```

**Why Two Writes?**
- `sos_sessions.last_lat/last_lng`: Optimizes map page load (single query, no JOIN)
- `sos_locations`: Preserves full history for breadcrumb trail and forensics
- **Trade-off:** Extra write operation for 10x faster reads

### 3. Loading Map Page

```sql
-- Single query to get session + current location
SELECT 
    id, short_id, user_id, status,
    last_lat, last_lng, 
    initial_lat, initial_lng,
    created_at, updated_at, expires_at
FROM sos_sessions
WHERE short_id = 'ABC123XYZ' AND status = 'active';

-- Separate query for breadcrumb trail
SELECT lat, lng, timestamp, accuracy, battery_level
FROM sos_locations
WHERE sos_session_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY timestamp DESC
LIMIT 100;
```

**Performance:**
- First query: <1ms (indexed on `short_id`)
- Second query: <5ms (composite index on `session_id, timestamp`)
- **Total:** Map loads in <10ms (DB time)

### 4. Resolving an SOS

```sql
UPDATE sos_sessions
SET status = 'resolved',
    resolved_at = NOW(),
    updated_at = NOW()
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
```

### 5. Cleanup Expired Sessions (Background Job)

```sql
-- Find expired sessions
UPDATE sos_sessions
SET status = 'expired',
    updated_at = NOW()
WHERE status = 'active' 
  AND expires_at < NOW();
```

---

## Future Extensibility

### Adding Media (Audio, Video, Photos)

Create a generic `sos_media` table:

```sql
CREATE TABLE sos_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sos_session_id UUID NOT NULL REFERENCES sos_sessions(id) ON DELETE CASCADE,
    
    -- Media metadata
    media_type VARCHAR(20) NOT NULL, -- 'audio', 'video', 'photo'
    file_url TEXT NOT NULL, -- S3/Cloudflare URL
    file_size_bytes BIGINT,
    duration_seconds INTEGER, -- For audio/video
    mime_type VARCHAR(50),
    
    -- Context
    recorded_at TIMESTAMP NOT NULL,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    
    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sos_media_session_id ON sos_media(sos_session_id);
CREATE INDEX idx_sos_media_type ON sos_media(media_type);
```

**Use cases:**
- Audio snippets: User records voice memo describing situation
- Video clips: 10-second clips uploaded during SOS
- Photos: Evidence of scene (accident, threat, etc.)

**Storage strategy:**
- Store files in S3/Cloudflare R2, only metadata in DB
- Use signed URLs for secure access
- Link media to specific location via `lat`/`lng`

### Adding Text Notes

Add to `sos_sessions` or create `sos_notes` table:

**Option 1: Simple (add to sos_sessions)**
```sql
ALTER TABLE sos_sessions ADD COLUMN notes TEXT;
```

**Option 2: Rich (separate table for multiple notes)**
```sql
CREATE TABLE sos_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sos_session_id UUID NOT NULL REFERENCES sos_sessions(id) ON DELETE CASCADE,
    author VARCHAR(50), -- 'user', 'responder', 'admin'
    note_text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sos_notes_session_id ON sos_notes(sos_session_id);
```

**Use cases:**
- User leaves notes: "Hiding in basement", "Car broke down on highway"
- Responders add notes: "Ambulance dispatched 10:34 AM"

---

## Prisma Schema Example

For those using Prisma ORM, here's the equivalent schema:

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String       @id @default(uuid()) @db.Uuid
  phoneNumber  String       @unique @map("phone_number") @db.VarChar(20)
  displayName  String?      @map("display_name") @db.VarChar(100)
  createdAt    DateTime     @default(now()) @map("created_at")
  updatedAt    DateTime     @updatedAt @map("updated_at")
  
  sosSessions  SosSession[]
  
  @@index([phoneNumber])
  @@map("users")
}

model SosSession {
  id          String    @id @default(uuid()) @db.Uuid
  shortId     String    @unique @map("short_id") @db.VarChar(12)
  userId      String    @map("user_id") @db.Uuid
  status      String    @default("active") @db.VarChar(20)
  
  initialLat  Decimal   @map("initial_lat") @db.Decimal(10, 8)
  initialLng  Decimal   @map("initial_lng") @db.Decimal(11, 8)
  lastLat     Decimal   @map("last_lat") @db.Decimal(10, 8)
  lastLng     Decimal   @map("last_lng") @db.Decimal(11, 8)
  
  platform    String?   @db.VarChar(20)
  deviceInfo  String?   @map("device_info") @db.Text
  
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  expiresAt   DateTime  @map("expires_at")
  resolvedAt  DateTime? @map("resolved_at")
  
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  locations   SosLocation[]
  media       SosMedia[]
  
  @@index([shortId])
  @@index([userId])
  @@index([status])
  @@index([expiresAt])
  @@map("sos_sessions")
}

model SosLocation {
  id           BigInt     @id @default(autoincrement())
  sosSessionId String     @map("sos_session_id") @db.Uuid
  
  lat          Decimal    @db.Decimal(10, 8)
  lng          Decimal    @db.Decimal(11, 8)
  accuracy     Decimal?   @db.Decimal(6, 2)
  altitude     Decimal?   @db.Decimal(8, 2)
  speed        Decimal?   @db.Decimal(6, 2)
  heading      Decimal?   @db.Decimal(5, 2)
  
  batteryLevel Int?       @map("battery_level")
  isMoving     Boolean?   @map("is_moving")
  
  timestamp    DateTime   @default(now())
  
  sosSession   SosSession @relation(fields: [sosSessionId], references: [id], onDelete: Cascade)
  
  @@index([sosSessionId])
  @@index([sosSessionId, timestamp(sort: Desc)])
  @@map("sos_locations")
}

model SosMedia {
  id              String    @id @default(uuid()) @db.Uuid
  sosSessionId    String    @map("sos_session_id") @db.Uuid
  
  mediaType       String    @map("media_type") @db.VarChar(20)
  fileUrl         String    @map("file_url") @db.Text
  fileSizeBytes   BigInt?   @map("file_size_bytes")
  durationSeconds Int?      @map("duration_seconds")
  mimeType        String?   @map("mime_type") @db.VarChar(50)
  
  recordedAt      DateTime  @map("recorded_at")
  lat             Decimal?  @db.Decimal(10, 8)
  lng             Decimal?  @db.Decimal(11, 8)
  
  createdAt       DateTime  @default(now()) @map("created_at")
  
  sosSession      SosSession @relation(fields: [sosSessionId], references: [id], onDelete: Cascade)
  
  @@index([sosSessionId])
  @@index([mediaType])
  @@map("sos_media")
}
```

---

## Why This Schema Supports Our Goals

### 1. Fast Reads (Map Page Performance)

✅ **Single query for current location:**
```sql
SELECT last_lat, last_lng FROM sos_sessions WHERE short_id = 'ABC123XYZ'
```
- No JOIN required (denormalized `last_lat`/`last_lng`)
- Indexed on `short_id` for <1ms lookup

✅ **Efficient breadcrumb retrieval:**
```sql
SELECT lat, lng, timestamp FROM sos_locations 
WHERE sos_session_id = $1 ORDER BY timestamp DESC LIMIT 100
```
- Composite index `(sos_session_id, timestamp DESC)` allows index-only scan
- Even with 1000+ locations per session, query takes <5ms

### 2. Efficient Writes (Frequent Updates)

✅ **Minimal writes per update:**
- 1 UPDATE on `sos_sessions` (tiny table, indexed)
- 1 INSERT on `sos_locations` (optimized with BIGSERIAL PK)
- No triggers, no cascades, no complex logic

✅ **Write throughput:**
- Target: 1000 concurrent active SOS sessions
- Update frequency: 10-15 seconds
- Write load: ~70-100 writes/second (easily handled by Postgres)

✅ **No lock contention:**
- Each session updates its own row (no table-level locks)
- `sos_locations` uses append-only pattern (no conflicts)

### 3. Future Growth

✅ **Easy to add features:**
- **Media:** Add `sos_media` table with foreign key
- **Notes:** Add `notes` column or `sos_notes` table
- **Viewers:** Add `sos_viewers` table (already designed)
- **Geofencing:** Add `sos_geofences` table with PostGIS extension

✅ **Scaling strategy:**
- **Read replicas:** Map page queries go to replicas
- **Partitioning:** Partition `sos_locations` by `sos_session_id` hash (millions of rows)
- **Archiving:** Move `status != 'active'` sessions to cold storage after 30 days

---

## Data Retention & Cleanup

### Automatic Expiry

**Background job (runs every 5 minutes):**
```sql
UPDATE sos_sessions
SET status = 'expired'
WHERE status = 'active' 
  AND expires_at < NOW();
```

### Data Retention Policy

| Data Type | Retention | Action |
|-----------|-----------|--------|
| Active sessions | 4 hours | Auto-expire |
| Resolved sessions | 30 days | Keep in DB |
| Expired sessions | 30 days | Archive to S3, delete from DB |
| Location history | 30 days | Delete with session |
| Media files | 90 days | Delete from S3 |

### Archival Strategy

**Monthly cleanup job:**
```sql
-- 1. Archive old sessions to S3 (via application logic)
SELECT * FROM sos_sessions 
WHERE updated_at < NOW() - INTERVAL '30 days' 
  AND status IN ('resolved', 'expired', 'cancelled');

-- 2. Delete from DB
DELETE FROM sos_sessions 
WHERE updated_at < NOW() - INTERVAL '30 days' 
  AND status IN ('resolved', 'expired', 'cancelled');
-- Cascade will auto-delete sos_locations due to ON DELETE CASCADE
```

---

## Schema Validation Checklist

### ✅ Core Requirements

- ✅ **I have a clear schema for `sos_sessions`**
  - UUID primary key + unique `short_id` for URL
  - Status tracking (active/resolved/cancelled/expired)
  - Denormalized `last_lat`/`last_lng` for fast reads
  - Timestamp fields for lifecycle management

- ✅ **I have a clear schema for `sos_locations` and how it's used**
  - Stores complete location history for breadcrumb trail
  - Efficient inserts with BIGSERIAL primary key
  - Rich metadata (accuracy, battery, movement, heading)
  - Complementary to `sos_sessions.last_lat/last_lng` (history vs current)

- ✅ **I know what to index for performance**
  - `sos_sessions.short_id` (UNIQUE) - Map page lookups
  - `(sos_locations.sos_session_id, timestamp DESC)` - Breadcrumb queries
  - `sos_sessions.expires_at` - Cleanup job efficiency
  - Additional indexes for user queries and filtering

- ✅ **I see how to extend this later for audio/video/notes**
  - `sos_media` table for files (audio/video/photos)
  - `sos_notes` table for text annotations
  - `sos_viewers` table for tracking who is watching
  - All use foreign keys to `sos_sessions` with CASCADE delete

### Performance Targets

- Map page load: <50ms total (DB queries <10ms)
- Location update write: <5ms
- Breadcrumb query (100 points): <5ms
- Background cleanup: <100ms for 1000 sessions

### Scalability

- Handles 1000 concurrent active sessions
- 100 location updates/second sustained
- Millions of historical sessions (with partitioning)
- Read replicas for global map viewers

---

## Next Steps

1. **Create migration file** with SQL DDL from this document
2. **Set up Prisma** (optional) using provided schema
3. **Write API endpoints** for:
   - `POST /api/sos/create` - Create session
   - `PUT /api/sos/:sessionId/location` - Update location
   - `GET /api/sos/:shortId` - Get session details
   - `PUT /api/sos/:sessionId/resolve` - Mark resolved
4. **Implement background jobs**:
   - Expiry checker (every 5 minutes)
   - Cleanup archiver (daily)
5. **Add database migrations** to version control

---

**Ready to implement?** This schema is production-ready for MVP and scales to thousands of concurrent sessions. 🚀
