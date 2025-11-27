#!/usr/bin/env node

/**
 * WhatsApp Business API Diagnostic Script
 * Checks account status, permissions, and message delivery
 */

require('dotenv').config();
const fetch = require('node-fetch');

// WhatsApp Configuration
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || 'EAAMR3vC9MtgBQNqWlYdjtmIHDbHDxnJltTR6Hl8zBn3dz8XwylyBv6OkiK09CjkSpjZAMZCE1LVdlh8yfDvaglroTCU3yLdCrtLqZC9XdWCGHkCUekdigBtN4rkivgkGFcvk0DuSL83KqwzguuYViqbA8wwMWaK1UV3ZCZAs94AfFgNpmBqmcVazXhUOzfJ4TL7HNQHSMiEzin3aT8k6z3MMa5YMU87ZCLMf19';
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '945745355270275';
const WHATSAPP_BUSINESS_ID = process.env.WHATSAPP_BUSINESS_ID || '814915841446419';
const TEST_NUMBER = process.env.DEMO_NUMBER_1 ? process.env.DEMO_NUMBER_1.replace('+', '') : '17135848950';

console.log('═'.repeat(70));
console.log('🔍 WHATSAPP BUSINESS API DIAGNOSTIC');
console.log('═'.repeat(70));
console.log('');

/**
 * Check 1: Verify Access Token
 */
async function check1_VerifyToken() {
  console.log('━'.repeat(70));
  console.log('CHECK 1: Verify Access Token');
  console.log('━'.repeat(70));
  console.log('');
  
  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/debug_token?input_token=${WHATSAPP_ACCESS_TOKEN}&access_token=${WHATSAPP_ACCESS_TOKEN}`
    );
    
    const data = await response.json();
    
    if (data.data) {
      console.log('✅ Token Details:');
      console.log(`  App ID: ${data.data.app_id}`);
      console.log(`  Type: ${data.data.type}`);
      console.log(`  Valid: ${data.data.is_valid}`);
      console.log(`  User ID: ${data.data.user_id || 'N/A'}`);
      console.log(`  Issued At: ${data.data.issued_at ? new Date(data.data.issued_at * 1000).toLocaleString() : 'N/A'}`);
      console.log(`  Expires At: ${data.data.expires_at ? new Date(data.data.expires_at * 1000).toLocaleString() : 'Never'}`);
      console.log(`  Data Access Expires: ${data.data.data_access_expires_at ? new Date(data.data.data_access_expires_at * 1000).toLocaleString() : 'N/A'}`);
      
      if (data.data.scopes) {
        console.log(`  Scopes: ${data.data.scopes.join(', ')}`);
      }
      
      console.log('');
      
      if (!data.data.is_valid) {
        console.log('❌ TOKEN IS INVALID!');
        console.log('   Generate a new token from Facebook Developer Portal');
        console.log('');
        return { success: false, reason: 'invalid_token' };
      }
      
      // Check if token is about to expire
      if (data.data.expires_at && data.data.expires_at > 0) {
        const expiresIn = data.data.expires_at - Math.floor(Date.now() / 1000);
        const daysLeft = Math.floor(expiresIn / 86400);
        
        if (daysLeft < 7) {
          console.log(`⚠️  Token expires in ${daysLeft} days - consider refreshing`);
          console.log('');
        }
      }
      
      return { success: true, data };
    } else {
      console.log('❌ Unable to verify token');
      console.log(JSON.stringify(data, null, 2));
      console.log('');
      return { success: false, data };
    }
  } catch (error) {
    console.error('❌ Token verification failed');
    console.error(`  Error: ${error.message}`);
    console.log('');
    return { success: false, error };
  }
}

/**
 * Check 2: Verify Phone Number
 */
async function check2_VerifyPhoneNumber() {
  console.log('━'.repeat(70));
  console.log('CHECK 2: Verify Phone Number Registration');
  console.log('━'.repeat(70));
  console.log('');
  
  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID}?fields=id,verified_name,code_verification_status,display_phone_number,quality_rating,messaging_limit_tier`,
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        },
      }
    );
    
    const data = await response.json();
    
    if (response.ok && data.id) {
      console.log('✅ Phone Number Details:');
      console.log(`  Phone ID: ${data.id}`);
      console.log(`  Display Number: ${data.display_phone_number || 'N/A'}`);
      console.log(`  Verified Name: ${data.verified_name || 'Not verified'}`);
      console.log(`  Verification Status: ${data.code_verification_status || 'Unknown'}`);
      console.log(`  Quality Rating: ${data.quality_rating || 'Unknown'}`);
      console.log(`  Messaging Limit: ${data.messaging_limit_tier || 'Unknown'}`);
      console.log('');
      
      // Check if verified
      if (data.code_verification_status !== 'VERIFIED') {
        console.log('⚠️  Phone number is not fully verified!');
        console.log('   This may limit your ability to send messages.');
        console.log('');
      }
      
      return { success: true, data };
    } else {
      console.log('❌ Phone number verification failed');
      console.log(JSON.stringify(data, null, 2));
      console.log('');
      
      if (data.error) {
        console.log('💡 Common issues:');
        console.log('   • Wrong Phone Number ID');
        console.log('   • Token doesn\'t have permission to access this phone');
        console.log('   • Phone number not registered with this Business Account');
        console.log('');
      }
      
      return { success: false, data };
    }
  } catch (error) {
    console.error('❌ Phone verification failed');
    console.error(`  Error: ${error.message}`);
    console.log('');
    return { success: false, error };
  }
}

/**
 * Check 3: Verify Business Account
 */
async function check3_VerifyBusinessAccount() {
  console.log('━'.repeat(70));
  console.log('CHECK 3: Verify Business Account');
  console.log('━'.repeat(70));
  console.log('');
  
  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${WHATSAPP_BUSINESS_ID}?fields=id,name,timezone_id,message_template_namespace`,
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        },
      }
    );
    
    const data = await response.json();
    
    if (response.ok && data.id) {
      console.log('✅ Business Account Details:');
      console.log(`  Business ID: ${data.id}`);
      console.log(`  Name: ${data.name || 'N/A'}`);
      console.log(`  Timezone: ${data.timezone_id || 'N/A'}`);
      console.log(`  Template Namespace: ${data.message_template_namespace || 'N/A'}`);
      console.log('');
      
      return { success: true, data };
    } else {
      console.log('❌ Business account verification failed');
      console.log(JSON.stringify(data, null, 2));
      console.log('');
      return { success: false, data };
    }
  } catch (error) {
    console.error('❌ Business verification failed');
    console.error(`  Error: ${error.message}`);
    console.log('');
    return { success: false, error };
  }
}

/**
 * Check 4: Check if recipient is on WhatsApp
 */
async function check4_VerifyRecipient() {
  console.log('━'.repeat(70));
  console.log('CHECK 4: Verify Recipient Number');
  console.log('━'.repeat(70));
  console.log('');
  
  console.log(`📱 Checking if +${TEST_NUMBER} is registered on WhatsApp...`);
  console.log('');
  
  // Note: WhatsApp doesn't have a public API to check if a number is registered
  // But we can try to send a test message and see the response
  
  console.log('⚠️  Cannot verify recipient registration via API');
  console.log('   WhatsApp will return an error if number is not registered');
  console.log('');
  console.log('💡 Make sure:');
  console.log(`   • +${TEST_NUMBER} is YOUR WhatsApp number`);
  console.log('   • WhatsApp is installed and active on that phone');
  console.log('   • You have internet connection');
  console.log('');
  
  return { success: true };
}

/**
 * Check 5: Send test message and check status
 */
async function check5_SendTestMessage() {
  console.log('━'.repeat(70));
  console.log('CHECK 5: Send Test Message & Check Status');
  console.log('━'.repeat(70));
  console.log('');
  
  const message = `🔔 TEST MESSAGE\n\nIf you receive this, WhatsApp is working!\n\nTime: ${new Date().toLocaleTimeString()}`;
  
  console.log('📤 Sending test message...');
  console.log('');
  
  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: TEST_NUMBER,
          type: 'text',
          text: {
            body: message
          }
        }),
      }
    );
    
    const data = await response.json();
    
    console.log('📥 Response:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');
    
    if (response.ok && data.messages && data.messages[0]) {
      const messageId = data.messages[0].id;
      console.log('✅ Message accepted by WhatsApp!');
      console.log(`  Message ID: ${messageId}`);
      console.log(`  Recipient WA ID: ${data.contacts[0].wa_id}`);
      console.log('');
      
      // Check message status
      console.log('📊 Checking message status in 3 seconds...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Note: Message status endpoint may not be immediately available
      console.log('');
      console.log('💡 To check message status in Facebook Developer Portal:');
      console.log('   1. Go to: https://developers.facebook.com/apps');
      console.log('   2. Select your app');
      console.log('   3. Navigate to: WhatsApp > API Setup');
      console.log('   4. Check the "Message Status" section');
      console.log('');
      
      return { success: true, messageId, data };
    } else {
      console.log('❌ Message send failed');
      
      if (data.error) {
        console.log('');
        console.log('Error Details:');
        console.log(`  Code: ${data.error.code}`);
        console.log(`  Type: ${data.error.type}`);
        console.log(`  Message: ${data.error.message}`);
        console.log(`  Subcode: ${data.error.error_subcode || 'N/A'}`);
        console.log('');
        
        // Specific error handling
        if (data.error.code === 131026) {
          console.log('💡 Error 131026: Message not delivered');
          console.log('   Possible reasons:');
          console.log('   • Recipient phone not registered on WhatsApp');
          console.log('   • You need to message the recipient first from WhatsApp Business');
          console.log('   • WhatsApp 24-hour session window expired');
          console.log('');
        } else if (data.error.code === 131047) {
          console.log('💡 Error 131047: Re-engagement message');
          console.log('   • You need to initiate conversation from WhatsApp Business first');
          console.log('   • Or use a template message');
          console.log('');
        } else if (data.error.code === 133016) {
          console.log('💡 Error 133016: Phone number not registered');
          console.log(`   • +${TEST_NUMBER} is not on WhatsApp`);
          console.log('   • Double-check the phone number');
          console.log('');
        }
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
 * Main diagnostic runner
 */
async function runDiagnostics() {
  console.log('🚀 Starting WhatsApp diagnostics...');
  console.log('');
  
  const results = {
    token: null,
    phone: null,
    business: null,
    recipient: null,
    message: null,
  };
  
  // Check 1: Token
  results.token = await check1_VerifyToken();
  if (!results.token.success) {
    console.log('🛑 Token verification failed. Cannot continue.');
    console.log('');
    printTroubleshooting();
    return;
  }
  
  // Check 2: Phone
  results.phone = await check2_VerifyPhoneNumber();
  
  // Check 3: Business
  results.business = await check3_VerifyBusinessAccount();
  
  // Check 4: Recipient
  results.recipient = await check4_VerifyRecipient();
  
  // Check 5: Send test
  results.message = await check5_SendTestMessage();
  
  // Summary
  console.log('');
  console.log('═'.repeat(70));
  console.log('📊 DIAGNOSTIC SUMMARY');
  console.log('═'.repeat(70));
  console.log('');
  console.log(`Token Valid:           ${results.token.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Phone Verified:        ${results.phone.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Business Account:      ${results.business.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Recipient Check:       ${results.recipient.success ? '✅ PASS' : '⚠️  SKIP'}`);
  console.log(`Test Message:          ${results.message.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
  
  if (results.message.success) {
    console.log('🎉 WhatsApp setup is working!');
    console.log('');
    console.log('📱 Check your WhatsApp now - you should have a test message');
    console.log('');
    console.log('If you still don\'t see the message:');
    console.log('  1. Make sure WhatsApp is open and connected to internet');
    console.log('  2. Check if the number is correct');
    console.log('  3. Check Meta Business Suite for message status');
    console.log('  4. You may need to send a message TO the business number first');
    console.log('');
  } else {
    console.log('❌ WhatsApp setup has issues');
    console.log('');
    printTroubleshooting();
  }
  
  console.log('═'.repeat(70));
}

function printTroubleshooting() {
  console.log('🔧 TROUBLESHOOTING STEPS:');
  console.log('');
  console.log('1. Check Facebook Developer Portal:');
  console.log('   → https://developers.facebook.com/apps');
  console.log('   → Select your app');
  console.log('   → WhatsApp > API Setup');
  console.log('');
  console.log('2. Verify these settings:');
  console.log('   ✓ Access token is not expired');
  console.log('   ✓ Phone number is verified and connected');
  console.log('   ✓ Recipient number is correct and on WhatsApp');
  console.log('   ✓ Business account is active');
  console.log('');
  console.log('3. Check Message Status in Portal:');
  console.log('   → WhatsApp > Message Insights');
  console.log('   → Look for failed messages');
  console.log('');
  console.log('4. Important WhatsApp Business Rules:');
  console.log('   ⚠️  For NEW conversations, you may need to:');
  console.log('      • Send message TO business number first');
  console.log('      • Or use an approved template message');
  console.log('   ⚠️  Free-form messages only work within 24h of user contact');
  console.log('');
  console.log('5. Test with WhatsApp Business App:');
  console.log('   → Try sending a message from the WhatsApp Business Manager');
  console.log('   → This confirms account setup is correct');
  console.log('');
}

// Run diagnostics
runDiagnostics().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
