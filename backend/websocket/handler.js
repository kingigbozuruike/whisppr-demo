/**
 * WebSocket Handler for Real-Time SOS Updates
 * Uses Socket.IO for room-based broadcasting
 */

const sosService = require('../db/sosService');

/**
 * Initialize WebSocket handlers
 * @param {SocketIO.Server} io - Socket.IO server instance
 */
function initializeWebSocket(io) {
  // Connection rate limiting (per IP)
  const connectionCounts = new Map();
  
  io.on('connection', (socket) => {
    const ip = socket.handshake.address;
    console.log(`[WS] Client connected: ${socket.id} from ${ip}`);
    
    // Rate limit connections per IP
    const count = connectionCounts.get(ip) || 0;
    if (count >= 10) {
      console.warn(`[WS] Too many connections from ${ip}`);
      socket.emit('error', {
        type: 'error',
        code: 'TooManyConnections',
        message: 'Maximum connections per IP exceeded'
      });
      socket.disconnect(true);
      return;
    }
    connectionCounts.set(ip, count + 1);
    
    // Clean up connection count on disconnect
    socket.on('disconnect', () => {
      const currentCount = connectionCounts.get(ip) || 0;
      if (currentCount > 0) {
        connectionCounts.set(ip, currentCount - 1);
      }
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
    
    /**
     * Subscribe to SOS session updates
     */
    socket.on('subscribe', async ({ shortId }) => {
      try {
        if (!shortId) {
          socket.emit('subscribe_error', {
            type: 'subscribe_error',
            error: 'InvalidRequest',
            message: 'shortId is required'
          });
          return;
        }
        
        console.log(`[WS] Subscribe request: ${socket.id} → ${shortId}`);
        
        // Validate session exists
        const session = await sosService.getSessionByShortId(shortId);
        
        if (!session) {
          socket.emit('subscribe_error', {
            type: 'subscribe_error',
            shortId,
            error: 'SessionNotFound',
            message: 'SOS session not found'
          });
          return;
        }
        
        // Check if expired
        const isExpired = new Date() > new Date(session.expiresAt) || session.status === 'expired';
        if (isExpired) {
          socket.emit('subscribe_error', {
            type: 'subscribe_error',
            shortId,
            error: 'SessionExpired',
            message: 'SOS session has expired',
            expiredAt: session.expiresAt
          });
          return;
        }
        
        // Join Socket.IO room for this session
        socket.join(shortId);
        
        // Get current watcher count
        const watcherCount = io.sockets.adapter.rooms.get(shortId)?.size || 0;
        
        // Send confirmation with current state
        socket.emit('subscribed', {
          type: 'subscribed',
          shortId,
          status: session.status,
          currentLocation: {
            lat: parseFloat(session.lastLat),
            lng: parseFloat(session.lastLng),
            timestamp: session.updatedAt
          },
          expiresAt: session.expiresAt,
          watcherCount
        });
        
        console.log(`[WS] Subscribed: ${socket.id} → ${shortId} (${watcherCount} watchers)`);
        
        // Notify other watchers of new viewer
        socket.to(shortId).emit('watcher_count', {
          type: 'watcher_count',
          shortId,
          count: watcherCount,
          change: 1
        });
        
      } catch (error) {
        console.error('[WS] Subscribe error:', error);
        socket.emit('subscribe_error', {
          type: 'subscribe_error',
          error: 'InternalError',
          message: 'Failed to subscribe to session'
        });
      }
    });
    
    /**
     * Unsubscribe from SOS session
     */
    socket.on('unsubscribe', ({ shortId }) => {
      if (!shortId) return;
      
      console.log(`[WS] Unsubscribe: ${socket.id} ← ${shortId}`);
      
      socket.leave(shortId);
      
      // Update watcher count
      const watcherCount = io.sockets.adapter.rooms.get(shortId)?.size || 0;
      socket.to(shortId).emit('watcher_count', {
        type: 'watcher_count',
        shortId,
        count: watcherCount,
        change: -1
      });
      
      socket.emit('unsubscribed', {
        type: 'unsubscribed',
        shortId
      });
    });
    
    /**
     * Ping/Pong for keepalive
     */
    socket.on('ping', ({ timestamp }) => {
      socket.emit('pong', {
        type: 'pong',
        clientTimestamp: timestamp,
        serverTime: new Date().toISOString()
      });
    });
    
    /**
     * Handle errors
     */
    socket.on('error', (error) => {
      console.error('[WS] Socket error:', error);
    });
  });
  
  // Cleanup old connection counts every 5 minutes
  setInterval(() => {
    connectionCounts.forEach((count, ip) => {
      if (count === 0) {
        connectionCounts.delete(ip);
      }
    });
  }, 5 * 60 * 1000);
  
  console.log('[WS] WebSocket handlers initialized');
}

module.exports = { initializeWebSocket };
