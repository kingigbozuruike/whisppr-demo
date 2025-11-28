/**
 * SOS API Routes
 * Handles SOS creation, location updates, and session management
 */

const express = require('express');
const router = express.Router();
const sosService = require('../db/sosService');
const { authenticateAPI, sosCreationLimiter, locationUpdateLimiter } = require('../middleware/auth');
const { sendWhatsAppAlert } = require('../services/whatsapp');

/**
 * POST /api/sos
 * Create a new SOS session and send alerts
 */
router.post('/sos', sosCreationLimiter, authenticateAPI, async (req, res) => {
  try {
    const {
      userId,
      phoneNumber,
      name,
      lat,
      lng,
      accuracy,
      platform,
      deviceInfo,
      batteryLevel,
      channel = 'whatsapp',
      emergencyContacts = []
    } = req.body;

    // Validate required fields
    if (!phoneNumber || !name || lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Missing required fields: phoneNumber, name, lat, lng'
      });
    }

    // Get or create user
    const user = await sosService.getOrCreateUser(phoneNumber, name);

    // Check for existing active sessions
    const existingSessions = await sosService.getUserActiveSessions(user.id);
    if (existingSessions.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'ActiveSessionExists',
        message: 'You already have an active SOS session',
        existingSession: {
          shortId: existingSessions[0].shortId,
          mapUrl: `${process.env.MAP_BASE_URL || 'https://maps.whisppr.com'}/sos/${existingSessions[0].shortId}`
        }
      });
    }

    // Create SOS session
    const session = await sosService.createSosSession({
      userId: user.id,
      lat,
      lng,
      platform: platform || 'unknown',
      deviceInfo: deviceInfo || 'Unknown device',
      expiryHours: 4
    });

    // Build map URL
    const mapUrl = `${process.env.MAP_BASE_URL || 'https://maps.whisppr.com'}/sos/${session.shortId}`;

    // Send alerts via WhatsApp
    let alertsSent = 0;
    let alertsFailed = 0;

    if (channel === 'whatsapp' && emergencyContacts.length > 0) {
      const alertMessage = `🚨 *EMERGENCY ALERT*\n\n${name} needs help!\n\n📱 *Platform:* ${platform}\n⏰ *Time:* ${new Date().toLocaleString()}\n📍 *Live Location:* ${mapUrl}\n\nThis link shows their live location for the next 4 hours.`;

      for (const contact of emergencyContacts) {
        try {
          await sendWhatsAppAlert(contact, alertMessage, lat, lng);
          alertsSent++;
        } catch (error) {
          console.error(`Failed to send WhatsApp alert to ${contact}:`, error);
          alertsFailed++;
        }
      }
    }

    // Respond with session details
    res.status(201).json({
      success: true,
      data: {
        sosId: session.id,
        shortId: session.shortId,
        mapUrl,
        status: session.status,
        expiresAt: session.expiresAt,
        alertsSent: {
          [channel]: alertsSent,
          failed: alertsFailed
        }
      }
    });

  } catch (error) {
    console.error('Error creating SOS session:', error);
    res.status(500).json({
      success: false,
      error: 'InternalError',
      message: 'Failed to create SOS session'
    });
  }
});

/**
 * POST /api/sos/:shortId/location
 * Update location for an active SOS session
 */
router.post('/sos/:shortId/location', locationUpdateLimiter, authenticateAPI, async (req, res) => {
  try {
    const { shortId } = req.params;
    const {
      lat,
      lng,
      accuracy,
      altitude,
      speed,
      heading,
      batteryLevel,
      isMoving,
      timestamp
    } = req.body;

    // Validate required fields
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Missing required fields: lat, lng'
      });
    }

    // Get session
    const session = await sosService.getSessionByShortId(shortId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'SessionNotFound',
        message: 'SOS session not found'
      });
    }

    // Check if expired
    if (new Date() > new Date(session.expiresAt)) {
      return res.status(410).json({
        success: false,
        error: 'SessionExpired',
        message: 'SOS session has expired',
        expiredAt: session.expiresAt
      });
    }

    // Check if active
    if (session.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'SessionInactive',
        message: 'SOS session is resolved/cancelled',
        status: session.status
      });
    }

    // Update location in database
    await sosService.updateLocation({
      sessionId: session.id,
      lat,
      lng,
      accuracy,
      altitude,
      speed,
      heading,
      batteryLevel,
      isMoving,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });

    // Broadcast to WebSocket watchers
    const io = req.app.get('io');
    if (io) {
      const watcherCount = io.sockets.adapter.rooms.get(shortId)?.size || 0;
      
      io.to(shortId).emit('location_update', {
        type: 'location_update',
        shortId,
        location: {
          lat,
          lng,
          accuracy,
          altitude,
          speed,
          heading,
          batteryLevel,
          isMoving,
          timestamp: timestamp || new Date().toISOString()
        },
        session: {
          status: session.status,
          updatedAt: new Date().toISOString(),
          durationMinutes: Math.round((new Date() - new Date(session.createdAt)) / 60000)
        }
      });

      return res.json({
        success: true,
        data: {
          updated: true,
          watchersNotified: watcherCount
        }
      });
    }

    res.json({
      success: true,
      data: {
        updated: true,
        watchersNotified: 0
      }
    });

  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({
      success: false,
      error: 'InternalError',
      message: 'Failed to update location'
    });
  }
});

/**
 * GET /api/sos/:shortId
 * Get session data for map page
 */
router.get('/sos/:shortId', async (req, res) => {
  try {
    const { shortId } = req.params;
    const locationLimit = Math.min(parseInt(req.query.locationLimit) || 100, 500);

    // Get session
    const session = await sosService.getSessionByShortId(shortId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'SessionNotFound',
        message: 'SOS session not found'
      });
    }

    // Get location history
    const recentLocations = await sosService.getLocationHistory(session.id, locationLimit);

    // Get statistics
    const stats = await sosService.getSessionStats(session.id);

    // Check if expired
    const isExpired = new Date() > new Date(session.expiresAt) || session.status === 'expired';

    // Build response
    const response = {
      success: true,
      data: {
        session: {
          sosId: session.id,
          shortId: session.shortId,
          status: isExpired ? 'expired' : session.status,
          userName: session.user.displayName,
          phoneNumber: session.user.phoneNumber,
          platform: session.platform,
          deviceInfo: session.deviceInfo,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          expiresAt: session.expiresAt,
          resolvedAt: session.resolvedAt,
          isExpired,
          durationMinutes: stats.durationMinutes
        },
        currentLocation: {
          lat: parseFloat(session.lastLat),
          lng: parseFloat(session.lastLng),
          timestamp: session.updatedAt,
          batteryLevel: recentLocations[0]?.batteryLevel || null,
          isMoving: recentLocations[0]?.isMoving || null
        },
        recentLocations: recentLocations.map(loc => ({
          lat: parseFloat(loc.lat),
          lng: parseFloat(loc.lng),
          timestamp: loc.timestamp,
          accuracy: loc.accuracy ? parseFloat(loc.accuracy) : null,
          batteryLevel: loc.batteryLevel,
          speed: loc.speed ? parseFloat(loc.speed) : null,
          heading: loc.heading ? parseFloat(loc.heading) : null
        })),
        statistics: {
          totalLocations: stats.locationCount,
          distanceTraveled: null, // TODO: Calculate distance
          averageSpeed: null, // TODO: Calculate average
          lastUpdateSeconds: Math.round((new Date() - new Date(session.updatedAt)) / 1000)
        }
      }
    };

    // Add message for expired sessions
    if (isExpired) {
      response.data.message = 'This SOS session has expired';
    }

    res.json(response);

  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({
      success: false,
      error: 'InternalError',
      message: 'Failed to get session data'
    });
  }
});

/**
 * PUT /api/sos/:shortId/status
 * Resolve or cancel an SOS session
 */
router.put('/sos/:shortId/status', authenticateAPI, async (req, res) => {
  try {
    const { shortId } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['resolved', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Status must be "resolved" or "cancelled"'
      });
    }

    // Get session
    const session = await sosService.getSessionByShortId(shortId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'SessionNotFound',
        message: 'SOS session not found'
      });
    }

    // Update status
    const updatedSession = status === 'resolved'
      ? await sosService.resolveSession(session.id)
      : await sosService.cancelSession(session.id);

    // Broadcast status change to watchers
    const io = req.app.get('io');
    if (io) {
      io.to(shortId).emit('session_status', {
        type: 'session_status',
        shortId,
        status,
        resolvedAt: updatedSession.resolvedAt,
        message: status === 'resolved'
          ? 'SOS has been resolved - user is safe'
          : 'SOS has been cancelled by user'
      });
    }

    res.json({
      success: true,
      data: {
        sosId: updatedSession.id,
        shortId,
        status: updatedSession.status,
        resolvedAt: updatedSession.resolvedAt
      }
    });

  } catch (error) {
    console.error('Error updating session status:', error);
    res.status(500).json({
      success: false,
      error: 'InternalError',
      message: 'Failed to update session status'
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const prisma = require('../db/prisma');
    
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Get stats
    const activeSessions = await prisma.sosSession.count({
      where: { status: 'active' }
    });

    const io = req.app.get('io');
    const connectedClients = io ? io.sockets.sockets.size : 0;

    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        websocket: io ? 'active' : 'inactive',
        redis: 'not_configured'
      },
      stats: {
        activeSessions,
        connectedClients
      }
    });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

module.exports = router;
