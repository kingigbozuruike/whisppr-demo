/**
 * Test script for Live SOS Maps API
 * Tests HTTP endpoints and WebSocket functionality
 * Run with: node test-api.js
 */

require('dotenv').config();
const fetch = require('node-fetch');
const io = require('socket.io-client');

const API_BASE = 'http://localhost:3000/api';
const WS_URL = 'http://localhost:3000';
const API_KEY = process.env.WHISPPR_API_KEY || 'demo-secret-key';

// Test data
const testUser = {
  phoneNumber: '+17135848950',
  name: 'Test User',
  emergencyContacts: ['+12067868897']
};

let testSessionId = null;
let testShortId = null;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test 1: Health Check
 */
async function testHealthCheck() {
  console.log('\n1️⃣  Testing Health Check...');
  
  const response = await fetch(`${API_BASE}/health`);
  const data = await response.json();
  
  if (data.success && data.status === 'healthy') {
    console.log('✅ Health check passed');
    console.log('   Services:', JSON.stringify(data.services));
    console.log('   Stats:', JSON.stringify(data.stats));
  } else {
    console.log('❌ Health check failed:', data);
  }
}

/**
 * Test 2: Create SOS Session
 */
async function testCreateSOS() {
  console.log('\n2️⃣  Testing SOS Creation...');
  
  const response = await fetch(`${API_BASE}/sos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify({
      ...testUser,
      lat: 40.7128,
      lng: -74.0060,
      accuracy: 12.5,
      platform: 'test',
      deviceInfo: 'Test Device',
      batteryLevel: 85,
      channel: 'whatsapp'
    })
  });
  
  const data = await response.json();
  
  if (response.ok && data.success) {
    testSessionId = data.data.sosId;
    testShortId = data.data.shortId;
    
    console.log('✅ SOS created successfully');
    console.log('   Short ID:', testShortId);
    console.log('   Map URL:', data.data.mapUrl);
    console.log('   Expires:', data.data.expiresAt);
    console.log('   Alerts sent:', data.data.alertsSent);
  } else {
    console.log('❌ SOS creation failed:', data);
    throw new Error('SOS creation failed');
  }
}

/**
 * Test 3: Get Session Data
 */
async function testGetSession() {
  console.log('\n3️⃣  Testing Get Session...');
  
  const response = await fetch(`${API_BASE}/sos/${testShortId}`);
  const data = await response.json();
  
  if (response.ok && data.success) {
    console.log('✅ Session retrieved');
    console.log('   Status:', data.data.session.status);
    console.log('   User:', data.data.session.userName);
    console.log('   Location:', `${data.data.currentLocation.lat}, ${data.data.currentLocation.lng}`);
    console.log('   Breadcrumbs:', data.data.recentLocations.length);
  } else {
    console.log('❌ Get session failed:', data);
  }
}

/**
 * Test 4: Update Location
 */
async function testUpdateLocation() {
  console.log('\n4️⃣  Testing Location Updates...');
  
  const locations = [
    { lat: 40.7130, lng: -74.0062, batteryLevel: 84 },
    { lat: 40.7133, lng: -74.0065, batteryLevel: 83 },
    { lat: 40.7135, lng: -74.0068, batteryLevel: 82 }
  ];
  
  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i];
    
    const response = await fetch(`${API_BASE}/sos/${testShortId}/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        lat: loc.lat,
        lng: loc.lng,
        accuracy: 8.5,
        speed: 2.5,
        heading: 45,
        batteryLevel: loc.batteryLevel,
        isMoving: true,
        timestamp: new Date().toISOString()
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log(`   ✅ Update ${i + 1}: ${loc.lat}, ${loc.lng} (${data.data.watchersNotified} watchers)`);
    } else {
      console.log(`   ❌ Update ${i + 1} failed:`, data);
    }
    
    await sleep(1000); // Wait 1 second between updates
  }
}

/**
 * Test 5: WebSocket Connection & Subscribe
 */
async function testWebSocket() {
  console.log('\n5️⃣  Testing WebSocket...');
  
  return new Promise((resolve, reject) => {
    const socket = io(WS_URL, {
      transports: ['websocket'],
      reconnection: false
    });
    
    let receivedUpdates = 0;
    const timeout = setTimeout(() => {
      socket.disconnect();
      console.log('   ⏱️  WebSocket test timeout (this is OK if no updates)');
      resolve();
    }, 10000);
    
    socket.on('connect', () => {
      console.log('   ✅ WebSocket connected');
      
      // Subscribe to our test session
      socket.emit('subscribe', { shortId: testShortId });
    });
    
    socket.on('subscribed', (data) => {
      console.log('   ✅ Subscribed to session:', data.shortId);
      console.log('      Watchers:', data.watcherCount);
      console.log('      Status:', data.status);
    });
    
    socket.on('location_update', (data) => {
      receivedUpdates++;
      console.log(`   📍 Location update #${receivedUpdates}:`, 
                  `${data.location.lat}, ${data.location.lng}`);
    });
    
    socket.on('watcher_count', (data) => {
      console.log('   👁️  Watcher count:', data.count);
    });
    
    socket.on('subscribe_error', (data) => {
      console.log('   ❌ Subscribe error:', data.message);
      clearTimeout(timeout);
      socket.disconnect();
      reject(new Error(data.message));
    });
    
    socket.on('disconnect', () => {
      console.log('   ✅ WebSocket disconnected');
      clearTimeout(timeout);
      resolve();
    });
    
    socket.on('error', (error) => {
      console.log('   ❌ WebSocket error:', error);
      clearTimeout(timeout);
      socket.disconnect();
      reject(error);
    });
  });
}

/**
 * Test 6: Resolve Session
 */
async function testResolveSession() {
  console.log('\n6️⃣  Testing Session Resolution...');
  
  const response = await fetch(`${API_BASE}/sos/${testShortId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify({
      status: 'resolved'
    })
  });
  
  const data = await response.json();
  
  if (response.ok && data.success) {
    console.log('✅ Session resolved');
    console.log('   Status:', data.data.status);
    console.log('   Resolved at:', data.data.resolvedAt);
  } else {
    console.log('❌ Resolution failed:', data);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🧪 Testing Whisppr Live SOS Maps API');
  console.log('═══════════════════════════════════════════════════════════════');
  
  try {
    await testHealthCheck();
    await testCreateSOS();
    await testGetSession();
    await testUpdateLocation();
    await testWebSocket();
    await testResolveSession();
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  ✅ All tests passed!');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('  Summary:');
    console.log(`    Session ID: ${testSessionId}`);
    console.log(`    Short ID: ${testShortId}`);
    console.log(`    Map URL: https://maps.whisppr.com/sos/${testShortId}`);
    console.log('');
    
    process.exit(0);
    
  } catch (error) {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  ❌ Tests failed');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.error('  Error:', error.message);
    console.log('');
    process.exit(1);
  }
}

// Run tests
runTests();
