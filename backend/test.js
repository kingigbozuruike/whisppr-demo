/**
 * Test script for Textbelt backend
 */

require('dotenv').config({ path: '.env.textbelt' });

const API_URL = process.env.TEST_API_URL || 'http://localhost:3000';
const API_KEY = process.env.WHISPPR_API_KEY || 'demo-secret-key';

const testTextbeltBackend = async () => {
  console.log('Testing Whisppr Textbelt Backend...\n');
  
  // Test 1: Health check
  console.log('Test 1: Health check');
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    console.log('✓ Health check passed');
    console.log('  Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('✗ Health check failed:', error.message);
    return;
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 2: SOS alert with valid data
  console.log('Test 2: SOS alert (POST /sos)');
  try {
    const response = await fetch(`${API_URL}/sos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        name: 'King',
        lat: 32.52,
        lng: -92.63,
        platform: 'test-script',
      }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✓ SOS alert sent successfully');
      console.log('  Response:', JSON.stringify(data, null, 2));
      console.log('\n⚠ Check console logs for SMS delivery status');
    } else {
      console.error('✗ SOS alert failed');
      console.error('  Error:', data);
    }
  } catch (error) {
    console.error('✗ SOS request failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 3: Alternative format (latitude/longitude)
  console.log('Test 3: SOS alert with latitude/longitude format');
  try {
    const response = await fetch(`${API_URL}/api/sos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        name: 'Demo User',
        latitude: 37.7749,
        longitude: -122.4194,
        platform: 'test-script',
      }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✓ SOS alert sent with alternative format');
      console.log('  Response:', JSON.stringify(data, null, 2));
    } else {
      console.error('✗ SOS alert failed');
      console.error('  Error:', data);
    }
  } catch (error) {
    console.error('✗ SOS request failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 4: Invalid API key (should fail)
  console.log('Test 4: Invalid API key (should fail)');
  try {
    const response = await fetch(`${API_URL}/sos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'wrong-key',
      },
      body: JSON.stringify({
        name: 'King',
        lat: 32.52,
        lng: -92.63,
      }),
    });
    
    const data = await response.json();
    
    if (response.status === 401) {
      console.log('✓ Correctly rejected invalid API key');
      console.log('  Response:', JSON.stringify(data, null, 2));
    } else {
      console.error('✗ Should have rejected invalid API key');
    }
  } catch (error) {
    console.error('✗ Request failed:', error.message);
  }
  
  console.log('\nTests complete!');
  console.log('\n⚠ Note: SMS sending happens asynchronously.');
  console.log('   Check the server console logs for delivery status.');
};

// Run tests
testTextbeltBackend();
