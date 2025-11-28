/**
 * SOS Service - Database operations for SOS sessions
 * Handles creating sessions, updating locations, and querying data
 */

const prisma = require('./prisma');
const crypto = require('crypto');

/**
 * Generate a random short ID for URL
 * Format: 9 characters, alphanumeric (uppercase), URL-safe
 * Example: ABC123XYZ
 */
function generateShortId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const bytes = crypto.randomBytes(9);
  
  for (let i = 0; i < 9; i++) {
    result += chars[bytes[i] % chars.length];
  }
  
  return result;
}

/**
 * Create or get user by phone number
 * @param {string} phoneNumber - Phone in E.164 format (+1234567890)
 * @param {string} displayName - Optional display name
 * @returns {Promise<User>}
 */
async function getOrCreateUser(phoneNumber, displayName = null) {
  let user = await prisma.user.findUnique({
    where: { phoneNumber }
  });
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        phoneNumber,
        displayName: displayName || phoneNumber
      }
    });
  }
  
  return user;
}

/**
 * Create a new SOS session
 * @param {Object} params
 * @param {string} params.userId - User UUID
 * @param {number} params.lat - Initial latitude
 * @param {number} params.lng - Initial longitude
 * @param {string} params.platform - 'ios' | 'android' | 'web'
 * @param {string} params.deviceInfo - Device model, OS version
 * @param {number} params.expiryHours - Hours until expiry (default: 4)
 * @returns {Promise<SosSession>}
 */
async function createSosSession({ userId, lat, lng, platform, deviceInfo, expiryHours = 4 }) {
  const shortId = generateShortId();
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
  
  const session = await prisma.sosSession.create({
    data: {
      shortId,
      userId,
      status: 'active',
      initialLat: lat,
      initialLng: lng,
      lastLat: lat,
      lastLng: lng,
      platform,
      deviceInfo,
      expiresAt
    },
    include: {
      user: true
    }
  });
  
  // Create initial location record
  await prisma.sosLocation.create({
    data: {
      sosSessionId: session.id,
      lat,
      lng,
      timestamp: new Date()
    }
  });
  
  return session;
}

/**
 * Update location for an active SOS session
 * @param {Object} params
 * @param {string} params.sessionId - Session UUID
 * @param {number} params.lat - Latitude
 * @param {number} params.lng - Longitude
 * @param {number} params.accuracy - GPS accuracy in meters
 * @param {number} params.altitude - Altitude in meters
 * @param {number} params.speed - Speed in m/s
 * @param {number} params.heading - Direction in degrees (0-360)
 * @param {number} params.batteryLevel - Battery % (0-100)
 * @param {boolean} params.isMoving - Is device moving
 * @returns {Promise<void>}
 */
async function updateLocation({
  sessionId,
  lat,
  lng,
  accuracy = null,
  altitude = null,
  speed = null,
  heading = null,
  batteryLevel = null,
  isMoving = null
}) {
  // Update last_lat/last_lng in sos_sessions for fast reads
  await prisma.sosSession.update({
    where: { id: sessionId },
    data: {
      lastLat: lat,
      lastLng: lng,
      updatedAt: new Date()
    }
  });
  
  // Insert into sos_locations for history/breadcrumb
  await prisma.sosLocation.create({
    data: {
      sosSessionId: sessionId,
      lat,
      lng,
      accuracy,
      altitude,
      speed,
      heading,
      batteryLevel,
      isMoving,
      timestamp: new Date()
    }
  });
}

/**
 * Get SOS session by short ID (for map page)
 * @param {string} shortId - Short ID from URL (e.g., ABC123XYZ)
 * @returns {Promise<SosSession|null>}
 */
async function getSessionByShortId(shortId) {
  return await prisma.sosSession.findUnique({
    where: { shortId },
    include: {
      user: {
        select: {
          phoneNumber: true,
          displayName: true
        }
      }
    }
  });
}

/**
 * Get location history for breadcrumb trail
 * @param {string} sessionId - Session UUID
 * @param {number} limit - Max locations to return (default: 100)
 * @returns {Promise<SosLocation[]>}
 */
async function getLocationHistory(sessionId, limit = 100) {
  return await prisma.sosLocation.findMany({
    where: { sosSessionId: sessionId },
    orderBy: { timestamp: 'desc' },
    take: limit,
    select: {
      lat: true,
      lng: true,
      timestamp: true,
      accuracy: true,
      batteryLevel: true,
      isMoving: true,
      speed: true,
      heading: true
    }
  });
}

/**
 * Resolve an SOS session (user is safe)
 * @param {string} sessionId - Session UUID
 * @returns {Promise<SosSession>}
 */
async function resolveSession(sessionId) {
  return await prisma.sosSession.update({
    where: { id: sessionId },
    data: {
      status: 'resolved',
      resolvedAt: new Date()
    }
  });
}

/**
 * Cancel an SOS session
 * @param {string} sessionId - Session UUID
 * @returns {Promise<SosSession>}
 */
async function cancelSession(sessionId) {
  return await prisma.sosSession.update({
    where: { id: sessionId },
    data: {
      status: 'cancelled',
      resolvedAt: new Date()
    }
  });
}

/**
 * Expire old SOS sessions (background job)
 * @returns {Promise<number>} Number of sessions expired
 */
async function expireOldSessions() {
  const result = await prisma.sosSession.updateMany({
    where: {
      status: 'active',
      expiresAt: {
        lt: new Date()
      }
    },
    data: {
      status: 'expired'
    }
  });
  
  return result.count;
}

/**
 * Get all active sessions for a user
 * @param {string} userId - User UUID
 * @returns {Promise<SosSession[]>}
 */
async function getUserActiveSessions(userId) {
  return await prisma.sosSession.findMany({
    where: {
      userId,
      status: 'active'
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
}

/**
 * Get session statistics (for debugging/monitoring)
 * @param {string} sessionId - Session UUID
 * @returns {Promise<Object>}
 */
async function getSessionStats(sessionId) {
  const session = await prisma.sosSession.findUnique({
    where: { id: sessionId }
  });
  
  const locationCount = await prisma.sosLocation.count({
    where: { sosSessionId: sessionId }
  });
  
  const firstLocation = await prisma.sosLocation.findFirst({
    where: { sosSessionId: sessionId },
    orderBy: { timestamp: 'asc' }
  });
  
  const lastLocation = await prisma.sosLocation.findFirst({
    where: { sosSessionId: sessionId },
    orderBy: { timestamp: 'desc' }
  });
  
  return {
    session,
    locationCount,
    firstLocation,
    lastLocation,
    durationMinutes: session ? 
      Math.round((new Date() - session.createdAt) / 60000) : 0
  };
}

module.exports = {
  // User operations
  getOrCreateUser,
  
  // Session operations
  createSosSession,
  getSessionByShortId,
  resolveSession,
  cancelSession,
  expireOldSessions,
  getUserActiveSessions,
  getSessionStats,
  
  // Location operations
  updateLocation,
  getLocationHistory,
  
  // Utilities
  generateShortId
};
