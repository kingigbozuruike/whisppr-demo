/**
 * Background Job: Expire Old SOS Sessions
 * Runs every 5 minutes to mark expired sessions and notify watchers
 */

const cron = require('node-cron');
const sosService = require('../db/sosService');
const prisma = require('../db/prisma');

/**
 * Start the expiry background job
 * @param {SocketIO.Server} io - Socket.IO instance for broadcasting
 */
function startExpiryJob(io) {
  console.log('[CRON] Starting session expiry job (runs every 5 minutes)');
  
  // Run every 5 minutes: */5 * * * *
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('[CRON] Running session expiry check...');
      
      // Find sessions that need to be expired
      const sessionsToExpire = await prisma.sosSession.findMany({
        where: {
          status: 'active',
          expiresAt: {
            lt: new Date()
          }
        },
        select: {
          id: true,
          shortId: true,
          expiresAt: true,
          user: {
            select: {
              displayName: true
            }
          }
        }
      });
      
      if (sessionsToExpire.length === 0) {
        console.log('[CRON] No sessions to expire');
        return;
      }
      
      console.log(`[CRON] Found ${sessionsToExpire.length} sessions to expire`);
      
      // Expire each session
      for (const session of sessionsToExpire) {
        try {
          // Update status to expired
          await prisma.sosSession.update({
            where: { id: session.id },
            data: {
              status: 'expired',
              updatedAt: new Date()
            }
          });
          
          console.log(`[CRON] Expired session: ${session.shortId} (${session.user.displayName})`);
          
          // Broadcast expiry to all watchers
          if (io) {
            io.to(session.shortId).emit('session_status', {
              type: 'session_status',
              shortId: session.shortId,
              status: 'expired',
              expiredAt: session.expiresAt,
              message: 'This SOS session has expired after 4 hours'
            });
            
            // Get all sockets in this room and make them leave
            const sockets = await io.in(session.shortId).fetchSockets();
            for (const socket of sockets) {
              socket.leave(session.shortId);
            }
            
            console.log(`[CRON] Notified ${sockets.length} watchers of expiry: ${session.shortId}`);
          }
          
        } catch (error) {
          console.error(`[CRON] Error expiring session ${session.shortId}:`, error);
        }
      }
      
      console.log(`[CRON] Expired ${sessionsToExpire.length} sessions`);
      
    } catch (error) {
      console.error('[CRON] Expiry job error:', error);
    }
  });
  
  console.log('[CRON] Expiry job scheduled ✓');
}

/**
 * Cleanup old session data (run daily)
 * Archives sessions older than 30 days
 */
function startCleanupJob() {
  console.log('[CRON] Starting data cleanup job (runs daily at 2 AM)');
  
  // Run daily at 2:00 AM: 0 2 * * *
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('[CRON] Running data cleanup...');
      
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // Find old sessions to archive
      const oldSessions = await prisma.sosSession.findMany({
        where: {
          status: { in: ['resolved', 'expired', 'cancelled'] },
          updatedAt: { lt: thirtyDaysAgo }
        },
        select: {
          id: true,
          shortId: true,
          updatedAt: true
        }
      });
      
      if (oldSessions.length === 0) {
        console.log('[CRON] No old sessions to clean up');
        return;
      }
      
      console.log(`[CRON] Found ${oldSessions.length} old sessions to delete`);
      
      // Delete old sessions (cascade will delete locations automatically)
      const result = await prisma.sosSession.deleteMany({
        where: {
          id: { in: oldSessions.map(s => s.id) }
        }
      });
      
      console.log(`[CRON] Deleted ${result.count} old sessions`);
      
    } catch (error) {
      console.error('[CRON] Cleanup job error:', error);
    }
  });
  
  console.log('[CRON] Cleanup job scheduled ✓');
}

module.exports = {
  startExpiryJob,
  startCleanupJob
};
