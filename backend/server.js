/**
 * Whisppr Emergency SOS Backend
 * Supports SMS (Textbelt/Twilio) and WhatsApp messaging
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  // Messaging provider: 'textbelt', 'twilio', or 'whatsapp'
  provider: process.env.SMS_PROVIDER || 'whatsapp', // Default to WhatsApp
  
  textbelt: {
    apiKey: process.env.TEXTBELT_API_KEY || '40a3b99250b28aa1ecd3ee7fb37ec7a31bdc442dIcJZydgXa4mz5YKqmKbd8PElr',
    apiUrl: 'https://textbelt.com/text',
  },
  
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
    process.env.DEMO_NUMBER_1 || '+12345678901',
    process.env.DEMO_NUMBER_2 || null,
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
const formatSMSMessage = (name, lat, lng, platform) => {
  // Note: URLs removed - Textbelt requires verification to send URLs
  // Whitelist your key at: https://textbelt.com/whitelist
  
  return `[Whisppr DEMO] ${name} may need help.
Location: ${lat}, ${lng}
Platform: ${platform || 'mobile-app'}

Emergency alert. Search coordinates in maps.`;
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
const sendBatchWhatsApp = async (name, lat, lng, platform) => {
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
  
  const alertMessage = `🚨 EMERGENCY ALERT

${name} may need help!

Platform: ${platform || 'mobile-app'}
Time: ${timestamp}

A location pin will follow.`;

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
const sendAlerts = async (name, lat, lng, platform) => {
  if (config.provider === 'whatsapp') {
    return await sendBatchWhatsApp(name, lat, lng, platform);
  } else {
    // SMS (Textbelt/Twilio)
    const message = formatSMSMessage(name, lat, lng, platform);
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
 *   "platform": "expo-demo"
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
      platform 
    } = req.body;
    
    // Use lat/lng or latitude/longitude
    const finalLat = lat || latitude;
    const finalLng = lng || longitude;
    const finalName = name || 'Someone';
    
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
    
    // Return success immediately (fast response)
    const responseTime = Date.now() - startTime;
    res.json({
      status: 'ok',
      message: 'SOS alert initiated',
      recipients: config.demoNumbers.length,
      provider: config.provider,
      responseTime: responseTime,
    });
    
    // Send alerts asynchronously (non-blocking)
    sendAlerts(finalName, parsedLat, parsedLng, platform)
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
// SERVER START
// ============================================================================

app.listen(PORT, () => {
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
