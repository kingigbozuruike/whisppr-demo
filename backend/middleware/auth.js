/**
 * Authentication & Rate Limiting Middleware
 */

const rateLimit = require('express-rate-limit');

/**
 * API Key Authentication
 * Validates X-API-Key header against WHISPPR_API_KEY env var
 */
function authenticateAPI(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'API key required in X-API-Key header'
    });
  }
  
  if (apiKey !== process.env.WHISPPR_API_KEY) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid API key'
    });
  }
  
  next();
}

/**
 * Rate Limiter for SOS Creation
 * Max 5 SOS sessions per user per hour
 */
const sosCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyGenerator: (req) => {
    // Use phone number for rate limiting
    return req.body.phoneNumber || 'unknown';
  },
  skipFailedRequests: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'RateLimitExceeded',
      message: 'Maximum 5 SOS sessions per user per hour',
      retryAfter: 3600
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false  // Disable validation for custom keyGenerator
});

/**
 * Rate Limiter for Location Updates
 * Max 2 updates per second per session
 */
const locationUpdateLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 2,
  keyGenerator: (req) => {
    return `location:${req.params.shortId || 'unknown'}`;
  },
  skipFailedRequests: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'RateLimitExceeded',
      message: 'Maximum 2 location updates per second',
      retryAfter: 1
    });
  },
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false  // Disable validation for custom keyGenerator
});

module.exports = {
  authenticateAPI,
  sosCreationLimiter,
  locationUpdateLimiter
};
