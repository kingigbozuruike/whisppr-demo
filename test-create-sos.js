/**
 * Quick script to create a test SOS session
 * Usage: node test-create-sos.js
 */

const API_BASE = 'http://localhost:3000/api';
const API_KEY = 'demo-secret-key';
const FRONTEND_BASE = 'http://localhost:3001';

async function createTestSOS() {
	console.log('🚨 Creating test SOS session...\n');

	// Create SOS session
	const createResponse = await fetch(`${API_BASE}/sos`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-API-Key': API_KEY,
		},
		body: JSON.stringify({
			userId: 'test-user-123',
			phoneNumber: '+1234567890',
			name: 'John Doe',
			lat: 37.7749, // San Francisco
			lng: -122.4194,
			accuracy: 10,
			platform: 'web',
			deviceInfo: 'Test Device',
			batteryLevel: 0.95,
			channel: 'whatsapp',
			emergencyContacts: []
		}),
	});

	if (!createResponse.ok) {
		const error = await createResponse.text();
		throw new Error(`Failed to create SOS: ${error}`);
	}

	const sosData = await createResponse.json();
	console.log('✅ SOS session created!');
	console.log(`   Short ID: ${sosData.data.shortId}`);
	console.log(`   Session ID: ${sosData.data.sosId}`);
	console.log(`   Expires at: ${new Date(sosData.data.expiresAt).toLocaleString()}\n`);

	// Simulate a few location updates
	console.log('📍 Sending location updates...\n');

	const locations = [
		{ lat: 37.7750, lng: -122.4195, accuracy: 8 },
		{ lat: 37.7752, lng: -122.4196, accuracy: 7 },
		{ lat: 37.7755, lng: -122.4198, accuracy: 9 },
	];

	for (let i = 0; i < locations.length; i++) {
		const loc = locations[i];
		
		await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
		
		const updateResponse = await fetch(`${API_BASE}/sos/${sosData.data.shortId}/location`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-API-Key': API_KEY,
			},
			body: JSON.stringify({
				lat: loc.lat,
				lng: loc.lng,
				accuracy: loc.accuracy,
				timestamp: new Date().toISOString(),
				speed: 1.5,
				heading: 90,
				altitude: 10,
				altitudeAccuracy: 5,
				batteryLevel: 0.85 - (i * 0.05),
			}),
		});

		if (updateResponse.ok) {
			console.log(`   ✓ Update ${i + 1}: (${loc.lat}, ${loc.lng})`);
		} else {
			console.log(`   ✗ Update ${i + 1} failed`);
		}
	}

	console.log('\n' + '='.repeat(70));
	console.log('🗺️  OPEN THIS URL IN YOUR BROWSER:');
	console.log('='.repeat(70));
	console.log(`\n   ${FRONTEND_BASE}/sos/${sosData.data.shortId}\n`);
	console.log('='.repeat(70));
	console.log('\n💡 Keep this terminal open and watch for live updates on the map!');
	console.log('   You can send more location updates using the API.\n');

	return sosData;
}

// Run the script
createTestSOS().catch(error => {
	console.error('❌ Error:', error.message);
	process.exit(1);
});
