/**
 * Whisppr Live SOS Maps - Main Server
 * Integrates Express API + Socket.IO WebSocket + Background Jobs
 */

require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Routes and handlers
const sosRoutes = require('./routes/sos');
const { initializeWebSocket } = require('./websocket/handler');
const { startExpiryJob, startCleanupJob } = require('./jobs/expiryJob');

// ============================================================================
// SERVER SETUP
// ============================================================================

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

const PORT = process.env.PORT || 3000;

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Make Socket.IO available to routes
app.set('io', io);

// ============================================================================
// ROUTES
// ============================================================================

// API routes
app.use('/api', sosRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Whisppr Live SOS Maps API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /api/health',
      createSOS: 'POST /api/sos',
      updateLocation: 'POST /api/sos/:shortId/location',
      getSession: 'GET /api/sos/:shortId',
      updateStatus: 'PUT /api/sos/:shortId/status'
    },
    websocket: {
      url: `ws://localhost:${PORT}`,
      protocol: 'Socket.IO',
      events: ['subscribe', 'unsubscribe', 'location_update', 'session_status']
    },
    documentation: '/api/docs'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'NotFound',
    message: 'Endpoint not found',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({
    success: false,
    error: 'InternalError',
    message: err.message || 'Internal server error'
  });
});

// ============================================================================
// WEBSOCKET SETUP
// ============================================================================

initializeWebSocket(io);

// ============================================================================
// BACKGROUND JOBS
// ============================================================================

startExpiryJob(io);
startCleanupJob();

// ============================================================================
// START SERVER
// ============================================================================

httpServer.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🚨 Whisppr Live SOS Maps - Server Running');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  📍 HTTP Server:    http://localhost:${PORT}`);
  console.log(`  🔌 WebSocket:      ws://localhost:${PORT}`);
  console.log(`  📊 Health Check:   http://localhost:${PORT}/api/health`);
  console.log('');
  console.log('  API Endpoints:');
  console.log(`    POST   /api/sos`);
  console.log(`    POST   /api/sos/:shortId/location`);
  console.log(`    GET    /api/sos/:shortId`);
  console.log(`    PUT    /api/sos/:shortId/status`);
  console.log('');
  console.log('  WebSocket Events:');
  console.log(`    subscribe         → Join SOS session room`);
  console.log(`    location_update   ← Real-time location broadcasts`);
  console.log(`    session_status    ← Status changes (resolved/expired)`);
  console.log('');
  console.log('  Background Jobs:');
  console.log(`    ⏰ Expiry check:   Every 5 minutes`);
  console.log(`    🧹 Cleanup:        Daily at 2 AM`);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, httpServer, io };
