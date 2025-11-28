/**
 * Test script for SOS database operations
 * Run with: node test-db.js
 */

require('dotenv').config();
const sosService = require('./db/sosService');

async function testDatabase() {
  console.log('🧪 Testing Whisppr SOS Database...\n');
  
  try {
    // Test 1: Create a user
    console.log('1️⃣  Creating test user...');
    const user = await sosService.getOrCreateUser('+17135848950', 'John Doe');
    console.log('✅ User created:', user.id, '-', user.displayName);
    
    // Test 2: Create an SOS session
    console.log('\n2️⃣  Creating SOS session...');
    const session = await sosService.createSosSession({
      userId: user.id,
      lat: 40.7128,
      lng: -74.0060,
      platform: 'ios',
      deviceInfo: 'iPhone 15 Pro, iOS 17.2',
      expiryHours: 4
    });
    console.log('✅ Session created:', session.shortId);
    console.log('   URL: https://maps.whisppr.com/sos/' + session.shortId);
    console.log('   Initial location:', session.initialLat, session.initialLng);
    console.log('   Expires at:', session.expiresAt);
    
    // Test 3: Update location (simulate movement)
    console.log('\n3️⃣  Simulating location updates...');
    const updates = [
      { lat: 40.7130, lng: -74.0062, batteryLevel: 85, isMoving: true, speed: 2.5 },
      { lat: 40.7133, lng: -74.0065, batteryLevel: 84, isMoving: true, speed: 3.1 },
      { lat: 40.7135, lng: -74.0068, batteryLevel: 84, isMoving: false, speed: 0.0 }
    ];
    
    for (let i = 0; i < updates.length; i++) {
      await sosService.updateLocation({
        sessionId: session.id,
        ...updates[i],
        accuracy: 8.5,
        heading: 45
      });
      console.log(`   ✅ Update ${i + 1}:`, updates[i].lat, updates[i].lng, 
                  `(battery: ${updates[i].batteryLevel}%)`);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
    }
    
    // Test 4: Get location history
    console.log('\n4️⃣  Fetching location history...');
    const history = await sosService.getLocationHistory(session.id);
    console.log('✅ Retrieved', history.length, 'locations');
    console.log('   Latest location:', history[0].lat, history[0].lng, 
                'at', history[0].timestamp);
    
    // Test 5: Get session by short ID (like map page would)
    console.log('\n5️⃣  Loading session by short ID...');
    const loadedSession = await sosService.getSessionByShortId(session.shortId);
    console.log('✅ Session loaded:', loadedSession.shortId);
    console.log('   User:', loadedSession.user.displayName);
    console.log('   Current location:', loadedSession.lastLat, loadedSession.lastLng);
    console.log('   Status:', loadedSession.status);
    
    // Test 6: Get session statistics
    console.log('\n6️⃣  Fetching session statistics...');
    const stats = await sosService.getSessionStats(session.id);
    console.log('✅ Session stats:');
    console.log('   Total locations:', stats.locationCount);
    console.log('   Duration:', stats.durationMinutes, 'minutes');
    console.log('   Start:', stats.firstLocation.lat, stats.firstLocation.lng);
    console.log('   End:', stats.lastLocation.lat, stats.lastLocation.lng);
    
    // Test 7: Resolve session
    console.log('\n7️⃣  Resolving SOS session...');
    await sosService.resolveSession(session.id);
    const resolvedSession = await sosService.getSessionByShortId(session.shortId);
    console.log('✅ Session resolved at:', resolvedSession.resolvedAt);
    console.log('   Status:', resolvedSession.status);
    
    console.log('\n✅ All tests passed! Database is working correctly.\n');
    
    // Summary
    console.log('📊 Summary:');
    console.log('   - User ID:', user.id);
    console.log('   - Session ID:', session.id);
    console.log('   - Short ID:', session.shortId);
    console.log('   - Map URL: https://maps.whisppr.com/sos/' + session.shortId);
    console.log('   - Total locations:', stats.locationCount);
    console.log('   - Final status:', resolvedSession.status);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run tests
testDatabase()
  .then(() => {
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
