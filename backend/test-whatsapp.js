#!/usr/bin/env node

/**
 * WhatsApp Business API Test Script
 * Tests WhatsApp message sending via Meta Cloud API
 */

require('dotenv').config();
const fetch = require('node-fetch');

// WhatsApp Configuration
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || 'EAAMR3vC9MtgBQNqWlYdjtmIHDbHDxnJltTR6Hl8zBn3dz8XwylyBv6OkiK09CjkSpjZAMZCE1LVdlh8yfDvaglroTCU3yLdCrtLqZC9XdWCGHkCUekdigBtN4rkivgkGFcvk0DuSL83KqwzguuYViqbA8wwMWaK1UV3ZCZAs94AfFgNpmBqmcVazXhUOzfJ4TL7HNQHSMiEzin3aT8k6z3MMa5YMU87ZCLMf19';
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '945745355270275';
const WHATSAPP_BUSINESS_ID = process.env.WHATSAPP_BUSINESS_ID || '814915841446419';

// Test phone numbers (WhatsApp format: no + sign, just digits)
const TEST_NUMBERS = [
  process.env.DEMO_NUMBER_1 ? process.env.DEMO_NUMBER_1.replace('+', '') : '17135848950',
  process.env.DEMO_NUMBER_2 ? process.env.DEMO_NUMBER_2.replace('+', '') : null,
].filter(num => num); // Remove null values


// WhatsApp API endpoint
const WHATSAPP_API_URL = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID}/messages`;

console.log('═'.repeat(60));
console.log('🧪 WHATSAPP BUSINESS API TEST SCRIPT');
console.log('═'.repeat(60));
console.log('');

console.log('📋 Configuration Check:');
console.log(`  Access Token: ${WHATSAPP_ACCESS_TOKEN.substring(0, 20)}...`);
console.log(`  Phone Number ID: ${WHATSAPP_PHONE_ID}`);
console.log(`  Business Account ID: ${WHATSAPP_BUSINESS_ID}`);
console.log(`  Test Numbers: ${TEST_NUMBERS.map(n => `+${n}`).join(', ')}`);
console.log(`  Recipients: ${TEST_NUMBERS.length}`);
console.log(`  API Endpoint: ${WHATSAPP_API_URL}`);
console.log('');

/**
 * Send message to a single recipient
 */
async function sendMessage(phoneNumber, message, type = 'text', locationData = null) {
  const payload = {
    messaging_product: 'whatsapp',
    to: phoneNumber,
    type: type,
  };

  if (type === 'text') {
    payload.text = { body: message };
  } else if (type === 'location' && locationData) {
    payload.location = locationData;
  }

  const response = await fetch(WHATSAPP_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return response.json();
}

/**
 * Test 1: Send emergency alert text to all recipients
 */
async function test1_SendTextMessage() {
  console.log('━'.repeat(60));
  console.log('TEST 1: Send Emergency Alert Text');
  console.log('━'.repeat(60));
  console.log('');
  
  // Simulate real data from the app
  const userName = 'King';
  const platform = 'iOS';
  const timestamp = new Date().toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });
  
  const message = `🚨 EMERGENCY ALERT

${userName} may need help!

Platform: ${platform}
Time: ${timestamp}

A location pin will follow.`;

  console.log('📱 Message to send:');
  console.log('─'.repeat(60));
  console.log(message);
  console.log('─'.repeat(60));
  console.log('');
  
  console.log(`📤 Sending to ${TEST_NUMBERS.length} recipient(s)...`);
  console.log('');
  
  const results = [];
  
  for (const phoneNumber of TEST_NUMBERS) {
    console.log(`  → Sending to +${phoneNumber}...`);
    
    try {
      const startTime = Date.now();
      const data = await sendMessage(phoneNumber, message, 'text');
      const elapsed = Date.now() - startTime;
      
      if (data.messages && data.messages[0]) {
        console.log(`    ✓ Delivered (${elapsed}ms) - Message ID: ${data.messages[0].id.substring(0, 20)}...`);
        results.push({ success: true, phone: phoneNumber, data, elapsed });
      } else if (data.error) {
        console.log(`    ✗ Failed: ${data.error.message}`);
        results.push({ success: false, phone: phoneNumber, error: data.error });
      }
    } catch (error) {
      console.log(`    ✗ Error: ${error.message}`);
      results.push({ success: false, phone: phoneNumber, error });
    }
  }
  
  console.log('');
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ Alert sent to ${successCount}/${TEST_NUMBERS.length} recipient(s)`);
  console.log('');
  
  return { 
    success: successCount > 0, 
    results,
    totalSent: successCount,
    totalFailed: TEST_NUMBERS.length - successCount
  };
    
    console.log('📥 Response:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');
    console.log(`⏱️  Time: ${elapsed}ms`);
}

/**
 * Test 2: Send interactive location pin to all recipients
 */
async function test2_SendLocationMessage() {
  console.log('━'.repeat(60));
  console.log('TEST 2: Send Interactive Location Pin');
  console.log('━'.repeat(60));
  console.log('');
  
  // Real coordinates - Monroe, Louisiana area
  const testCoords = { lat: 32.5093, lng: -92.1193 };
  const userName = 'King';
  
  console.log('📍 Location to send:');
  console.log(`  Latitude: ${testCoords.lat}`);
  console.log(`  Longitude: ${testCoords.lng}`);
  console.log('');
  
  const locationData = {
    latitude: testCoords.lat,
    longitude: testCoords.lng,
    name: `${userName}'s Emergency Location`,
    address: 'Tap to open in maps and get directions'
  };
  
  console.log(`📤 Sending location pin to ${TEST_NUMBERS.length} recipient(s)...`);
  console.log('');
  
  const results = [];
  
  for (const phoneNumber of TEST_NUMBERS) {
    console.log(`  → Sending to +${phoneNumber}...`);
    
    try {
      const startTime = Date.now();
      const data = await sendMessage(phoneNumber, null, 'location', locationData);
      const elapsed = Date.now() - startTime;
      
      if (data.messages && data.messages[0]) {
        console.log(`    ✓ Delivered (${elapsed}ms) - Message ID: ${data.messages[0].id.substring(0, 20)}...`);
        results.push({ success: true, phone: phoneNumber, data, elapsed });
      } else if (data.error) {
        console.log(`    ✗ Failed: ${data.error.message}`);
        results.push({ success: false, phone: phoneNumber, error: data.error });
      }
    } catch (error) {
      console.log(`    ✗ Error: ${error.message}`);
      results.push({ success: false, phone: phoneNumber, error });
    }
  }
  
  console.log('');
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ Location sent to ${successCount}/${TEST_NUMBERS.length} recipient(s)`);
  console.log('');
  
  if (successCount > 0) {
    console.log('📱 Location pin is interactive:');
    console.log('   • Tap to view in WhatsApp map');
    console.log('   • Tap again to open in Google/Apple Maps');
    console.log('   • Get directions instantly');
    console.log('');
  }
  
  return { 
    success: successCount > 0, 
    results,
    totalSent: successCount,
    totalFailed: TEST_NUMBERS.length - successCount
  };
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting WhatsApp emergency alert test...');
  console.log('');
  console.log('💡 This simulates a real emergency alert from the app:');
  console.log('   1. Text message with alert details');
  console.log('   2. Interactive location pin (tap to navigate)');
  console.log('');
  
  const testResults = {
    test1: null,
    test2: null,
  };
  
  // Test 1: Emergency alert text
  testResults.test1 = await test1_SendTextMessage();
  
  if (!testResults.test1.success) {
    console.log('⚠️  First message failed, skipping location pin');
    console.log('');
  } else {
    // Wait 2 seconds before sending location (like real app)
    console.log('⏳ Waiting 2 seconds before sending location...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Location pin
    testResults.test2 = await test2_SendLocationMessage();
  }
  
  // Summary
  console.log('');
  console.log('═'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log('');
  
  // Calculate totals
  const alertsSent = testResults.test1 ? testResults.test1.totalSent : 0;
  const alertsFailed = testResults.test1 ? testResults.test1.totalFailed : 0;
  const locationsSent = testResults.test2 ? testResults.test2.totalSent : 0;
  const locationsFailed = testResults.test2 ? testResults.test2.totalFailed : 0;
  
  console.log(`Emergency Alert Text:  ${alertsSent}/${TEST_NUMBERS.length} ${testResults.test1 && testResults.test1.success ? '✅ DELIVERED' : '❌ FAILED'}`);
  console.log(`Location Pin:          ${locationsSent}/${TEST_NUMBERS.length} ${testResults.test2 ? (testResults.test2.success ? '✅ DELIVERED' : '❌ FAILED') : '⏭️  SKIPPED'}`);
  console.log('');
  console.log(`Total Messages Sent:   ${alertsSent + locationsSent}/${TEST_NUMBERS.length * 2}`);
  console.log(`Recipients Reached:    ${TEST_NUMBERS.length}`);
  console.log('');
  
  const allPassed = testResults.test1.success && testResults.test2 && testResults.test2.success;
  
  if (allPassed) {
    console.log('✅ WHATSAPP EMERGENCY ALERTS WORKING!');
    console.log('');
    console.log(`📱 Check WhatsApp on ${TEST_NUMBERS.length} device(s) - you should see:`);
    console.log('   1. 🚨 Emergency alert message');
    console.log('   2. 📍 Interactive location pin');
    console.log('');
    console.log('🎯 Location pin features:');
    console.log('   • Tap to view on map');
    console.log('   • Tap again to open in Google/Apple Maps');
    console.log('   • Get instant directions');
    console.log('   • Share with others');
    console.log('');
    console.log('💰 WhatsApp Benefits vs SMS:');
    console.log('   ✅ First 1,000 messages/month FREE');
    console.log('   ✅ Rich location pins (not just text coordinates)');
    console.log('   ✅ Read receipts & delivery status');
    console.log('   ✅ Better engagement');
    console.log('');
    console.log('📊 This test sent:');
    console.log(`   • ${alertsSent} emergency alert(s)`);
    console.log(`   • ${locationsSent} location pin(s)`);
    console.log(`   • Total: ${alertsSent + locationsSent} messages`);
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('   1. Verify you received both messages');
    console.log('   2. Test the location pin (tap to open maps)');
    console.log('   3. I can integrate this into server.js');
    console.log('');
  } else if (testResults.test1.success) {
    console.log('⚠️  PARTIAL SUCCESS');
    console.log('');
    console.log('Emergency alert sent, but location pin failed.');
    console.log('Check the error messages above for details.');
    console.log('');
  } else {
    console.log('❌ TESTS FAILED');
    console.log('');
    console.log('🔧 Common Issues:');
    console.log('   1. You need to message the business number first');
    console.log('      → Open WhatsApp and send "Hi" to +15551489678');
    console.log('      → Then run this test again');
    console.log('');
    console.log('   2. Phone number not verified');
    console.log('      → Check Facebook Developer Portal');
    console.log('      → Complete phone verification');
    console.log('');
    console.log('   3. Token expired or invalid');
    console.log('      → Generate new token in Developer Portal');
    console.log('');
    console.log('💡 Run diagnose-whatsapp.js for detailed diagnostics');
  }
  
  console.log('');
  console.log('═'.repeat(60));
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
