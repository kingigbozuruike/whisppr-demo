/**
 * Whisppr Emergency SOS Backend
 * Supports SMS (Textbelt/Twilio) and WhatsApp messaging
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { createServer } = require('http');
const { Server } = require('socket.io');
const sosService = require('./db/sosService');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  // Messaging provider: 'textbelt', 'twilio', or 'whatsapp'
  provider: process.env.SMS_PROVIDER || 'whatsapp', // Default to WhatsApp
  
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_FROM_NUMBER,
  },
  
  whatsapp: {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneId: process.env.WHATSAPP_PHONE_ID,
    businessId: process.env.WHATSAPP_BUSINESS_ID,
    apiUrl: process.env.WHATSAPP_PHONE_ID 
      ? `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`
      : null,
  },
  
  api: {
    key: process.env.WHISPPR_API_KEY || 'demo-secret-key',
  },
  
  // Demo numbers - hard-coded for demo (replace with your numbers)
  demoNumbers: [
    process.env.DEMO_NUMBER_1,
    process.env.DEMO_NUMBER_2,
  ].filter(num => num && !num.includes('12345')), // Filter out placeholder numbers
};

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Enable CORS for all origins (restrict in production)
app.use(cors({
  origin: '*',
  methods: ['POST', 'GET', 'OPTIONS'],
}));

// Parse JSON bodies
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

const authenticateRequest = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== config.api.key) {
    console.log('✗ Unauthorized request - invalid API key');
    return res.status(401).json({
      status: 'error',
      error: 'Unauthorized - Invalid API key',
    });
  }
  
  next();
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format SMS message with user info and location
 */
const formatSMSMessage = (name, lat, lng, platform, mapUrl = null) => {
  // Note: Some SMS providers require verification to send URLs
  // Whitelist your key at: https://textbelt.com/whitelist
  
  const mapLink = mapUrl ? `\nLive Tracking: ${mapUrl}` : '';
  
  return `[Whisppr] ${name} may need help!
Location: ${lat}, ${lng}${mapLink}
Platform: ${platform || 'mobile-app'}

Emergency alert - please respond.`;
};

/**
 * Send SMS via Textbelt
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - SMS message content
 * @returns {Promise<object>} Result with success status
 */
const sendTextbeltSMS = async (phoneNumber, message) => {
  try {
    console.log(`Sending SMS to ${phoneNumber} via Textbelt...`);
    
    const response = await fetch(config.textbelt.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: phoneNumber,
        message: message,
        key: config.textbelt.apiKey,
      }),
    });

    const result = await response.json();

    if (result.success) {
      console.log(`✓ SMS sent successfully to ${phoneNumber}`);
      console.log(`  Text ID: ${result.textId}`);
      console.log(`  Quota remaining: ${result.quotaRemaining}`);
      return { 
        success: true, 
        textId: result.textId, 
        phone: phoneNumber,
        quotaRemaining: result.quotaRemaining,
      };
    } else {
      console.log(`✗ SMS failed to ${phoneNumber}: ${result.error}`);
      return { 
        success: false, 
        error: result.error || 'Unknown error',
        phone: phoneNumber,
      };
    }
  } catch (error) {
    console.error(`✗ Textbelt error for ${phoneNumber}:`, error.message);
    return { 
      success: false, 
      error: error.message,
      phone: phoneNumber,
    };
  }
};

/**
 * Send SMS to all demo numbers
 */
const sendBatchSMS = async (message) => {
  if (config.demoNumbers.length === 0) {
    console.log('⚠ No demo numbers configured');
    return {
      total: 0,
      successful: 0,
      failed: 0,
      details: [],
      warning: 'No demo numbers configured in .env',
    };
  }

  console.log(`Sending to ${config.demoNumbers.length} recipients...`);
  
  const promises = config.demoNumbers.map(phoneNumber =>
    sendTextbeltSMS(phoneNumber, message)
  );
  
  const results = await Promise.allSettled(promises);
  
  const details = results.map(r => 
    r.status === 'fulfilled' ? r.value : { success: false, error: r.reason }
  );
  
  const summary = {
    total: results.length,
    successful: details.filter(d => d.success).length,
    failed: details.filter(d => !d.success).length,
    details: details,
  };
  
  console.log(`✓ Batch complete: ${summary.successful}/${summary.total} sent`);
  
  return summary;
};

/**
 * Send WhatsApp message
 * @param {string} phoneNumber - Recipient phone number (without + sign)
 * @param {string} message - Message content
 * @param {string} type - Message type: 'text' or 'location'
 * @param {object} locationData - Location data if type is 'location'
 * @returns {Promise<object>} Result with success status
 */
const sendWhatsAppMessage = async (phoneNumber, message, type = 'text', locationData = null) => {
  try {
    if (!config.whatsapp.apiUrl || !config.whatsapp.accessToken) {
      throw new Error('WhatsApp not configured');
    }

    // Remove + sign from phone number for WhatsApp
    const cleanNumber = phoneNumber.replace('+', '');
    
    console.log(`Sending WhatsApp ${type} to ${phoneNumber}...`);
    
    const payload = {
      messaging_product: 'whatsapp',
      to: cleanNumber,
      type: type,
    };

    if (type === 'text') {
      payload.text = { body: message };
    } else if (type === 'location' && locationData) {
      payload.location = locationData;
    }

    const response = await fetch(config.whatsapp.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.whatsapp.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok && result.messages && result.messages[0]) {
      console.log(`✓ WhatsApp ${type} sent to ${phoneNumber}`);
      console.log(`  Message ID: ${result.messages[0].id}`);
      return { 
        success: true, 
        messageId: result.messages[0].id,
        phone: phoneNumber,
        type: type,
      };
    } else {
      const errorMsg = result.error ? result.error.message : 'Unknown error';
      console.log(`✗ WhatsApp ${type} failed to ${phoneNumber}: ${errorMsg}`);
      return { 
        success: false, 
        error: errorMsg,
        phone: phoneNumber,
        type: type,
      };
    }
  } catch (error) {
    console.error(`✗ WhatsApp error for ${phoneNumber}:`, error.message);
    return { 
      success: false, 
      error: error.message,
      phone: phoneNumber,
      type: type,
    };
  }
};

/**
 * Send WhatsApp emergency alert (text + location) to all demo numbers
 */
const sendBatchWhatsApp = async (name, lat, lng, platform, mapUrl = null) => {
  if (config.demoNumbers.length === 0) {
    console.log('⚠ No demo numbers configured');
    return {
      total: 0,
      successful: 0,
      failed: 0,
      details: [],
      warning: 'No demo numbers configured in .env',
    };
  }

  console.log(`Sending WhatsApp alerts to ${config.demoNumbers.length} recipients...`);
  
  // Format emergency alert message
  const timestamp = new Date().toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });
  
  // Include live tracking URL if available
  const mapLink = mapUrl ? `\n\n📍 *LIVE TRACKING:*\n${mapUrl}\n\n_Tap the link above to track in real-time_` : '';

  const alertMessage = `🚨 *EMERGENCY ALERT*

${name} may need help!⏰ Time: ${timestamp}
📱 Platform: ${platform || 'mobile-app'}${mapLink}

A current location pin will follow.`;

  const locationData = {
    latitude: parseFloat(lat),
    longitude: parseFloat(lng),
    name: `${name}'s Emergency Location`,
    address: 'Tap to open in maps and get directions'
  };

  const allResults = [];

  // Send alert text to all recipients
  for (const phoneNumber of config.demoNumbers) {
    const textResult = await sendWhatsAppMessage(phoneNumber, alertMessage, 'text');
    allResults.push(textResult);
    
    // Wait a bit before sending location
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Send location pin
    const locationResult = await sendWhatsAppMessage(phoneNumber, null, 'location', locationData);
    allResults.push(locationResult);
  }

  const summary = {
    total: allResults.length,
    successful: allResults.filter(d => d.success).length,
    failed: allResults.filter(d => !d.success).length,
    details: allResults,
    recipients: config.demoNumbers.length,
  };
  
  console.log(`✓ WhatsApp batch complete: ${summary.successful}/${summary.total} messages sent to ${summary.recipients} recipients`);
  
  return summary;
};

/**
 * Send alerts using configured provider
 */
const sendAlerts = async (name, lat, lng, platform, shortId = null) => {
  const mapUrl = shortId ? `${process.env.MAP_BASE_URL || 'http://localhost:3001'}/sos/${shortId}` : null;
  
  if (config.provider === 'whatsapp') {
    return await sendBatchWhatsApp(name, lat, lng, platform, mapUrl);
  } else {
    // SMS (Textbelt/Twilio)
    const message = formatSMSMessage(name, lat, lng, platform, mapUrl);
    return await sendBatchSMS(message);
  }
};

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  const providerConfigured = 
    config.provider === 'whatsapp' 
      ? !!config.whatsapp.accessToken && !!config.whatsapp.phoneId
      : config.provider === 'twilio'
        ? !!config.twilio.accountSid && !!config.twilio.authToken
        : !!config.textbelt.apiKey;

  res.json({
    status: 'ok',
    service: 'whisppr-backend',
    provider: config.provider,
    providerConfigured: providerConfigured,
    timestamp: new Date().toISOString(),
    demoNumbers: config.demoNumbers.length,
  });
});

/**
 * SOS Emergency Alert Endpoint
 * POST /sos
 * 
 * Expected body:
 * {
 *   "name": "King",
 *   "lat": 32.52,
 *   "lng": -92.63,
 *   "platform": "expo-demo",
 *   "phoneNumber": "+1234567890"
 * }
 */
app.post('/sos', authenticateRequest, async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Extract request data (support multiple formats)
    const { 
      name, 
      lat, 
      lng, 
      latitude, 
      longitude, 
      platform,
      phoneNumber
    } = req.body;
    
    // Use lat/lng or latitude/longitude
    const finalLat = lat || latitude;
    const finalLng = lng || longitude;
    const finalName = name || 'Someone';
    const finalPhone = phoneNumber || '+10000000000';
    
    // Validate required fields
    if (!finalLat || !finalLng) {
      console.log('✗ Missing required fields');
      return res.status(400).json({
        status: 'error',
        error: 'Missing required fields: lat/lng or latitude/longitude',
      });
    }
    
    // Validate coordinates
    const parsedLat = parseFloat(finalLat);
    const parsedLng = parseFloat(finalLng);
    
    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      console.log('✗ Invalid coordinates');
      return res.status(400).json({
        status: 'error',
        error: 'Invalid coordinates - must be numbers',
      });
    }
    
    if (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
      console.log('✗ Coordinates out of range');
      return res.status(400).json({
        status: 'error',
        error: 'Coordinates out of valid range',
      });
    }
    
    // Log SOS event
    console.log('='.repeat(60));
    console.log('🚨 SOS ALERT RECEIVED');
    console.log(`Name: ${finalName}`);
    console.log(`Location: ${parsedLat}, ${parsedLng}`);
    console.log(`Platform: ${platform || 'unknown'}`);
    console.log(`Provider: ${config.provider.toUpperCase()}`);
    console.log('='.repeat(60));
    
    // Create user and SOS session in database
    let session;
    try {
      const user = await sosService.getOrCreateUser(finalPhone, finalName);
      session = await sosService.createSosSession({
        userId: user.id,
        lat: parsedLat,
        lng: parsedLng,
        platform: platform || 'unknown',
        deviceInfo: 'Mobile App',
        expiryHours: 4
      });
      console.log(`✓ Session created: ${session.shortId}`);
    } catch (dbError) {
      console.error('Database error:', dbError.message);
      // Continue without database - generate a temporary ID
      session = {
        shortId: 'TEMP' + Date.now().toString(36).toUpperCase(),
        id: 'temp-' + Date.now()
      };
    }
    
    // Build map URL
    const mapUrl = `${process.env.MAP_BASE_URL || 'http://localhost:3001'}/sos/${session.shortId}`;
    
    // Return success with session info
    const responseTime = Date.now() - startTime;
    res.json({
      status: 'ok',
      message: 'SOS alert initiated',
      recipients: config.demoNumbers.length,
      provider: config.provider,
      responseTime: responseTime,
      data: {
        shortId: session.shortId,
        sosId: session.id,
        mapUrl: mapUrl,
      }
    });
    
    // Send alerts asynchronously (non-blocking)
    sendAlerts(finalName, parsedLat, parsedLng, platform, session.shortId)
      .then(summary => {
        console.log(`✓ ${config.provider.toUpperCase()} batch completed`);
        console.log(`  Success: ${summary.successful}/${summary.total}`);
        if (summary.recipients) {
          console.log(`  Recipients: ${summary.recipients}`);
        }
        if (summary.warning) {
          console.log(`  Warning: ${summary.warning}`);
        }
      })
      .catch(error => {
        console.error(`✗ ${config.provider.toUpperCase()} batch error:`, error);
      });
    
  } catch (error) {
    console.error('✗ Error processing SOS request:', error);
    const responseTime = Date.now() - startTime;
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      responseTime: responseTime,
    });
  }
});

/**
 * Alternative route for compatibility
 * POST /api/sos
 */
app.post('/api/sos', authenticateRequest, async (req, res) => {
  // Proxy to /sos endpoint
  req.url = '/sos';
  app._router.handle(req, res);
});

/**
 * Location Update Endpoint
 * POST /api/sos/:shortId/location
 * 
 * Updates the live location for an active SOS session
 */
app.post('/api/sos/:shortId/location', authenticateRequest, async (req, res) => {
  try {
    const { shortId } = req.params;
    const { lat, lng, accuracy, altitude, speed, heading, batteryLevel, timestamp } = req.body;

    // Validate required fields
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        status: 'error',
        error: 'Missing required fields: lat, lng'
      });
    }

    // Get session from database
    const session = await sosService.getSessionByShortId(shortId);
    if (!session) {
      return res.status(404).json({
        status: 'error',
        error: 'SOS session not found'
      });
    }

    // Check if session is still active
    if (session.status !== 'active') {
      return res.status(403).json({
        status: 'error',
        error: 'SOS session is no longer active',
        sessionStatus: session.status
      });
    }

    // Check if session has expired
    if (new Date() > new Date(session.expiresAt)) {
      return res.status(410).json({
        status: 'error',
        error: 'SOS session has expired',
        expiredAt: session.expiresAt
      });
    }

    // Update location in database
    await sosService.updateLocation({
      sessionId: session.id,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      accuracy,
      altitude,
      speed,
      heading,
      batteryLevel,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });

    // Broadcast location update to all watchers via WebSocket
    broadcastLocationUpdate(shortId, {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      accuracy: accuracy ? parseFloat(accuracy) : null,
      speed: speed ? parseFloat(speed) : null,
      heading: heading ? parseFloat(heading) : null,
      batteryLevel,
      timestamp: new Date().toISOString()
    }, {
      status: session.status,
      createdAt: session.createdAt
    });

    res.json({
      status: 'ok',
      message: 'Location updated',
      shortId,
      location: { lat, lng }
    });

  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to update location'
    });
  }
});

/**
 * Get SOS Session Details
 * GET /api/sos/:shortId
 * 
 * Returns session info and location history for the map page
 */
app.get('/api/sos/:shortId', async (req, res) => {
  try {
    const { shortId } = req.params;

    const session = await sosService.getSessionByShortId(shortId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'SessionNotFound',
        message: 'SOS session not found'
      });
    }

    // Get location history
    const locations = await sosService.getLocationHistory(session.id, 100);
    
    // Calculate session duration in minutes
    const durationMinutes = Math.round((Date.now() - new Date(session.createdAt).getTime()) / 60000);
    
    // Calculate seconds since last update
    const lastUpdateSeconds = locations.length > 0 
      ? Math.round((Date.now() - new Date(locations[0].timestamp).getTime()) / 1000)
      : 0;
    
    // Check if expired
    const isExpired = new Date() > new Date(session.expiresAt);

    // Format response to match frontend SOSData type
    // Convert Prisma Decimal types to JavaScript numbers
    res.json({
      success: true,
      data: {
        session: {
          sosId: session.id,
          shortId: session.shortId,
          status: session.status,
          userName: session.user?.displayName || 'Unknown',
          phoneNumber: session.user?.phoneNumber || '',
          platform: session.platform || 'unknown',
          deviceInfo: session.deviceInfo || 'Unknown device',
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          expiresAt: session.expiresAt,
          resolvedAt: session.resolvedAt,
          isExpired: isExpired,
          durationMinutes: durationMinutes
        },
        currentLocation: {
          lat: parseFloat(session.lastLat),
          lng: parseFloat(session.lastLng),
          timestamp: locations.length > 0 ? locations[0].timestamp : session.updatedAt,
          accuracy: locations.length > 0 && locations[0].accuracy ? parseFloat(locations[0].accuracy) : null,
          batteryLevel: locations.length > 0 ? locations[0].batteryLevel : null,
          speed: locations.length > 0 && locations[0].speed ? parseFloat(locations[0].speed) : null,
          heading: locations.length > 0 && locations[0].heading ? parseFloat(locations[0].heading) : null,
          isMoving: locations.length > 0 ? locations[0].isMoving : null
        },
        recentLocations: locations.map(loc => ({
          lat: parseFloat(loc.lat),
          lng: parseFloat(loc.lng),
          timestamp: loc.timestamp,
          accuracy: loc.accuracy ? parseFloat(loc.accuracy) : null,
          batteryLevel: loc.batteryLevel,
          speed: loc.speed ? parseFloat(loc.speed) : null,
          heading: loc.heading ? parseFloat(loc.heading) : null,
          isMoving: loc.isMoving
        })),
        statistics: {
          totalLocations: locations.length,
          distanceTraveled: null, // Could calculate from location history
          averageSpeed: null, // Could calculate from speeds
          lastUpdateSeconds: lastUpdateSeconds
        }
      }
    });

  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({
      success: false,
      error: 'InternalError',
      message: 'Failed to fetch SOS session'
    });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    error: 'Endpoint not found',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    status: 'error',
    error: 'Internal server error',
  });
});

// ============================================================================
// WEBSOCKET (SOCKET.IO) HANDLERS
// ============================================================================

io.on('connection', (socket) => {
  console.log(`📡 Client connected: ${socket.id}`);

  // Subscribe to SOS session updates
  socket.on('subscribe', (data) => {
    // Handle both { shortId } object and plain string
    const shortId = typeof data === 'string' ? data : data.shortId;
    
    if (!shortId) {
      socket.emit('subscribe_error', { error: 'Invalid', message: 'shortId is required' });
      return;
    }
    
    socket.join(shortId);
    console.log(`📡 Client ${socket.id} subscribed to session: ${shortId}`);
    
    // Get current watcher count
    const room = io.sockets.adapter.rooms.get(shortId);
    const watcherCount = room ? room.size : 0;
    
    // Notify all watchers of new count
    io.to(shortId).emit('watcher_count', {
      type: 'watcher_count',
      shortId,
      count: watcherCount
    });
    
    // Confirm subscription
    socket.emit('subscribed', {
      type: 'subscribed',
      shortId,
      watcherCount
    });
  });

  // Unsubscribe from SOS session
  socket.on('unsubscribe', (data) => {
    const shortId = typeof data === 'string' ? data : data.shortId;
    if (!shortId) return;
    
    socket.leave(shortId);
    console.log(`📡 Client ${socket.id} unsubscribed from: ${shortId}`);
    
    // Update watcher count
    const room = io.sockets.adapter.rooms.get(shortId);
    const watcherCount = room ? room.size : 0;
    io.to(shortId).emit('watcher_count', {
      type: 'watcher_count',
      shortId,
      count: watcherCount
    });
  });

  socket.on('disconnect', () => {
    console.log(`📡 Client disconnected: ${socket.id}`);
  });
});

// Helper function to broadcast location updates
function broadcastLocationUpdate(shortId, locationData, sessionData = {}) {
  const now = new Date();
  io.to(shortId).emit('location_update', {
    type: 'location_update',
    shortId,
    location: locationData,
    session: {
      status: sessionData.status || 'active',
      updatedAt: now.toISOString(),
      durationMinutes: sessionData.createdAt 
        ? Math.floor((now - new Date(sessionData.createdAt)) / 60000)
        : 0
    },
    timestamp: now.toISOString()
  });
  console.log(`📡 Broadcast location update for ${shortId}`);
}

// Helper function to broadcast session status changes
function broadcastSessionStatus(shortId, status) {
  io.to(shortId).emit('session_status', {
    type: 'session_status',
    shortId,
    status,
    timestamp: new Date().toISOString()
  });
}

// ============================================================================
// SERVER START
// ============================================================================

httpServer.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚨 Whisppr Emergency SOS Backend');
  console.log('='.repeat(60));
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Provider: ${config.provider.toUpperCase()}`);
  
  if (config.provider === 'whatsapp') {
    console.log(`WhatsApp configured: ${!!config.whatsapp.accessToken && !!config.whatsapp.phoneId}`);
    console.log(`Phone ID: ${config.whatsapp.phoneId || 'NOT SET'}`);
  } else if (config.provider === 'twilio') {
    console.log(`Twilio configured: ${!!config.twilio.accountSid && !!config.twilio.authToken}`);
    console.log(`From number: ${config.twilio.fromNumber || 'NOT SET'}`);
  } else {
    console.log(`Textbelt API configured: ${!!config.textbelt.apiKey}`);
  }
  
  console.log(`Demo numbers configured: ${config.demoNumbers.length}`);
  if (config.demoNumbers.length > 0) {
    config.demoNumbers.forEach((num, i) => {
      console.log(`  ${i + 1}. ${num}`);
    });
  }
  
  console.log('='.repeat(60));
  console.log('Endpoints:');
  console.log(`  GET  /health     - Health check`);
  console.log(`  POST /sos        - Emergency SOS alert`);
  console.log(`  POST /api/sos    - Alternative SOS endpoint`);
  console.log('='.repeat(60));
  
  if (config.demoNumbers.length === 0) {
    console.log('⚠ WARNING: No demo numbers configured!');
    console.log('   Add DEMO_NUMBER_1 and DEMO_NUMBER_2 to .env file');
  }
  
  if (config.provider === 'whatsapp' && (!config.whatsapp.accessToken || !config.whatsapp.phoneId)) {
    console.log('⚠ WARNING: WhatsApp not fully configured!');
    console.log('   Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_ID in .env');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
