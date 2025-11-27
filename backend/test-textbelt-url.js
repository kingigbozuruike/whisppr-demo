#!/usr/bin/env node

/**
 * Textbelt URL Test Script
 * Tests if Textbelt can send URLs (requires verified account)
 */

require('dotenv').config();
const fetch = require('node-fetch');

// Configuration
const TEXTBELT_API_KEY = process.env.TEXTBELT_API_KEY || 'textbelt';
const TEST_NUMBER = process.env.DEMO_NUMBER_1 || '+17135848950';

console.log('═'.repeat(60));
console.log('🧪 TEXTBELT URL TEST SCRIPT');
console.log('═'.repeat(60));
console.log('');

console.log('📋 Configuration:');
console.log(`  API Key: ${TEXTBELT_API_KEY.substring(0, 10)}...`);
console.log(`  Test Number: ${TEST_NUMBER}`);
console.log('');

/**
 * Test 1: Send SMS with Google Maps URL
 */
async function testTextbeltWithURL() {
  console.log('━'.repeat(60));
  console.log('TEST: Send SMS with Google Maps URL');
  console.log('━'.repeat(60));
  console.log('');
  
  const testCoords = { lat: 32.52, lng: -92.63 };
  const googleMapsUrl = `https://maps.google.com/?q=${testCoords.lat},${testCoords.lng}`;
  
  const message = `[Whisppr TEST] King may need help.
Location: ${googleMapsUrl}
Platform: textbelt-url-test

This is a test emergency alert with Google Maps link.`;

  console.log('📱 Message to send:');
  console.log('─'.repeat(60));
  console.log(message);
  console.log('─'.repeat(60));
  console.log('');
  
  console.log(`📤 Sending to ${TEST_NUMBER} via Textbelt...`);
  console.log('');
  
  try {
    const startTime = Date.now();
    
    const response = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: TEST_NUMBER,
        message: message,
        key: TEXTBELT_API_KEY,
      }),
    });
    
    const elapsed = Date.now() - startTime;
    const data = await response.json();
    
    console.log('📥 Response received:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');
    console.log(`⏱️  Time: ${elapsed}ms`);
    console.log('');
    
    if (data.success) {
      console.log('✅ SMS SENT SUCCESSFULLY!');
      console.log(`  Text ID: ${data.textId}`);
      console.log(`  Quota Remaining: ${data.quotaRemaining}`);
      console.log('');
      console.log('📱 Check your phone for SMS with Google Maps URL!');
      console.log('');
      console.log('🎉 RESULT: Textbelt CAN send URLs with your account!');
      console.log('   Your account appears to be verified.');
      
      return { success: true, data };
    } else {
      console.log('❌ SMS FAILED');
      console.log(`  Error: ${data.error}`);
      console.log('');
      
      // Check if it's the URL restriction error
      if (data.error && data.error.includes('URL')) {
        console.log('🚫 RESULT: Textbelt blocks URLs on your account');
        console.log('   Your account is not verified for URL sending.');
        console.log('');
        console.log('💡 Options:');
        console.log('   1. Contact Textbelt to verify your account');
        console.log('   2. Use Twilio instead (already tested and working!)');
        console.log('   3. Send coordinates only without URLs');
      } else {
        console.log('⚠️  Different error - not related to URLs');
      }
      
      return { success: false, data };
    }
  } catch (error) {
    console.error('❌ Request failed');
    console.error(`  Error: ${error.message}`);
    console.log('');
    
    return { success: false, error };
  }
}

/**
 * Test 2: Send SMS without URL (control test)
 */
async function testTextbeltWithoutURL() {
  console.log('');
  console.log('━'.repeat(60));
  console.log('CONTROL TEST: Send SMS without URL');
  console.log('━'.repeat(60));
  console.log('');
  
  const testCoords = { lat: 32.52, lng: -92.63 };
  
  const message = `[Whisppr TEST] King may need help.
Location: ${testCoords.lat}, ${testCoords.lng}
Platform: textbelt-control-test

Emergency alert. Search coordinates in maps.`;

  console.log('📱 Message to send (no URL):');
  console.log('─'.repeat(60));
  console.log(message);
  console.log('─'.repeat(60));
  console.log('');
  
  console.log(`📤 Sending to ${TEST_NUMBER} via Textbelt...`);
  console.log('');
  
  try {
    const startTime = Date.now();
    
    const response = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: TEST_NUMBER,
        message: message,
        key: TEXTBELT_API_KEY,
      }),
    });
    
    const elapsed = Date.now() - startTime;
    const data = await response.json();
    
    console.log('📥 Response received:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');
    console.log(`⏱️  Time: ${elapsed}ms`);
    console.log('');
    
    if (data.success) {
      console.log('✅ Control test passed - SMS without URL works');
      console.log(`  Quota Remaining: ${data.quotaRemaining}`);
      console.log('');
      
      return { success: true, data };
    } else {
      console.log('❌ Control test failed');
      console.log(`  Error: ${data.error}`);
      console.log('');
      
      return { success: false, data };
    }
  } catch (error) {
    console.error('❌ Request failed');
    console.error(`  Error: ${error.message}`);
    console.log('');
    
    return { success: false, error };
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Textbelt URL tests...');
  console.log('');
  
  // Test 1: With URL
  const result1 = await testTextbeltWithURL();
  
  // Wait 3 seconds between tests
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test 2: Without URL (control)
  const result2 = await testTextbeltWithoutURL();
  
  // Summary
  console.log('');
  console.log('═'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log('');
  console.log(`Test 1 (with URL):     ${result1.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Test 2 (without URL):  ${result2.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('');
  
  if (result1.success && result2.success) {
    console.log('🎉 EXCELLENT NEWS!');
    console.log('   Textbelt can send URLs with your account!');
    console.log('');
    console.log('💡 You can use either:');
    console.log('   • Textbelt: $0.01/SMS, quota remaining: ' + result1.data.quotaRemaining);
    console.log('   • Twilio:   $0.0075/SMS + $1/month, unlimited');
    console.log('');
    console.log('🎯 Recommendation: Stick with Textbelt if quota is enough,');
    console.log('   or switch to Twilio for unlimited sends.');
  } else if (!result1.success && result2.success) {
    console.log('⚠️  TEXTBELT BLOCKS URLS');
    console.log('   URLs are restricted on your account.');
    console.log('');
    console.log('💡 Your options:');
    console.log('   1. Contact Textbelt to verify account for URLs');
    console.log('   2. ✅ Use Twilio (already tested, URLs work!)');
    console.log('   3. Keep using coordinates without URLs');
    console.log('');
    console.log('🎯 Recommendation: Switch to Twilio');
    console.log('   (I can update server.js for you)');
  } else {
    console.log('❌ BOTH TESTS FAILED');
    console.log('   There may be an issue with your Textbelt account.');
    console.log('');
    console.log('🎯 Recommendation: Use Twilio instead');
  }
  
  console.log('');
  console.log('═'.repeat(60));
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
